import { noteName } from "../mapping/gestureMapping";
import type { Settings } from "../types/theremin";
import { pitchScreenPosition } from "../mapping/antennaMapping";
import type { SongGuide } from "../music/song";
export function notePosition(f: number, s: Settings) {
  return pitchScreenPosition(f, s);
}
export function NoteGuide({
  settings: s,
  frequency,
  active,
  target = null,
  upcoming = null,
  targetKey = null,
  falling = [],
  timed = false,
}: {
  settings: Settings;
  frequency: number;
  active: boolean;
  target?: number | null;
  upcoming?: number | null;
  targetKey?: number | null;
  falling?: SongGuide["falling"];
  timed?: boolean;
}) {
  const first = Math.ceil(69 + 12 * Math.log2(s.fMin / 440));
  const last = Math.floor(69 + 12 * Math.log2(s.fMax / 440));
  const nearest = Math.round(69 + 12 * Math.log2(frequency / 440));
  return (
    <div className="note-guide" aria-hidden="true">
      {Array.from({ length: last - first + 1 }, (_, i) => first + i).map(
        (midi) => {
          const f = 440 * 2 ** ((midi - 69) / 12);
          const position = notePosition(f, s);
          if (position < 0 || position > 1) return null;
          const natural = [0, 2, 4, 5, 7, 9, 11].includes(
            ((midi % 12) + 12) % 12,
          );
          const scaleNote =
            s.scale !== "pentatonic" ||
            [0, 2, 4, 7, 9].includes(((midi % 12) + 12) % 12);
          return (
            <div
              key={midi}
              className={`note-line ${natural ? "natural" : "accidental"} ${active && midi === nearest ? "selected" : ""} ${scaleNote ? "" : "excluded"}`}
              style={{ left: `${position * 100}%` }}
            >
              <span className={`label-row-${midi % 3}`}>{noteName(f)}</span>
            </div>
          );
        },
      )}
      {timed && (
        <div className="song-hit-line">
          <span>TOQUE AQUI</span>
        </div>
      )}
      <div className="rising-notes">
        {falling.map((note) => (
          <div
            key={`${note.start}-${note.midi}`}
            className="song-note-dot song-rising"
            data-start={note.start}
            style={{
              left: `${notePosition(440 * 2 ** ((note.midi - 69) / 12), s) * 100}%`,
              top: `${note.progress * 100}%`,
            }}
          >
            <span>{noteName(440 * 2 ** ((note.midi - 69) / 12))}</span>
          </div>
        ))}
      </div>
      {upcoming !== null && (
        <div
          className="song-note-dot song-next"
          style={{
            left: `${notePosition(440 * 2 ** ((upcoming - 69) / 12), s) * 100}%`,
          }}
        >
          <span>{noteName(440 * 2 ** ((upcoming - 69) / 12))}</span>
        </div>
      )}
      {target !== null && (
        <div
          key={`attack-${targetKey}`}
          className="song-note-dot song-target"
          style={{
            left: `${notePosition(440 * 2 ** ((target - 69) / 12), s) * 100}%`,
          }}
        >
          <span>{noteName(440 * 2 ** ((target - 69) / 12))}</span>
        </div>
      )}
      {active && (
        <div
          className="pitch-cursor"
          style={{
            left: `${Math.max(0, Math.min(1, notePosition(frequency, s))) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
