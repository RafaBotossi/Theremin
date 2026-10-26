import { useEffect, useRef, useState, type RefObject } from "react";
import type { Hand, Settings } from "../types/theremin";
import { selectHands } from "../mapping/gestureMapping";
import { pitchDistance, pitchPoint } from "../mapping/antennaMapping";
import { hasOpenPalm, palmPoint } from "../vision/openPalm";

export function CalibrationWizard({
  hands,
  frameTime,
  settings,
  onSave,
  onClose,
}: {
  hands: RefObject<Hand[]>;
  frameTime: RefObject<number>;
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}) {
  const presence =
    settings.controlMode === "wand"
      ? "Mostre um indicador e a outra palma aberta. O avanço é automático."
      : "Mostre as duas mãos. O avanço é automático.";
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(presence);
  const draft = useRef({ ...settings });
  const save = useRef(onSave);
  save.current = onSave;

  useEffect(() => {
    let previous = performance.now();
    let prepare = step === 0 ? 0 : 3000;
    let captured = 0;
    let lastFrame = -Infinity;
    let min = 1,
      max = 0;
    let finished = false;
    const duration = step === 0 ? 2000 : 6000;
    setProgress(0);
    setMessage(
      step === 0 ? presence : "Prepare o movimento. Começando em 3 s…",
    );
    const id = window.setInterval(() => {
      if (finished) return;
      const now = performance.now();
      const dt = Math.min(200, now - previous);
      previous = now;
      if (prepare > 0) {
        prepare = Math.max(0, prepare - dt);
        setMessage(
          `Prepare o movimento. Começando em ${Math.ceil(prepare / 1000)} s…`,
        );
        return;
      }
      const roles = selectHands(hands.current, settings);
      const fresh = now - frameTime.current <= 200;
      const volumeReady =
        !!roles.volume &&
        (settings.controlMode !== "wand" || hasOpenPalm(roles.volume));
      const available =
        step === 0
          ? !!roles.pitch && volumeReady
          : step === 1
            ? !!roles.pitch
            : volumeReady;
      if (!fresh || !available) {
        if (step === 0) {
          captured = 0;
          setProgress(0);
        }
        setMessage(
          step === 0
            ? presence
            : step === 2
              ? "Contagem pausada. Mostre qualquer palma aberta."
              : "Contagem pausada. Mostre qualquer indicador.",
        );
        return;
      }
      if (frameTime.current <= lastFrame) return;
      lastFrame = frameTime.current;
      captured += dt;
      if (step > 0) {
        const value =
          step === 1
            ? settings.controlMode === "antennas"
              ? pitchDistance(roles.pitch!, settings)
              : pitchPoint(roles.pitch!, settings).x
            : settings.controlMode === "wand"
              ? palmPoint(roles.volume!).y
              : roles.volume!.point.y;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      setProgress(Math.min(1, captured / duration));
      setMessage(
        `${step === 0 ? (settings.controlMode === "wand" ? "Mantenha o indicador visível" : "Mantenha as duas mãos visíveis") : "Continue o movimento"} · ${Math.ceil(Math.max(0, duration - captured) / 1000)} s`,
      );
      if (captured < duration) return;
      if (
        step > 0 &&
        max - min < (settings.controlMode === "screen" ? 0.15 : 0.05)
      ) {
        captured = 0;
        min = 1;
        max = 0;
        setProgress(0);
        setMessage(
          "Movimento curto. Amplie o movimento; vamos medir novamente.",
        );
        return;
      }
      finished = true;
      if (step === 1) {
        if (settings.controlMode === "antennas") {
          draft.current.antennaNear = Math.max(0.005, min);
          draft.current.antennaFar = Math.max(min + 0.03, max);
        } else {
          draft.current.pitchMin = min;
          draft.current.pitchMax = max;
        }
      }
      if (step === 2) {
        if (settings.controlMode === "antennas") {
          draft.current.antennaY = max;
          draft.current.volumeReach = Math.max(0.04, max - min);
        } else {
          draft.current.volumeMin = min;
          draft.current.volumeMax = max;
        }
        save.current(draft.current);
      } else setStep(step + 1);
    }, 100);
    return () => clearInterval(id);
  }, [step, hands, frameTime, settings, presence]);

  return (
    <section className="calibration" aria-label="Calibração guiada">
      <div className="calibration-heading">
        <p className="eyebrow">CALIBRAÇÃO · {step + 1} / 3 · SEM CLIQUES</p>
        <button onClick={onClose}>Cancelar</button>
      </div>
      <h2>
        {
          [
            settings.controlMode === "wand"
              ? "Mostre o indicador de nota e a palma de volume"
              : "Mostre as duas mãos",
            settings.controlMode === "wand"
              ? "Mova o indicador ↔ para calibrar notas"
              : "Mova a mão de pitch ↔",
            settings.controlMode === "wand"
              ? "Mova a palma aberta ↕ para calibrar volume"
              : "Mova a mão de volume ↕",
          ][step]
        }
      </h2>
      <p className="calibration-instruction">
        {
          [
            settings.controlMode === "wand"
              ? "Use um indicador e a outra palma aberta. Mantenha por 2 segundos; o som fica pausado até terminar."
              : "Mantenha as palmas no quadro por 2 segundos. O som fica pausado até terminar.",
            settings.controlMode === "antennas"
              ? "Aproxime e afaste as pontas dos dedos da haste por 6 s, no pequeno alcance que quer usar. O dedo marcado controla a nota."
              : "Percorra a largura confortável por 6 segundos com qualquer indicador visível. A ponta marcada controla a nota.",
            settings.controlMode === "antennas"
              ? "Por 6 s, baixe a mão até onde quer silêncio e eleve até seu máximo confortável. O laço será ajustado."
              : "Percorra toda a altura confortável durante 6 segundos. Ao terminar, salvamos e liberamos o som.",
          ][step]
        }
      </p>
      <progress aria-label="Progresso da etapa" value={progress} max={1} />
      <p className="calibration-status" role="status">
        {message}
      </p>
    </section>
  );
}
