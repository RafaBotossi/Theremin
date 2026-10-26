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
  risingNotes,
  advanceSongTime,
  guideSongTime,
  type Melody,
  type SongGuide,
} from "../music/song";
import { easyWindow } from "../music/easyPitch";
import { mediumSongs } from "../music/mediumSongs";
import { beginnerSongs } from "../music/beginnerSongs";
import { buildEcstasy } from "../music/ecstasyScore";
import { useSongPlayback } from "../hooks/useSongPlayback";
import { emptyMatch, matchNote } from "../music/noteMatch";
const songSections = [
  { name: "Início", measure: 1 },
  { name: "Tema principal", measure: 12 },
  { name: "Tema grave", measure: 24 },
  { name: "Seção final", measure: 33 },
];

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
  const [choice, setChoice] = useState("ode-joy");
  const [level, setLevel] = useState("easy");
  const [advanced, setAdvanced] = useState(false);
  const [easy, setEasy] = useState(true);
  const [startNote, setStartNote] = useState(0);
  const [tracks, setTracks] = useState<Melody[]>([]);
  const [track, setTrack] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [lookahead, setLookahead] = useState(8);
  const lastMovingSpeed = useRef(1);
  const [bpm, setBpm] = useState(96);
  const [startMeasure, setStartMeasure] = useState(1);
  const selectedSection = songSections
    .filter((section) => section.measure <= startMeasure)
    .at(-1)!;
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
  const beginnerSong = [...beginnerSongs, ...mediumSongs].find(
    (song) => song.id === choice,
  );
  const melody =
    choice === "ecstasy"
      ? scoreMelody
      : choice === "demo"
        ? demoMelody
        : (beginnerSong?.melody ?? tracks[track]);
  const notes = useMemo(() => {
    const offset =
      choice !== "ecstasy" && startNote > 0
        ? (melody?.notes[startNote]?.start ?? 0)
        : 0;
    return (
      melody?.notes.slice(choice === "ecstasy" ? 0 : startNote).map((n) => ({
        ...n,
        start: n.start - offset,
        midi: n.midi + transpose,
      })) ?? []
    );
  }, [melody, transpose, choice, startNote]);
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
              : "Pausa · recue o indicador";

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
      attack: reading.attack,
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
        const next = advanceSongTime(old, delta, speed);
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
    if (speed > 0) lastMovingSpeed.current = speed;
    onGuide(
      enabled
        ? {
            active: true,
            easyTarget:
              easy && status === "playing" && time >= 0 && !playback.listening
                ? practice
                  ? (frame.current?.midi ?? null)
                  : easyWindow(notes, time)
                : null,
            timed: !practice && status !== "done",
            falling:
              !practice && status !== "done"
                ? risingNotes(
                    notes,
                    guideSongTime(time, lastMovingSpeed.current),
                    lookahead,
                  )
                : [],
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
    notes,
    lookahead,
    easy,
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
      setStartNote(0);
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
      <div className="song-heading">
        <p className="eyebrow">TOQUE UMA MÚSICA</p>
        <button
          className="song-advanced-toggle"
          aria-expanded={advanced}
          aria-controls="song-advanced"
          onClick={() => setAdvanced(!advanced)}
        >
          Configurações avançadas
        </button>
      </div>
      <div className="song-selection-row">
        <label className="song-level">
          Nível
          <select
            value={level}
            onChange={(e) => {
              reset();
              setLevel(e.target.value);
              setStartNote(0);
              setStartMeasure(1);
              setError("");
              setChoice(
                e.target.value === "easy"
                  ? "ode-joy"
                  : e.target.value === "medium"
                    ? "greensleeves"
                    : "ecstasy",
              );
            }}
          >
            <option value="easy">Fácil</option>
            <option value="medium">Médio</option>
            <option value="hard">Difícil</option>
          </select>
        </label>
        <div className="song-selection">
          <label>
            Música
            <select
              value={choice}
              onChange={(e) => {
                generation.current++;
                setChoice(e.target.value);
                setStartNote(0);
                reset();
                setError("");
              }}
            >
              {level === "hard" && (
                <option value="ecstasy">
                  The Ecstasy of Gold · partitura (solo)
                </option>
              )}
              {(level === "easy"
                ? beginnerSongs
                : level === "medium"
                  ? mediumSongs
                  : []
              ).map((song) => (
                <option key={song.id} value={song.id}>
                  {song.label}
                </option>
              ))}
              {level === "easy" && (
                <option value="demo">Exercício original · demonstração</option>
              )}
              <option value="midi">Meu arquivo MIDI</option>
            </select>
          </label>
        </div>
        <div
          role="group"
          aria-label="Assistência de afinação"
          className="song-segments"
        >
          <button
            aria-pressed={!easy}
            onClick={() => {
              setEasy(false);
              match.current = { ...emptyMatch };
            }}
          >
            Normal
          </button>
          <button
            aria-pressed={easy}
            title="No guia com tempo, aceita até duas notas anteriores ou seguintes da música. Corrige para a mais próxima, até três semitons. Ao acertar para avançar, corrige para o alvo atual."
            onClick={() => {
              setEasy(true);
              match.current = { ...emptyMatch };
            }}
          >
            Easy
          </button>
        </div>
      </div>
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
                  setStartNote(0);
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
        </div>
      )}

      <div className="song-mode-row">
        <div
          role="group"
          aria-label="Avanço da música"
          className="song-segments"
        >
          <button
            aria-pressed={!practice}
            onClick={() => {
              reset();
              setPractice(false);
            }}
          >
            Seguir o tempo
          </button>
          <button
            aria-pressed={practice}
            onClick={() => {
              reset();
              setPractice(true);
            }}
          >
            Acertar para avançar
          </button>
        </div>
      </div>
      <div className="song-transport">
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
          className="song-start"
          disabled={!notes.length || polyphonic || outOfRange || blocked}
          onClick={
            status === "playing" ? () => setStatus("paused") : () => start()
          }
        >
          {status === "playing" ? "PAUSAR" : "INICIAR"}
        </button>
        <button
          className="song-stop"
          disabled={status === "idle" && !playback.loading}
          onClick={reset}
        >
          PARAR
        </button>
      </div>
      <div className="song-primary-controls">
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
        </div>

        <div className="song-start-control">
          <label>
            Começar em
            <input
              type="range"
              min={choice === "ecstasy" ? 1 : 0}
              aria-label="Começar em"
              max={
                choice === "ecstasy"
                  ? 46
                  : Math.max(0, (melody?.notes.length ?? 1) - 1)
              }
              step={1}
              disabled={!melody?.notes.length}
              value={choice === "ecstasy" ? startMeasure : startNote}
              aria-valuetext={
                choice === "ecstasy"
                  ? `${selectedSection.name} · compasso ${startMeasure} de 46`
                  : `Nota ${startNote + 1} de ${melody?.notes.length ?? 0}`
              }
              onChange={(e) => {
                reset();
                if (choice === "ecstasy")
                  setStartMeasure(Number(e.target.value));
                else setStartNote(Number(e.target.value));
              }}
            />
            <span className="song-start-position">
              {choice === "ecstasy"
                ? `${selectedSection.name} · compasso ${startMeasure} / 46`
                : `Nota ${startNote + 1} / ${melody?.notes.length ?? 0}`}
            </span>
          </label>
          {choice === "ecstasy" && (
            <div
              className="song-section-shortcuts"
              role="group"
              aria-label="Partes da música"
            >
              {songSections.map((section) => (
                <button
                  key={section.measure}
                  title={`Começar no compasso ${section.measure}`}
                  aria-pressed={selectedSection.measure === section.measure}
                  onClick={() => {
                    reset();
                    setStartMeasure(section.measure);
                  }}
                >
                  {section.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div id="song-advanced" hidden={!advanced}>
        {beginnerSong && (
          <p className="song-source">
            {beginnerSong.credit}{" "}
            <a href={beginnerSong.source} target="_blank" rel="noreferrer">
              Partitura e fonte
            </a>
            {beginnerSong.license && (
              <>
                {" "}
                ·{" "}
                <a href={beginnerSong.license} target="_blank" rel="noreferrer">
                  {beginnerSong.licenseName ?? "CC BY-SA 3.0"}
                </a>
              </>
            )}
          </p>
        )}
        <div className="song-controls">
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
          <label>
            Antecedência visual
            <select
              value={lookahead}
              onChange={(e) => setLookahead(Number(e.target.value))}
            >
              <option value={4}>4 s · subida rápida</option>
              <option value={8}>8 s · subida suave</option>
              <option value={12}>12 s · subida bem lenta</option>
            </select>
          </label>{" "}
          <label className="check">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />
            Repetir trecho
          </label>
        </div>
        {choice === "ecstasy" && (
          <div className="song-controls score-controls">
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
        )}
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
                  : "")}
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
    </section>
  );
}
