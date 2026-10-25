import { useCallback, useEffect, useRef, useState } from "react";
import { ThereminEngine } from "../audio/ThereminEngine";
import { midiFrequency, type SongNote } from "../music/song";
import type { Settings } from "../types/theremin";

export function useSongPlayback(
  settings: Settings,
  note: SongNote | null,
  time: number,
  playing: boolean,
  speed: number,
  blocked: boolean,
) {
  const audio = useRef<ThereminEngine | null>(null);
  const generation = useRef(0);
  const currentSettings = useRef(settings);
  currentSettings.current = settings;
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dispose = useCallback(() => {
    generation.current++;
    const engine = audio.current;
    audio.current = null;
    if (engine) void engine.close();
  }, []);
  const stop = useCallback(() => {
    dispose();
    setListening(false);
    setLoading(false);
  }, [dispose]);
  const listen = async () => {
    if (audio.current || blocked) return false;
    setError("");
    setLoading(true);
    const token = ++generation.current;
    try {
      const engine = new ThereminEngine();
      audio.current = engine;
      engine.configure({ ...currentSettings.current, vibrato: 0 });
      await engine.resume();
      if (token !== generation.current) return false;
      setListening(true);
      setLoading(false);
      return true;
    } catch (e) {
      if (token === generation.current) {
        stop();
        setError(
          e instanceof Error ? e.message : "Não foi possível tocar a música.",
        );
      }
      return false;
    }
  };
  useEffect(() => {
    audio.current?.configure({ ...settings, vibrato: 0 });
  }, [settings]);
  useEffect(() => {
    const engine = audio.current;
    if (!engine) return;
    if (!listening || !playing || blocked || speed === 0 || time < 0 || !note) {
      engine.silence();
      return;
    }
    const elapsed = (time - note.start) / speed,
      remaining = (note.start + note.duration - time) / speed;
    const edge = Math.min(0.025, (note.duration / speed) * 0.15);
    const envelope = Math.max(0, Math.min(1, elapsed / edge, remaining / edge));
    engine.update(
      midiFrequency(note.midi),
      settings.maxGain * 0.6 * envelope,
      150,
      settings.brightness,
    );
  }, [note, time, playing, listening, blocked, speed, settings]);
  useEffect(() => {
    if (blocked) stop();
  }, [blocked, stop]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      dispose();
    };
  }, [dispose, stop]);
  return { listening, loading, error, listen, stop };
}
