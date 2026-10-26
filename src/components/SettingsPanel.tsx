import { defaults, type Settings } from "../types/theremin";
export function SettingsPanel({
  value: s,
  onChange,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
}) {
  const number = (
    key: keyof Settings,
    label: string,
    min: number,
    max: number,
    step: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={s[key] as number}
        onChange={(e) => onChange({ ...s, [key]: Number(e.target.value) })}
      />
    </label>
  );
  const toggle = (key: keyof Settings, label: string) => (
    <label className="check">
      <input
        type="checkbox"
        checked={s[key] as boolean}
        onChange={(e) => onChange({ ...s, [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <section className="settings" aria-label="Configurações">
      <h2>Seu espaço, seu instrumento</h2>
      <div className="settings-grid">
        <label>
          Modo de controle
          <select
            value={s.controlMode}
            onChange={(e) =>
              onChange({
                ...s,
                controlMode: e.target.value as Settings["controlMode"],
              })
            }
          >
            <option value="wand">Indicador na nota · palma no volume</option>
            <option value="antennas">Antenas fixas · treino</option>
            <option value="screen">Eixos da tela · modo anterior</option>
          </select>
        </label>
        {s.controlMode === "antennas" && (
          <>
            {number(
              "antennaX",
              "Posição da haste (lado direito, 0–1)",
              0.55,
              0.98,
              0.01,
            )}
            {number(
              "antennaY",
              "Altura do laço / silêncio (0–1)",
              0.3,
              0.95,
              0.01,
            )}
            {number(
              "antennaNear",
              "Distância mínima à haste (0–1)",
              0.005,
              0.4,
              0.005,
            )}
            {number(
              "antennaFar",
              "Distância máxima à haste (0–1)",
              0.035,
              0.8,
              0.005,
            )}
            {number(
              "volumeReach",
              "Alcance vertical do volume (0–1)",
              0.04,
              0.7,
              0.01,
            )}
          </>
        )}
        {
          <>
            <label>
              Identificação das mãos
              <select
                value={s.assignment}
                onChange={(e) =>
                  onChange({
                    ...s,
                    assignment: e.target.value as Settings["assignment"],
                  })
                }
              >
                <option value="anatomical">Automática (anatômica)</option>
                <option value="screen">
                  Pelo lado da imagem (recomendado)
                </option>
              </select>
            </label>
            <label>
              {s.controlMode === "antennas"
                ? "Ponto da mão de volume"
                : "Ponto de controle"}
              <select
                value={s.landmark}
                onChange={(e) =>
                  onChange({
                    ...s,
                    landmark: e.target.value as Settings["landmark"],
                  })
                }
              >
                <option value="palm">Centro da palma</option>
                <option value="index">Ponta do indicador (experimental)</option>
              </select>
            </label>
          </>
        }
        {number("fMin", "Frequência mínima (Hz)", 40, 1800, 10)}
        {number("fMax", "Frequência máxima (Hz)", 50, 4000, 10)}
        {s.controlMode !== "antennas" && (
          <>
            {number("pitchMin", "Pitch: limite esquerdo (0–1)", 0, 0.9, 0.01)}
            {number("pitchMax", "Pitch: limite direito (0–1)", 0.05, 1, 0.01)}
            {number("volumeMin", "Volume: limite superior (0–1)", 0, 0.9, 0.01)}
            {number(
              "volumeMax",
              "Volume: limite inferior (0–1)",
              0.05,
              1,
              0.01,
            )}
          </>
        )}
        {number("sensitivity", "Sensibilidade", 0.5, 2, 0.1)}
        {number("smoothing", "Suavização (segundos)", 0.01, 0.2, 0.005)}
        {number("maxGain", "Ganho máximo (até 0,25)", 0, 0.25, 0.01)}
        {number("vibrato", "Vibrato acionável (cents)", 0, 50, 1)}
        {number("vibratoRate", "Vibrato (Hz)", 5, 6, 0.1)}
        {toggle("gestureVibrato", "Acionar vibrato ao abrir o polegar")}
        {number("vocalResonance", "Ressonância vocal", 0, 1, 0.05)}
        {number("glide", "Glissando (segundos)", 0.003, 0.15, 0.001)}
        {number("brightness", "Brilho do timbre (0–1)", 0, 1, 0.05)}
        {s.controlMode === "screen" &&
          toggle("gestureTone", "Altura da mão de pitch controla o brilho")}
        {number("reverb", "Reverb estéreo (wet/dry)", 0, 0.6, 0.01)}
        {number("delay", "Delay", 0, 0.3, 0.01)}
        {toggle("invertPitch", "Inverter eixo de pitch")}
        {toggle("invertVolume", "Inverter eixo de volume")}
        {s.controlMode !== "wand" && (
          <label className="check">
            <input
              type="checkbox"
              checked={!s.pitchLeft}
              onChange={(e) => onChange({ ...s, pitchLeft: !e.target.checked })}
            />
            Inverter mãos: direita na nota, esquerda no volume
          </label>
        )}
      </div>
      <p>
        {s.controlMode === "wand"
          ? "Junte polegar e indicador de qualquer mão para tocar; abra a pinça para silenciar. Qualquer palma aberta ajusta o volume. Mantenha a altura por 0,6 s para fixar; feche e abra a palma para ajustar novamente. O valor fica salvo neste navegador."
          : s.pitchLeft
            ? "Mão esquerda: nota. Mão direita: volume."
            : "Mão direita: nota. Mão esquerda: volume."}{" "}
      </p>
      <button onClick={() => onChange({ ...defaults })}>
        Restaurar padrões
      </button>
    </section>
  );
}
