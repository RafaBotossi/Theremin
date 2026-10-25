import { useEffect, useRef, useState } from "react";
import { ThereminEngine } from "../audio/ThereminEngine";
import { applyPreset, presets } from "../audio/presets";
import { noteName } from "../mapping/gestureMapping";
import { midiFrequency } from "../music/song";
import type { Settings } from "../types/theremin";

export function AudioLab({
  settings: s,
  onSettings,
  onBack,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
  onBack: () => void;
}) {
  const engine = useRef<ThereminEngine | null>(null),
    generation = useRef(0);
  const [status, setStatus] = useState<"off" | "loading" | "ready">("off");
  const [error, setError] = useState(""),
    [midi, setMidi] = useState(69),
    [held, setHeld] = useState(false),
    [vibrato, setVibrato] = useState(false),
    [sustain, setSustain] = useState(false);
  const current = useRef({ s, midi, held, vibrato, sustain, status });
  current.current = { s, midi, held, vibrato, sustain, status };
  const pressedKeys = useRef<string[]>([]);
  const [octave, setOctave] = useState(4);
  const stop = () => {
    generation.current++;
    const a = engine.current;
    engine.current = null;
    if (a) void a.close();
    setStatus("off");
    setHeld(false);
    setVibrato(false);
    setSustain(false);
    pressedKeys.current = [];
  };
  async function activate() {
    if (status !== "off") {
      stop();
      return;
    }
    const token = ++generation.current;
    setError("");
    setStatus("loading");
    try {
      const a = new ThereminEngine();
      engine.current = a;
      a.configure(current.current.s);
      await a.resume();
      if (token !== generation.current) return;
      setStatus("ready");
    } catch (e) {
      if (token === generation.current) {
        stop();
        setError(e instanceof Error ? e.message : "Falha ao ativar áudio.");
      }
    }
  }
  useEffect(() => {
    engine.current?.configure(s);
  }, [s]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const a = engine.current;
      if (!a) return;
      if (document.hidden) {
        a.silence();
        return;
      }
      const c = current.current;
      if (!a.healthy) {
        a.silence();
        if (c.status === "ready") {
          setHeld(false);
          setSustain(false);
          setVibrato(false);
          setError("Áudio interrompido. Desative e ative novamente.");
        }
        return;
      }
      a.update(
        midiFrequency(c.midi),
        c.held || c.sustain ? c.s.maxGain : 0,
        150,
        c.s.brightness,
        c.vibrato ? 1 : 0,
      );
    }, 25);
    const release = () => {
      pressedKeys.current = [];
      setHeld(false);
      setVibrato(false);
      setSustain(false);
      engine.current?.silence();
    };
    const keys = "awsedftgyhujk";
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
      )
        return;
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (current.current.status !== "ready") return;
      if (e.key.toLowerCase() === "v") {
        setVibrato(true);
        return;
      }
      const n = keys.indexOf(e.key.toLowerCase());
      if (n < 0) return;
      e.preventDefault();
      pressedKeys.current = pressedKeys.current.filter(
        (k) => k !== e.key.toLowerCase(),
      );
      pressedKeys.current.push(e.key.toLowerCase());
      setMidi(12 * (octave + 1) + n);
      setHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "v") setVibrato(false);
      if (keys.includes(e.key.toLowerCase())) {
        pressedKeys.current = pressedKeys.current.filter(
          (k) => k !== e.key.toLowerCase(),
        );
        const last = pressedKeys.current.at(-1);
        if (last) {
          setMidi(12 * (octave + 1) + keys.indexOf(last));
          setHeld(true);
        } else setHeld(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    const hide = () => {
      if (document.hidden) release();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [octave]);
  useEffect(
    () => () => {
      generation.current++;
      if (engine.current) void engine.current.close();
    },
    [],
  );
  const range = (
    key: keyof Settings,
    label: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <label>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[key] as number}
        onChange={(e) =>
          onSettings({
            ...s,
            ...(String(key).startsWith("harmonic")
              ? { waveform: "theremin" as const }
              : {}),
            [key]: Number(e.target.value),
          })
        }
      />
      <output>{s[key]}</output>
    </label>
  );
  const release = () => setHeld(false);
  return (
    <main className="audio-lab">
      <header>
        <a className="brand" href={import.meta.env.BASE_URL}>
          ∿ AIR THEREMIN
        </a>
        <button onClick={onBack}>Voltar às mãos</button>
      </header>
      <p className="eyebrow">LABORATÓRIO DE ÁUDIO · SEM CÂMERA</p>
      <h1>Ouça. Toque. Modele.</h1>
      <p>
        Síntese aditiva inspirada no caráter vocal do theremin clássico. Comece
        sem reverb para ouvir o timbre direto.
      </p>
      <button className="primary" onClick={() => void activate()}>
        {status === "off"
          ? "Ativar áudio"
          : status === "loading"
            ? "Cancelar ativação"
            : "Desativar áudio"}
      </button>
      <p role="status">
        {error ||
          (status === "ready"
            ? "Áudio ativo · segure uma nota ou use Sustentar"
            : status === "loading"
              ? "Preparando síntese e reverb…"
              : "Áudio desligado")}
      </p>
      <section className="song-panel" aria-label="Teclado de teste">
        <div className="presets">
          {(["classic", "ethereal", "pure"] as const).map((key) => (
            <button key={key} onClick={() => onSettings(applyPreset(s, key))}>
              {presets[key].name}
            </button>
          ))}
        </div>
        <h2>
          {noteName(midiFrequency(midi))} · {midiFrequency(midi).toFixed(1)} Hz
        </h2>
        <label>
          Oitava do teclado
          <select
            value={octave}
            onChange={(e) => {
              setOctave(Number(e.target.value));
              setHeld(false);
              pressedKeys.current = [];
            }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="lab-keys">
          {Array.from({ length: 13 }, (_, i) => 12 * (octave + 1) + i).map(
            (n) => (
              <button
                key={n}
                disabled={status !== "ready"}
                aria-pressed={held && midi === n}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setMidi(n);
                  setHeld(true);
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setMidi(n);
                    setHeld(true);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") release();
                }}
                onBlur={release}
              >
                {noteName(midiFrequency(n))}
              </button>
            ),
          )}
        </div>
        <p>
          Teclado: A W S E D F T G Y H U J K. Segure V para vibrato. Soltar a
          tecla encerra a nota.
        </p>
        <label>
          Glissando (semitons)
          <input
            type="range"
            disabled={status !== "ready"}
            min={40}
            max={96}
            step={0.01}
            value={midi}
            onChange={(e) => setMidi(Number(e.target.value))}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setHeld(true);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
          />
        </label>
        <div className="song-transport">
          <button
            disabled={status !== "ready"}
            aria-pressed={sustain}
            onClick={() => setSustain(!sustain)}
          >
            Sustentar nota
          </button>
          <button
            disabled={status !== "ready"}
            aria-pressed={vibrato}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setVibrato(true);
            }}
            onPointerUp={() => setVibrato(false)}
            onPointerCancel={() => setVibrato(false)}
            onLostPointerCapture={() => setVibrato(false)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setVibrato(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") setVibrato(false);
            }}
            onBlur={() => setVibrato(false)}
          >
            Segurar vibrato
          </button>
          <button
            onClick={() => {
              setHeld(false);
              pressedKeys.current = [];
              setSustain(false);
              setVibrato(false);
              engine.current?.silence();
            }}
          >
            Silenciar
          </button>
        </div>
      </section>
      <section className="settings" aria-label="Modelagem sonora">
        <h2>Seu timbre</h2>
        <div className="settings-grid">
          {range("maxGain", "Volume", 0, 0.25, 0.005)}
          {range("brightness", "Brilho", 0, 1, 0.01)}
          {range("vocalResonance", "Ressonância vocal", 0, 1, 0.01)}
          {range("vibrato", "Profundidade do vibrato (cents)", 0, 50, 1)}
          {range("vibratoRate", "Velocidade do vibrato (Hz)", 5, 6, 0.1)}
          <label className="check">
            <input
              type="checkbox"
              checked={s.gestureVibrato}
              onChange={(e) =>
                onSettings({ ...s, gestureVibrato: e.target.checked })
              }
            />
            Nas mãos: abrir o polegar aciona vibrato
          </label>
          {range("glide", "Suavização do glissando (s)", 0.003, 0.15, 0.001)}
          {range("reverb", "Reverb estéreo · wet/dry", 0, 0.6, 0.01)}
          {(
            [
              "harmonic1",
              "harmonic2",
              "harmonic3",
              "harmonic4",
              "harmonic5",
            ] as const
          ).map((key, i) => (
            <div key={key}>{range(key, `Harmônico ${i + 1}`, 0, 1, 0.005)}</div>
          ))}
          <label>
            Faixa para tocar com as mãos
            <select
              value={`${s.fMin}:${s.fMax}`}
              onChange={(e) => {
                const [fMin, fMax] = e.target.value.split(":").map(Number);
                onSettings({ ...s, fMin, fMax });
              }}
            >
              <option value={`${s.fMin}:${s.fMax}`}>
                Atual: {s.fMin.toFixed(0)}–{s.fMax.toFixed(0)} Hz
              </option>
              <option value="110:440">Grave · Lá2–Lá4</option>
              <option value="220:880">Média · Lá3–Lá5</option>
              <option value="110:880">Três oitavas · Lá2–Lá5</option>
              <option value="220:1760">Aguda · Lá3–Lá6</option>
            </select>
          </label>
        </div>
        <p>
          O vibrato automático só entra enquanto você segura V ou o botão. Nas
          mãos, pequenas oscilações horizontais produzem o vibrato naturalmente.
          A opção de polegar permite dosar o vibrato automático sem soltar o
          indicador.
        </p>
      </section>
    </main>
  );
}
