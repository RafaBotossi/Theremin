import type { Reading } from "../types/theremin";
import { noteName } from "../mapping/gestureMapping";
import { midiFrequency } from "../music/song";
export function pitchCorrection(frequency: number, target: number) {
  return 1200 * Math.log2(midiFrequency(target) / frequency);
}
export function PitchFeedback({
  reading: r,
  target,
  guideActive,
  listening,
  running,
}: {
  reading: Reading;
  target: number | null;
  guideActive: boolean;
  listening: boolean;
  running: boolean;
}) {
  const present =
    running && r.pitch && Number.isFinite(r.frequency) && r.frequency > 0;
  const goal =
    target ??
    (!guideActive && present
      ? Math.round(69 + 12 * Math.log2(r.frequency / 440))
      : null);
  const correction =
    present && goal !== null
      ? Math.round(pitchCorrection(r.frequency, goal))
      : null;
  const offset =
    correction === null ? 0 : Math.max(-100, Math.min(100, -correction));
  const text = listening
    ? "Ouvindo a referência automática · suas mãos estão sem som"
    : !present
      ? "Estique o indicador para ver sua afinação"
      : goal === null
        ? "Sem nota-alvo agora · aguarde a próxima bolinha"
        : correction !== null && Math.abs(correction) <= 5
          ? "No centro da nota ✓"
          : `${correction! > 0 ? "Suba" : "Desça"} ${correction! > 0 ? "+" : "−"}${Math.abs(correction!)} cents para chegar ao alvo`;
  return (
    <div className="pitch-feedback" aria-label="Afinação em relação ao alvo">
      <div className="pitch-feedback-notes">
        <span>
          Sua nota:{" "}
          <strong>
            {present
              ? `${noteName(r.frequency)} · ${r.frequency.toFixed(1)} Hz`
              : "—"}
          </strong>
        </span>
        <span>
          Alvo:{" "}
          <strong>{goal !== null ? noteName(midiFrequency(goal)) : "—"}</strong>
        </span>
      </div>
      <div
        className="pitch-feedback-bar"
        role="meter"
        aria-label="Desvio da nota tocada em cents"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={offset}
        aria-valuetext={text}
      >
        <div className="pitch-feedback-center" />
        {present && goal !== null && !listening && (
          <div
            className="pitch-feedback-marker"
            style={{ left: `${50 + offset / 2}%` }}
          />
        )}
      </div>
      <div className="pitch-feedback-labels">
        <span>− Grave</span>
        <span>Alvo</span>
        <span>+ Agudo</span>
      </div>
      <p>{text}</p>
    </div>
  );
}
