import { useEffect, useRef, useState } from "react";
import { ThereminEngine } from "../audio/ThereminEngine";
import type { Settings } from "../types/theremin";
export function SoundPreview({
  settings,
  disabled,
}: {
  settings: Settings;
  disabled: boolean;
}) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const engine = useRef<ThereminEngine | null>(null);
  const timer = useRef(0);
  const generation = useRef(0);
  const current = useRef(settings);
  current.current = settings;
  function dispose() {
    generation.current++;
    clearInterval(timer.current);
    const audio = engine.current;
    engine.current = null;
    if (audio) void audio.close();
  }
  function stop() {
    dispose();
    setPlaying(false);
  }
  useEffect(() => {
    if (disabled) {
      dispose();
      setPlaying(false);
    }
  }, [disabled]);
  useEffect(() => {
    engine.current?.configure(settings);
  }, [settings]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        dispose();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      dispose();
    };
  }, []);
  async function play() {
    if (playing) {
      stop();
      return;
    }
    setError("");
    setPlaying(true);
    const token = ++generation.current;
    try {
      const audio = new ThereminEngine();
      engine.current = audio;
      audio.configure(current.current);
      await audio.resume();
      if (token !== generation.current) return;
      const began = performance.now();
      const notes = [57, 60, 64, 67, 64, 62, 60, 57];
      timer.current = window.setInterval(() => {
        const elapsed = (performance.now() - began) / 1000;
        const index = Math.floor(elapsed / 0.65);
        if (index >= notes.length) {
          stop();
          return;
        }
        const phase = (elapsed % 0.65) / 0.65;
        const envelope = Math.sin(Math.PI * phase) ** 0.6;
        const frequency = 440 * 2 ** ((notes[index] - 69) / 12);
        audio.update(
          frequency,
          envelope * current.current.maxGain * 0.55,
          150,
          current.current.brightness,
        );
      }, 25);
    } catch (e) {
      stop();
      setError(
        e instanceof Error ? e.message : "Não foi possível ouvir o exemplo.",
      );
    }
  }
  return (
    <div className="sound-preview">
      <button disabled={disabled} onClick={() => void play()}>
        {playing ? "Parar exemplo" : "♪ Ouvir exemplo"}
      </button>
      <small>
        {error || "Uma frase musical com o timbre escolhido. Sem câmera."}
      </small>
    </div>
  );
}
