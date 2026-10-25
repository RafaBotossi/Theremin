import { useEffect, useMemo, useRef, useState } from "react";
import { emptyReading, type Reading, type Settings } from "../types/theremin";
import { noteName } from "../mapping/gestureMapping";
import { parseMidi } from "../music/midi";
import {
  demoMelody,
  emptyGuide,
  frameAt,
  isPolyphonic,
  midiFrequency,
  type Melody,
  type SongGuide,
} from "../music/song";
import { buildEcstasy } from "../music/ecstasyScore";
import { useSongPlayback } from "../hooks/useSongPlayback";
import { emptyMatch, matchNote } from "../music/noteMatch";

export function SongPanel({
  settings,
  blocked,
  running,
  onSettings,
  onGuide,
  reading = emptyReading,
}: {
  settings: Settings;
  blocked: boolean;
  running: boolean;
  onSettings: (s: Settings) => void;
  onGuide: (g: SongGuide) => void;
  reading?: Reading;
}) {
  const [choice, setChoice] = useState("ecstasy");
  const [tracks, setTracks] = useState<Melody[]>([]);
  const [track, setTrack] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [bpm, setBpm] = useState(96);
  const [startMeasure, setStartMeasure] = useState(1);
  const [fermata, setFermata] = useState(2);
  const scoreMelody = useMemo(
    () => buildEcstasy(bpm, startMeasure, fermata),
    [bpm, startMeasure, fermata],
  );
  const [transpose, setTranspose] = useState(0);
  const [loop, setLoop] = useState(true);
  const [status, setStatus] = useState<"idle" | "playing" | "paused" | "done">(
    "idle",
  );
  const [time, setTime] = useState(-3);
  const [error, setError] = useState("");
  const [practice, setPractice] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);
  const match = useRef({ ...emptyMatch });
  const generation = useRef(0),
    wasRunning = useRef(running);
  const melody =
    choice === "ecstasy"
      ? scoreMelody
      : choice === "demo"
        ? demoMelody
        : tracks[track];
  const notes = useMemo(
    () => melody?.notes.map((n) => ({ ...n, midi: n.midi + transpose })) ?? [],
    [melody, transpose],
  );
  const duration = notes.length
    ? notes[notes.length - 1].start + notes[notes.length - 1].duration
    : 0;
  const polyphonic = isPolyphonic(notes);
  const outOfRange = notes.some(
    (n) => midiFrequency(n.midi) < 40 || midiFrequency(n.midi) > 4000,
  );
  const frame = practice
    ? {
        current: status === "done" ? null : (notes[noteIndex] ?? null),
        next: null,
        remaining: 0,
      }
    : frameAt(notes, time);
  const playback = useSongPlayback(
    settings,
    frame.current,
    time,
    status === "playing" && !practice,
    speed,
    blocked,
  );
  const enabled = status !== "idle";
  const cue =
    status === "paused"
      ? "Guia pausado"
      : status === "done"
        ? "Trecho concluído"
        : practice
          ? `Toque ${noteName(midiFrequency(notes[noteIndex]?.midi ?? 69))} · ${noteIndex + 1}/${notes.length}`
          : time < 0
            ? `Prepare as mãos · ${Math.ceil(-time)}`
            : frame.current
              ? `Agora ${noteName(midiFrequency(frame.current.midi))}${frame.current.measure ? ` · compasso ${frame.current.measure}` : ""}`
              : "Pausa · dobre o indicador";

  useEffect(() => {
    if (!practice || status !== "playing" || !notes[noteIndex]) {
      match.current = { ...emptyMatch, release: match.current.release };
      return;
    }
    const next = matchNote(
      match.current,
      reading,
      notes[noteIndex].midi,
      performance.now(),
      running && !blocked && !document.hidden,
    );
    match.current = next;
    if (!next.passed) return;
    const nextIndex = noteIndex + 1;
    if (nextIndex >= notes.length && !loop) {
      setStatus("done");
      return;
    }
    const index = nextIndex % notes.length;
    match.current = {
      ...emptyMatch,
      release: notes[index].midi === notes[noteIndex].midi,
    };
    setNoteIndex(index);
  }, [reading, practice, status, noteIndex, notes, running, blocked, loop]);

  useEffect(() => {
    if (practice || status !== "playing" || blocked || speed === 0) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        delta = (now - last) / 1000;
      last = now;
      setTime((old) => {
        const next = old < 0 ? old + delta : old + delta * speed;
        if (next >= duration) {
          if (loop) return -3;
          return duration;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [status, blocked, speed, duration, loop, practice]);
  useEffect(() => {
    if (!practice && status === "playing" && time >= duration && !loop)
      setStatus("done");
  }, [time, duration, loop, status, practice]);
  useEffect(() => {
    if (status === "done") playback.stop();
  }, [status, playback.stop]);
  useEffect(() => {
    if (blocked || (wasRunning.current && !running))
      setStatus((s) => (s === "playing" ? "paused" : s));
    wasRunning.current = running;
  }, [blocked, running]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setStatus((s) => (s === "playing" ? "paused" : s));
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    onGuide(
      enabled
        ? {
            active: true,
            listening: playback.listening,
            attack: frame.current?.start ?? null,
            current:
              time >= 0 && status !== "done"
                ? (frame.current?.midi ?? null)
                : null,
            next: null,
            cue,
            remaining: practice
              ? null
              : speed > 0
                ? frame.remaining / speed
                : null,
          }
        : emptyGuide,
    );
  }, [
    onGuide,
    enabled,
    time,
    status,
    frame.current?.midi,
    frame.current?.start,
    frame.next?.midi,
    frame.remaining,
    cue,
    speed,
    playback.listening,
    practice,
  ]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  function reset() {
    playback.stop();
    setStatus("idle");
    setTime(-3);
    setNoteIndex(0);
    match.current = { ...emptyMatch };
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const id = ++generation.current;
    reset();
    setError("");
    setTracks([]);
    try {
      if (file.size > 1024 * 1024) throw Error("Use um MIDI de até 1 MB.");
      const parsed = parseMidi(await file.arrayBuffer());
      if (id !== generation.current) return;
      setTracks(parsed);
      setTrack(0);
      setChoice("midi");
      setTranspose(0);
    } catch (e) {
      if (id === generation.current)
        setError(
          e instanceof Error ? e.message : "Não foi possível ler o MIDI.",
        );
    }
  }
  function start(byNote = practice) {
    if (!notes.length || polyphonic || outOfRange || blocked) return;
    const frequencies = notes.map((n) => midiFrequency(n.midi));
    onSettings({
      ...settings,
      controlMode: settings.controlMode,
      scale: "free",
      vibrato: 0,
      fMin: Math.max(
        40,
        Math.min(1800, Math.min(...frequencies) / 2 ** (1 / 12)),
      ),
      fMax: Math.min(4000, Math.max(...frequencies) * 2 ** (1 / 12)),
    });
    setPractice(byNote);
    if (status !== "paused" || byNote !== practice) {
      setTime(byNote || speed === 0 ? 0 : -3);
      setNoteIndex(0);
      match.current = { ...emptyMatch };
    }
    setStatus("playing");
    document
      .querySelector(".camera-stage")
      ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }
  return (
    <section className="song-panel" aria-label="Escolha de música">
      <p className="eyebrow">TOQUE UMA MÚSICA</p>
      <h2>Siga a luz, uma nota de cada vez.</h2>
      <div className="song-controls">
        <label>
          Avanço da música
          <select
            value={practice ? "practice" : "timed"}
            onChange={(e) => {
              reset();
              setPractice(e.target.value === "practice");
            }}
          >
            <option value="timed">Seguir o tempo</option>
            <option value="practice">
              No meu ritmo · acertar para avançar
            </option>
          </select>
        </label>
        <label>
          Música
          <select
            value={choice}
            onChange={(e) => {
              generation.current++;
              setChoice(e.target.value);
              reset();
              setError("");
            }}
          >
            <option value="ecstasy">
              The Ecstasy of Gold · partitura (solo)
            </option>
            <option value="demo">Exercício original · demonstração</option>
            <option value="midi">Meu arquivo MIDI</option>
          </select>
        </label>
        <div className="speed-control">
          <label>
            Velocidade (%)
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(speed * 100)}
              onChange={(e) =>
                setSpeed(
                  Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100,
                )
              }
            />
          </label>
          <input
            aria-label="Ajustar velocidade de 0 a 100%"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(speed * 100)}
            onChange={(e) => setSpeed(Number(e.target.value) / 100)}
          />
          <small>
            {practice
              ? "No seu ritmo: a velocidade só vale ao ouvir ou seguir o tempo."
              : speed === 0
                ? "0% · guia congelado e referência em silêncio"
                : "1% a 100% · ajuste fino"}
          </small>
        </div>
        <label>
          Transpor
          <select
            value={transpose}
            onChange={(e) => {
              setTranspose(Number(e.target.value));
              reset();
            }}
          >
            {[-24, -12, 0, 12, 24].map((n) => (
              <option key={n} value={n}>
                {n === 0
                  ? "Tom do arquivo"
                  : `${n > 0 ? "+" : ""}${n / 12} oitava(s)`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {choice === "ecstasy" && (
        <>
          <div className="song-controls score-controls">
            <label>
              Começar em
              <select
                value={startMeasure}
                onChange={(e) => {
                  setStartMeasure(Number(e.target.value));
                  reset();
                }}
              >
                <option value={1}>Início · compasso 1</option>
                <option value={12}>Tema principal · compasso 12</option>
                <option value={24}>Tema grave · compasso 24</option>
                <option value={33}>Seção final · compasso 33</option>
              </select>
            </label>
            <label>
              Andamento base (BPM)
              <input
                type="number"
                min={40}
                max={180}
                step={1}
                value={bpm}
                onChange={(e) => {
                  setBpm(
                    Math.max(40, Math.min(180, Number(e.target.value) || 96)),
                  );
                  reset();
                }}
              />
            </label>
            <label>
              Fermatas
              <select
                value={fermata}
                onChange={(e) => {
                  setFermata(Number(e.target.value));
                  reset();
                }}
              >
                <option value={1}>Sem prolongamento</option>
                <option value={1.5}>1,5 × a duração escrita</option>
                <option value={2}>2 × a duração escrita</option>
                <option value={3}>3 × a duração escrita</option>
              </select>
            </label>
          </div>
          <p>
            Guia solo das quatro páginas do PDF fornecido, com 46 compassos.
            Pausas, ligaduras e valores rítmicos foram transcritos; acordes
            foram reduzidos a uma nota. Na introdução, tocamos o motivo repetido
            do piano.
          </p>
          <p>
            A partitura indica “Moderately”, sem BPM. A base de {bpm} BPM é
            ajustável e corresponde a {(bpm * speed).toFixed(0)} BPM nesta
            velocidade. O prolongamento das fermatas é uma escolha de estudo.
            Este arranjo não é sincronizado ao vídeo.
          </p>
        </>
      )}
      {choice === "midi" && (
        <div className="song-controls">
          <label>
            Importar melodia MIDI
            <input
              type="file"
              accept=".mid,.midi"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {!!tracks.length && (
            <label>
              Trilha da melodia
              <select
                value={track}
                onChange={(e) => {
                  setTrack(Number(e.target.value));
                  reset();
                }}
              >
                {tracks.map((t, i) => (
                  <option key={i} value={i}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>
            O MIDI fornece notas, durações e andamento. Escolha a trilha solo. O
            arquivo fica apenas nesta sessão, sem upload.
          </p>
        </div>
      )}
      <div className="song-transport">
        <button
          disabled={blocked || !notes.length || polyphonic || outOfRange}
          onClick={() => {
            playback.stop();
            start(true);
          }}
        >
          Tocar nota por nota
        </button>
        <button
          disabled={blocked || !notes.length || polyphonic || outOfRange}
          onClick={() => {
            if (playback.listening || playback.loading) {
              playback.stop();
              return;
            }
            void playback.listen().then((ok) => {
              if (ok) start(false);
            });
          }}
        >
          {playback.loading
            ? "Cancelar áudio"
            : playback.listening
              ? "Desligar som automático"
              : "♪ Ouvir música"}
        </button>
        <button
          disabled={!notes.length || polyphonic || outOfRange || blocked}
          onClick={
            status === "playing" ? () => setStatus("paused") : () => start()
          }
        >
          {status === "playing"
            ? "Pausar guia"
            : status === "paused"
              ? "Retomar guia"
              : "Iniciar guia"}
        </button>
        <button
          disabled={status === "idle" && !playback.loading}
          onClick={reset}
        >
          Encerrar guia
        </button>
        <label className="check">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
          />
          Repetir trecho
        </label>
      </div>
      <div className="song-status" role="status">
        {error ||
          playback.error ||
          (polyphonic
            ? "Esta trilha tem notas simultâneas. Escolha uma trilha de melodia solo."
            : outOfRange
              ? "Notas fora do alcance do instrumento. Ajuste a transposição."
              : blocked
                ? "Guia pausado durante mute ou calibração."
                : enabled
                  ? `${!practice && speed === 0 ? "0% · guia congelado · " : ""}${cue}`
                  : "Inicie o guia: 3 segundos para posicionar as mãos. Você também pode visualizar sem câmera.")}
      </div>
      <progress
        aria-label="Progresso da música"
        max={practice ? notes.length || 1 : duration || 1}
        value={
          practice
            ? status === "done"
              ? notes.length
              : noteIndex
            : Math.max(0, time)
        }
      />
      <p>
        Bolinha amarela no topo: única nota a tocar agora. Em Tocar nota por
        nota, sustente o alvo por 0,25 s dentro de ±35 cents para avançar no seu
        ritmo. Para notas repetidas, dobre e estique o indicador. As pausas
        escritas são livres neste modo; velocidade vale para o guia com tempo e
        para ouvir. A faixa e a afinação livre são ajustadas ao iniciar; sua
        calibração é mantida. Use Ouvir música para escutar a melodia sem
        câmera. Durante a referência, o som das mãos fica silenciado. Em 0%, o
        guia congela e a referência fica em silêncio.
      </p>
    </section>
  );
}
