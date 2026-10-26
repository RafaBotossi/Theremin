import { useEffect, useRef, useState } from "react";
import { useHandTracking } from "../hooks/useHandTracking";
import { loadSettings, sanitize, type Settings } from "../types/theremin";
import { CalibrationWizard } from "../components/CalibrationWizard";
import { SettingsPanel } from "../components/SettingsPanel";
import { NoteGuide } from "../components/NoteGuide";
import { applyPreset, presets } from "../audio/presets";
import { AntennaOverlay } from "../components/AntennaOverlay";
import { SongPanel } from "../components/SongPanel";
import { emptyGuide } from "../music/song";
import { AudioLab } from "../components/AudioLab";
export function App() {
  const [lab, setLab] = useState(false);
  const [settings, setSettings] = useState(loadSettings),
    [muted, setMuted] = useState(false),
    [config, setConfig] = useState(false),
    [calibrating, setCalibrating] = useState(false),
    [recording, setRecording] = useState(false),
    [clip, setClip] = useState<{ url: string; ext: string } | null>(null),
    [notice, setNotice] = useState("");
  const [songGuide, setSongGuide] = useState(emptyGuide);
  const session = useHandTracking(
    settings,
    muted || songGuide.listening,
    calibrating,
    songGuide.easyTarget ?? null,
  );
  const recorder = useRef<MediaRecorder | null>(null);
  const clipRef = useRef("");
  const running = session.status === "running";
  const r = session.reading;
  const volume =
    settings.controlMode === "wand"
      ? (r.volumeLevel ?? 0)
      : r.gain / (settings.maxGain || 1);
  function update(s: Settings) {
    const clean = sanitize(s);
    setSettings(clean);
    try {
      localStorage.setItem("air-theremin-settings", JSON.stringify(clean));
    } catch {
      setNotice("Não foi possível salvar preferências neste navegador.");
    }
  }
  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    setRecording(false);
  }
  function stop() {
    stopRecording();
    setCalibrating(false);
    session.stop();
  }
  function record() {
    if (recording) {
      stopRecording();
      return;
    }
    const engine = session.engine.current;
    if (!engine) return;
    if (typeof MediaRecorder === "undefined") {
      setNotice("Gravação não suportada neste navegador.");
      return;
    }
    try {
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(
        engine.destination.stream,
        mime ? { mimeType: mime } : undefined,
      );
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        URL.revokeObjectURL(clipRef.current);
        const url = URL.createObjectURL(
          new Blob(chunks, { type: rec.mimeType }),
        );
        clipRef.current = url;
        setClip({
          url,
          ext: rec.mimeType.includes("mp4")
            ? "m4a"
            : rec.mimeType.includes("ogg")
              ? "ogg"
              : "webm",
        });
      };
      recorder.current = rec;
      rec.start(1000);
      setRecording(true);
    } catch {
      setNotice("Não foi possível iniciar a gravação de áudio.");
    }
  }
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      URL.revokeObjectURL(clipRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!running && recorder.current?.state === "recording") {
      recorder.current.stop();
      setRecording(false);
    }
  }, [running]);
  if (lab)
    return (
      <AudioLab
        settings={settings}
        onSettings={update}
        onBack={() => setLab(false)}
      />
    );
  return (
    <main className="instrument-app">
      <header>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-icon">∿</span> AIR THEREMIN
        </a>
        <span className="local-badge">◉ PROCESSAMENTO LOCAL</span>
        <button
          onClick={() => {
            stop();
            setLab(true);
          }}
        >
          Laboratório de áudio
        </button>
        <button aria-expanded={config} onClick={() => setConfig(!config)}>
          Configurações
        </button>
      </header>
      <div
        className="instrument-toolbar"
        role="group"
        aria-label="Controles do instrumento"
      >
        <div className="buttons">
          <button
            disabled={!running}
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? "Desmutar" : "Mutar"}
          </button>
          <button disabled={session.status === "idle"} onClick={stop}>
            Parar
          </button>
          <button
            disabled={!running}
            onClick={() => setCalibrating(!calibrating)}
          >
            Calibrar
          </button>
          <button disabled={!running} aria-pressed={recording} onClick={record}>
            {recording ? "Encerrar gravação" : "Gravar"}
          </button>
        </div>
        {clip && (
          <a
            className="download"
            href={clip.url}
            download={`air-theremin.${clip.ext}`}
          >
            ↓ Baixar gravação
          </a>
        )}
      </div>
      <div className="instrument">
        <section className="stage-panel" aria-label="Câmera e rastreamento">
          <div className={`camera-stage${running ? " live" : ""}`}>
            <video
              ref={session.video}
              autoPlay
              muted
              playsInline
              aria-label="Preview espelhado da webcam"
            />
            <canvas ref={session.canvas} aria-label="Esqueleto das mãos" />
            {settings.controlMode === "antennas" && (
              <AntennaOverlay settings={settings} />
            )}
            <NoteGuide
              settings={settings}
              frequency={r.frequency}
              active={running && r.pitch}
              target={songGuide.current}
              targetKey={songGuide.attack}
              upcoming={songGuide.next}
              falling={songGuide.falling}
              timed={songGuide.timed}
            />
            {settings.controlMode === "screen" && (
              <div
                className="pitch-zone"
                style={{
                  left: `${settings.pitchMin * 100}%`,
                  width: `${(settings.pitchMax - settings.pitchMin) * 100}%`,
                  top: `${settings.volumeMin * 100}%`,
                  height: `${(settings.volumeMax - settings.volumeMin) * 100}%`,
                }}
              >
                <span>GRAVE ← PITCH → AGUDO</span>
              </div>
            )}
            {!running && (
              <div className="stage-empty">
                <button
                  className="primary"
                  disabled={session.status === "loading"}
                  onClick={() => void session.start()}
                >
                  {session.status === "loading"
                    ? "Preparando o instrumento…"
                    : "Iniciar câmera e áudio"}
                </button>
              </div>
            )}
            {running && (
              <>
                <div
                  className="stage-guide"
                  style={{
                    flexDirection: settings.pitchLeft ? "row-reverse" : "row",
                  }}
                >
                  {settings.controlMode === "wand" ? (
                    <>
                      <span>
                        INDICADOR: APROXIME · TOQUE / RECUE · SILÊNCIO
                      </span>
                      <span>QUALQUER PALMA ↕ VOLUME</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {settings.pitchLeft ? "DIREITA" : "ESQUERDA"} ↕ VOLUME
                      </span>
                      <span>
                        {settings.pitchLeft ? "ESQUERDA" : "DIREITA"}{" "}
                        {settings.controlMode === "antennas"
                          ? "↔ DISTÂNCIA + DEDOS"
                          : "↔ NOTAS · ↕ BRILHO"}
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {songGuide.active && (
            <div className="song-camera-cue">
              <strong>{songGuide.cue}</strong>
              {songGuide.current !== null && (
                <span>
                  {songGuide.remaining === null
                    ? "Alvo mantido para você tocar"
                    : `Troca em ${songGuide.remaining.toFixed(1)} s`}
                </span>
              )}
            </div>
          )}
          {calibrating && running && (
            <CalibrationWizard
              hands={session.hands}
              frameTime={session.frameTime}
              settings={settings}
              onSave={(s) => {
                update(s);
                setCalibrating(false);
                setNotice(
                  "Calibração salva. Indicador na nota, palma aberta no volume.",
                );
              }}
              onClose={() => setCalibrating(false)}
            />
          )}
        </section>
        <aside className="console">
          <p className="eyebrow">Som</p>
          <div className="presets" role="group" aria-label="Sons prontos">
            {Object.entries(presets).map(([key, preset]) => (
              <button
                key={key}
                title={preset.description}
                onClick={() => {
                  const presetSettings = applyPreset(
                    settings,
                    key as keyof typeof presets,
                  );
                  update(
                    songGuide.active
                      ? {
                          ...presetSettings,
                          fMin: settings.fMin,
                          fMax: settings.fMax,
                          scale: settings.scale,
                        }
                      : presetSettings,
                  );
                  setNotice(preset.description);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="volume-label">
            <span>VOLUME</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <meter aria-label="Volume" min="0" max={1} value={volume} />
          <label>
            Timbre
            <select
              value={settings.waveform}
              onChange={(e) =>
                update({
                  ...settings,
                  waveform: e.target.value as Settings["waveform"],
                })
              }
            >
              <option value="theremin">Theremin · quente e encorpado</option>
              <option value="strings">Cordas · aveludado</option>
              <option value="sine">Senoidal · puro</option>
              <option value="triangle">Triangular · suave</option>
              <option value="sawtooth">Dente de serra · filtrado</option>
            </select>
          </label>
          <label>
            Afinação
            <select
              disabled={songGuide.active}
              value={settings.scale}
              onChange={(e) =>
                update({
                  ...settings,
                  scale: e.target.value as Settings["scale"],
                })
              }
            >
              <option value="assisted">Assistida · sustente as notas</option>
              <option value="free">Livre · contínua</option>
              <option value="chromatic">Cromática</option>
              <option value="pentatonic">Pentatônica · Dó maior</option>
            </select>
          </label>
        </aside>
      </div>
      {session.error && (
        <p className="alert" role="alert">
          {session.error}
        </p>
      )}
      {(notice || muted || (running && settings.maxGain === 0)) && (
        <p className="session-feedback" role="status">
          {notice || (muted ? "Som mutado" : "Volume em zero")}
        </p>
      )}
      {config && <SettingsPanel value={settings} onChange={update} />}
      <SongPanel
        reading={r}
        settings={settings}
        running={running}
        blocked={muted || calibrating}
        onSettings={update}
        onGuide={setSongGuide}
      />
    </main>
  );
}
