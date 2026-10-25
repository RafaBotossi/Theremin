import { useEffect, useRef, useState } from "react";
import type { Reading, Settings } from "../types/theremin";
import { noteName } from "../mapping/gestureMapping";
import { initialPractice, practiceStep } from "../mapping/practice";
export function PracticePanel({
  settings: s,
  reading: r,
  running,
  paused,
  onCue,
}: {
  settings: Settings;
  reading: Reading;
  running: boolean;
  paused: boolean;
  onCue: (cue: string) => void;
}) {
  const [exercise, setExercise] = useState<"sustain" | "intervals">("sustain");
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(initialPractice);
  const stateRef = useRef(initialPractice);
  const low = Math.ceil(69 + 12 * Math.log2(s.fMin / 440)),
    high = Math.floor(69 + 12 * Math.log2(s.fMax / 440));
  const root = Math.max(low, Math.min(high - 7, Math.round((low + high) / 2)));
  const notes = [0, 2, 4, 7, 4, 2, 0].map((offset) =>
    Math.max(low, Math.min(high, root + offset)),
  );
  const target =
    440 *
    2 ** ((notes[exercise === "sustain" ? 0 : index % notes.length] - 69) / 12);
  useEffect(() => {
    stateRef.current = { ...initialPractice };
    setState(initialPractice);
    setIndex(0);
  }, [exercise, s.fMin, s.fMax, s.scale, running, paused]);
  useEffect(() => {
    if (!running || paused || high < low) return;
    const next = practiceStep(
      stateRef.current,
      r,
      target,
      performance.now(),
      exercise === "intervals",
    );
    stateRef.current = next;
    setState(next);
    if (next.advance) setIndex((i) => i + 1);
  }, [r, running, paused, target, exercise, high, low]);
  const cents = Math.round(1200 * Math.log2(r.frequency / target));
  useEffect(() => {
    onCue(
      high < low
        ? "Amplie a faixa de frequências para treinar"
        : `Alvo ${noteName(target)} · ${state.ready ? (exercise === "intervals" ? "Baixe a mão de volume" : "Nota sustentada!") : `${state.held.toFixed(1)} / 2 s`}`,
    );
  }, [onCue, target, state.ready, state.held, exercise, high, low]);
  return (
    <section className="practice-panel" aria-label="Treino de theremin">
      <div className="practice-heading">
        <div>
          <p className="eyebrow">TREINO · ANTENAS VIRTUAIS</p>
          <h2>Pequenos movimentos, uma nota de cada vez.</h2>
        </div>
        <label>
          Exercício
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value as typeof exercise)}
          >
            <option value="sustain">Sustentar uma nota</option>
            <option value="intervals">Intervalos e articulação</option>
          </select>
        </label>
      </div>
      <div className="practice-readout">
        <div>
          <span>ALVO</span>
          <strong>{high >= low ? noteName(target) : "—"}</strong>
          <small>{target.toFixed(1)} Hz</small>
        </div>
        <div className="practice-instructions">
          <p>
            {!running
              ? "Inicie a câmera. Aproxime a mão da haste para subir a nota; afaste para descer."
              : paused
                ? "Exercício pausado durante guia musical, mute ou calibração."
                : state.ready
                  ? exercise === "intervals"
                    ? "Boa! Baixe a mão até o laço para silenciar; o próximo alvo aparece sozinho."
                    : "Nota sustentada. Agora experimente um vibrato pequeno e volte ao centro."
                  : "Encontre o alvo e sustente por 2 s dentro de ±25 cents. Abra/feche um pouco os dedos para ajustar."}
          </p>
          <progress
            aria-label="Tempo sustentando a nota"
            max={2}
            value={state.held}
          />
          <span>
            {running && r.pitch
              ? `${cents > 0 ? "+" : ""}${cents} cents do alvo`
              : "Aguardando as mãos"}{" "}
            · {state.held.toFixed(1)} / 2 s
          </span>
        </div>
      </div>
      <p className="practice-footnote">
        {s.scale === "free"
          ? "Afinação livre: o vibrato vem da sua mão."
          : "Assistência de notas ativa: ajuda a tocar; use Livre para avaliar sua afinação."}{" "}
        Webcam estima gestos; não reproduz o campo elétrico de um theremin.
      </p>
      <details>
        <summary>Sobre a referência e o treino</summary>
        <p>
          A referência é{" "}
          <a
            href="https://www.youtube.com/watch?v=ajM4vYCZMZk"
            target="_blank"
            rel="noreferrer"
          >
            The Ecstasy of Gold, por Carolina Eyck
          </a>
          : theremin, voz e efeitos em camadas. Aqui você pratica a linha solo.
          A distância das pontas dos dedos é uma aproximação visual, não uma
          reprodução do método de oito posições ou do Etherwave Pro. Os alvos
          são exercícios próprios, não a partitura da música.
        </p>
      </details>
    </section>
  );
}
