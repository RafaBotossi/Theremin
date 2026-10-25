import { useEffect, useRef, useState } from "react";
import { ThereminEngine } from "../audio/ThereminEngine";
import { HandTracker } from "../vision/HandTracker";
import { openCamera, cameraError } from "./useCamera";
import { AdaptiveEMA } from "../mapping/smoothing";
import {
  pitchControl,
  pitchPoint,
  volumeControl,
  outsideField,
} from "../mapping/antennaMapping";
import {
  normalized,
  frequencyAt,
  quantize,
  selectHands,
  TrackingGate,
} from "../mapping/gestureMapping";
import { emptyReading, type Hand, type Settings } from "../types/theremin";
import { hasOpenPalm, palmPoint } from "../vision/openPalm";
const connections = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 10, 11, 12],
  [9, 13, 14, 15, 16],
  [13, 17, 18, 19, 20],
  [0, 17],
];
export function useHandTracking(
  settings: Settings,
  muted: boolean,
  calibrating: boolean,
) {
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ settings, muted, calibrating });
  current.current = { settings, muted, calibrating };
  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(emptyReading);
  const hands = useRef<Hand[]>([]);
  const frameTime = useRef(-Infinity);
  const engine = useRef<ThereminEngine | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const generation = useRef(0);
  const stop = () => {
    generation.current++;
    stopRef.current();
    stopRef.current = () => {};
    setStatus("idle");
    setReading(emptyReading);
  };
  useEffect(
    () => () => {
      generation.current++;
      stopRef.current();
    },
    [],
  );
  useEffect(() => {
    engine.current?.configure(settings);
    if (muted || calibrating) engine.current?.silence();
  }, [settings, muted, calibrating]);
  async function start() {
    stop();
    const token = ++generation.current;
    setStatus("loading");
    setError("");
    let audio: ThereminEngine | null = null,
      stream: MediaStream | null = null,
      tracker: HandTracker | null = null;
    let raf = 0,
      vfc = 0,
      timer = 0;
    let alive = true;
    let removeResize = () => {};
    const cleanup = () => {
      alive = false;
      removeResize();
      cancelAnimationFrame(raf);
      if (vfc) video.current?.cancelVideoFrameCallback?.(vfc);
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      tracker?.close();
      tracker = null;
      if (audio) {
        void audio.close();
        audio = null;
      }
      engine.current = null;
      hands.current = [];
      frameTime.current = -Infinity;
      if (video.current) video.current.srcObject = null;
      const c = canvas.current;
      c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    };
    stopRef.current = cleanup;
    try {
      audio = new ThereminEngine();
      engine.current = audio;
      await audio.resume();
      if (token !== generation.current) return;
      stream = await openCamera();
      if (token !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      if (token !== generation.current) return;
      const resize = () => {
        if (v.parentElement && v.videoWidth)
          v.parentElement.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
      };
      resize();
      v.addEventListener("resize", resize);
      removeResize = () => v.removeEventListener("resize", resize);
      try {
        tracker = await HandTracker.create();
      } catch {
        throw new Error(
          "MediaPipe não carregou. Confira os assets locais em public/mediapipe e o suporte a WebAssembly.",
        );
      }
      if (token !== generation.current) {
        tracker.close();
        return;
      }
      audio!.configure(current.current.settings);
      setStatus("running");
      const gate = new TrackingGate(),
        pitchFilter = new AdaptiveEMA(),
        volumeFilter = new AdaptiveEMA();
      let last = 0,
        lastUI = 0,
        lastVideo = -1,
        frequency = 440,
        interval = 33;
      let expression = current.current.settings.brightness;
      let wand: Hand | undefined;
      let heldVolume = 0;
      timer = window.setInterval(() => {
        const now = performance.now();
        if (document.hidden || !gate.fresh(now)) {
          audio?.silence();
          gate.reset();
          pitchFilter.reset();
          volumeFilter.reset();
          const stale = document.hidden || now - frameTime.current > 150;
          if (stale) hands.current = [];
          setReading((r) => ({
            ...r,
            gain: 0,
            ...(stale ? { pitch: false, volume: false, outside: false } : {}),
          }));
        }
      }, 50);
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (alive) {
          stop();
          setError("A câmera foi desconectada. Conecte-a e inicie novamente.");
        }
      });
      const schedule = () => {
        if (!alive) return;
        if ("requestVideoFrameCallback" in v)
          vfc = v.requestVideoFrameCallback((t) => tick(t));
        else raf = requestAnimationFrame(tick);
      };
      const tick = (now: number) => {
        if (!alive) return;
        if (document.hidden) {
          audio?.silence();
          schedule();
          return;
        }
        if (now - last < interval || v.currentTime === lastVideo) {
          schedule();
          return;
        }
        const dt = last ? (now - last) / 1000 : 0.033;
        last = now;
        lastVideo = v.currentTime;
        try {
          if (audio?.healthy === false)
            throw new Error("Áudio interrompido. Pare e inicie novamente.");
          const s = current.current.settings;
          const t0 = performance.now();
          const found = tracker!.detect(v, now, s.landmark);
          const inferenceMs = performance.now() - t0;
          const detectedAt = performance.now();
          hands.current = found;
          frameTime.current = detectedAt;
          interval = inferenceMs > 40 ? 66 : 33;
          const previousWand = wand;
          const roles = selectHands(found, s, wand);
          wand = s.controlMode === "wand" ? roles.pitch : undefined;
          if (s.controlMode === "wand" && (!wand || !previousWand)) {
            pitchFilter.reset();
            volumeFilter.reset();
          }
          // Freshness begins at completion: a slow inference must not
          // expire a newly detected pair before it can drive the audio.
          const safe = gate.update(
            detectedAt,
            !!roles.pitch,
            s.controlMode === "wand" || !!roles.volume,
          );
          let gain = 0;
          if (roles.pitch) {
            expression =
              s.gestureTone && s.controlMode === "screen"
                ? normalized(
                    roles.pitch.point.y,
                    s.volumeMin,
                    s.volumeMax,
                    true,
                  )
                : s.brightness;
            const t = pitchFilter.update(
              pitchControl(roles.pitch, s),
              dt,
              s.smoothing,
            );
            frequency = quantize(frequencyAt(t, s.fMin, s.fMax), s.scale);
          } else if (!safe) pitchFilter.reset();
          if (
            roles.volume &&
            (s.controlMode !== "wand" || hasOpenPalm(roles.volume))
          )
            heldVolume = volumeControl(roles.volume, s);
          if (safe && (s.controlMode === "wand" || roles.volume)) {
            const t = volumeFilter.update(heldVolume, dt, s.smoothing);
            gain = t * t * s.maxGain;
          } else volumeFilter.reset();
          if (current.current.muted || current.current.calibrating) gain = 0;
          audio?.update(
            frequency,
            gain,
            gate.remaining(performance.now()),
            expression,
            s.gestureVibrato ? (roles.pitch?.vibratoExpression ?? 0) : 0,
          );
          const c = canvas.current,
            ctx = c?.getContext("2d");
          if (c && ctx) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.lineWidth = 3;
            for (const h of found) {
              ctx.strokeStyle =
                h === roles.pitch
                  ? "#67e8c2"
                  : h === roles.volume
                    ? "#c2a2ff"
                    : "#9aa9bc";
              ctx.fillStyle = ctx.strokeStyle;
              for (const chain of connections) {
                ctx.beginPath();
                chain.forEach((id, j) => {
                  const p = h.landmarks[id];
                  if (j === 0) ctx.moveTo(p.x * c.width, p.y * c.height);
                  else ctx.lineTo(p.x * c.width, p.y * c.height);
                });
                ctx.stroke();
              }
              for (const p of h.landmarks) {
                ctx.beginPath();
                ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
                ctx.fill();
              }
              const control =
                h === roles.pitch
                  ? pitchPoint(h, s)
                  : s.controlMode === "wand"
                    ? palmPoint(h)
                    : h.point;
              if (h === roles.pitch && s.controlMode !== "screen") {
                ctx.beginPath();
                ctx.arc(
                  control.x * c.width,
                  control.y * c.height,
                  10,
                  0,
                  Math.PI * 2,
                );
                ctx.stroke();
              }
              ctx.font = `bold ${Math.max(16, c.width / 45)}px sans-serif`;
              ctx.textAlign = "center";
              const label =
                s.controlMode === "wand"
                  ? h === wand
                    ? "NOTA"
                    : h === roles.volume
                      ? hasOpenPalm(h)
                        ? "VOLUME · PALMA ABERTA"
                        : "VOLUME MANTIDO"
                      : "ESTIQUE O INDICADOR"
                  : h === roles.pitch
                    ? "PITCH"
                    : h === roles.volume
                      ? "VOLUME"
                      : "SEM FUNÇÃO";
              const margin = ctx.measureText(label).width / 2 + 8;
              ctx.fillText(
                label,
                Math.max(
                  margin,
                  Math.min(c.width - margin, control.x * c.width),
                ),
                Math.max(25, control.y * c.height - 25),
              );
            }
          }
          if (now - lastUI > 100) {
            lastUI = now;
            setReading({
              frequency,
              gain,
              pitch: !!roles.pitch,
              volume: s.controlMode === "wand" || !!roles.volume,
              outside: outsideField(roles.pitch, roles.volume, s),
              fps: 1 / dt,
              inferenceMs,
              delegate: tracker!.delegate,
            });
          }
        } catch (e) {
          stop();
          setError(cameraError(e));
          return;
        }
        schedule();
      };
      schedule();
    } catch (e) {
      if (token === generation.current) {
        cleanup();
        setStatus("idle");
        setError(cameraError(e));
      }
    }
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) engine.current?.silence();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  return {
    video,
    canvas,
    status,
    error,
    reading,
    hands,
    frameTime,
    engine,
    start,
    stop,
  };
}
