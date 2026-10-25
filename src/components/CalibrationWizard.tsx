import { useEffect, useRef, useState, type RefObject } from "react";
import type { Hand, Settings } from "../types/theremin";
import { selectHands } from "../mapping/gestureMapping";
import { pitchDistance } from "../mapping/antennaMapping";

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
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    "Mostre as duas mãos. O avanço é automático.",
  );
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
      step === 0
        ? "Mostre as duas mãos. O avanço é automático."
        : "Prepare o movimento. Começando em 3 s…",
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
      const available =
        step === 0
          ? !!roles.pitch && !!roles.volume
          : step === 1
            ? !!roles.pitch
            : !!roles.volume;
      if (!fresh || !available) {
        if (step === 0) {
          captured = 0;
          setProgress(0);
        }
        setMessage(
          step === 0
            ? "Mostre as duas mãos. O avanço é automático."
            : "Mão fora do quadro. Contagem pausada; mostre-a para continuar.",
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
              : roles.pitch!.point.x
            : roles.volume!.point.y;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      setProgress(Math.min(1, captured / duration));
      setMessage(
        `${step === 0 ? "Mantenha as duas mãos visíveis" : "Continue o movimento"} · ${Math.ceil(Math.max(0, duration - captured) / 1000)} s`,
      );
      if (captured < duration) return;
      if (
        step > 0 &&
        max - min < (settings.controlMode === "antennas" ? 0.04 : 0.15)
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
  }, [step, hands, frameTime, settings]);

  return (
    <section className="calibration" aria-label="Calibração guiada">
      <div className="calibration-heading">
        <p className="eyebrow">CALIBRAÇÃO · {step + 1} / 3 · SEM CLIQUES</p>
        <button onClick={onClose}>Cancelar</button>
      </div>
      <h2>
        {
          [
            "Mostre as duas mãos",
            "Mova a mão de pitch ↔",
            "Mova a mão de volume ↕",
          ][step]
        }
      </h2>
      <p className="calibration-instruction">
        {
          [
            "Mantenha as palmas no quadro por 2 segundos. O som fica pausado até terminar.",
            settings.controlMode === "antennas"
              ? "Aproxime e afaste as pontas dos dedos da haste por 6 s, no pequeno alcance que quer usar. O dedo marcado controla a nota."
              : "Percorra toda a largura confortável durante 6 segundos. Siga a mão marcada PITCH.",
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
