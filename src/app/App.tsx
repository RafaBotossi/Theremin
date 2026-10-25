import { useEffect, useRef, useState } from "react";
import { useHandTracking } from "../hooks/useHandTracking";
import { loadSettings, sanitize, type Settings } from "../types/theremin";
import { noteName } from "../mapping/gestureMapping";
import { CalibrationWizard } from "../components/CalibrationWizard";
import { SettingsPanel } from "../components/SettingsPanel";
import { NoteGuide } from "../components/NoteGuide";
import { SoundPreview } from "../components/SoundPreview";
import { applyPreset, presets } from "../audio/presets";
import { AntennaOverlay } from "../components/AntennaOverlay";
import { PracticePanel } from "../components/PracticePanel";
import { SongPanel } from "../components/SongPanel";
import { emptyGuide, midiFrequency } from "../music/song";
import { PitchFeedback } from "../components/PitchFeedback";
export function App() {
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
  );
  const recorder = useRef<MediaRecorder | null>(null);
  const [practiceCue, setPracticeCue] = useState("");
  const clipRef = useRef("");
  const running = session.status === "running";
  const r = session.reading;
  const cents = Math.round(
    (69 +
      12 * Math.log2(r.frequency / 440) -
      Math.round(69 + 12 * Math.log2(r.frequency / 440))) *
      100,
  );
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
  return (
    <main>
      <header>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-icon">∿</span> AIR THEREMIN
        </a>
        <span className="local-badge">◉ PROCESSAMENTO LOCAL</span>
        <button aria-expanded={config} onClick={() => setConfig(!config)}>
          Configurações
        </button>
      </header>
      <section className="intro">
        <p className="eyebrow">UM INSTRUMENTO. NENHUM TOQUE.</p>
        <h1>
          A música está
          <br />
          nas suas <em>mãos.</em>
        </h1>
        <p>
          Explore o espaço entre o movimento e o som.
          <br />
          Sua webcam vira um instrumento — só seu.
        </p>
      </section>
      <div className="instrument">
        <section className="stage-panel" aria-label="Câmera e rastreamento">
          <div className="stage-top">
            <span>01 / ESPAÇO DE EXPRESSÃO</span>
            <span>{running ? "● AO VIVO" : "○ CÂMERA DESLIGADA"}</span>
          </div>
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
                <div className="orbit">∿</div>
                <h2>Encontre sua frequência</h2>
                <p>
                  Posicione as duas mãos à frente da câmera.
                  <br />
                  Um pouco de espaço. Infinitas possibilidades.
                </p>
                <button
                  className="primary"
                  disabled={session.status === "loading"}
                  onClick={() => void session.start()}
                >
                  {session.status === "loading"
                    ? "Preparando o instrumento…"
                    : "Iniciar câmera e áudio"}
                </button>
                <small>Vídeo e áudio ficam no seu dispositivo.</small>
              </div>
            )}
            {running && (
              <>
                {settings.controlMode === "antennas" &&
                  !calibrating &&
                  !muted &&
                  !songGuide.active && (
                    <div className="practice-cue">{practiceCue}</div>
                  )}
                <div
                  className="stage-guide"
                  style={{
                    flexDirection: settings.pitchLeft ? "row-reverse" : "row",
                  }}
                >
                  <span>
                    {settings.pitchLeft ? "DIREITA" : "ESQUERDA"} ↕ VOLUME
                  </span>
                  <span>
                    {settings.pitchLeft ? "ESQUERDA" : "DIREITA"}{" "}
                    {settings.controlMode === "antennas"
                      ? "↔ DISTÂNCIA + DEDOS"
                      : "↔ NOTAS · ↕ BRILHO"}
                  </span>
                </div>
              </>
            )}
          </div>
          {songGuide.active && (
            <div className="song-camera-cue">
              <strong>{songGuide.cue}</strong>
              {songGuide.next !== null && (
                <span>Próxima: {noteName(midiFrequency(songGuide.next))}</span>
              )}
              {songGuide.current !== null && (
                <span>
                  {songGuide.remaining === null
                    ? "0% · nota congelada"
                    : `Troca em ${songGuide.remaining.toFixed(1)} s`}
                </span>
              )}
            </div>
          )}
          <PitchFeedback
            reading={r}
            target={songGuide.current}
            guideActive={songGuide.active}
            listening={songGuide.listening}
            running={running}
          />
          <div className="stage-bottom">
            <span>
              {running
                ? "Imagem espelhada · mantenha as mãos visíveis"
                : "A câmera será ativada somente ao iniciar"}
            </span>
            <span>{r.fps ? r.fps.toFixed(0) + " FPS" : "— FPS"}</span>
          </div>
          {calibrating && running && (
            <CalibrationWizard
              hands={session.hands}
              frameTime={session.frameTime}
              settings={settings}
              onSave={(s) => {
                update(s);
                setCalibrating(false);
                setNotice(
                  "Calibração salva. Eleve a mão marcada VOLUME para tocar.",
                );
              }}
              onClose={() => setCalibrating(false)}
            />
          )}
        </section>
        <aside className="console">
          <p className="eyebrow">02 / SEU SOM</p>
          <div className="presets" role="group" aria-label="Sons prontos">
            {Object.entries(presets).map(([key, preset]) => (
              <button
                key={key}
                title={preset.description}
                onClick={() => {
                  update(applyPreset(settings, key as keyof typeof presets));
                  setNotice(preset.description);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="note">
            <span>{running ? noteName(r.frequency) : "—"}</span>
            <small>
              {running ? r.frequency.toFixed(1) : "—"} <b>Hz</b>
            </small>
          </div>
          <div className="tuning" aria-label="Afinação em cents">
            <span>
              {running && r.pitch
                ? Math.abs(cents) <= 5
                  ? "Nota centrada"
                  : `${cents > 0 ? "+" : ""}${cents} cents`
                : "Siga as notas na régua da câmera"}
            </span>
            <span>
              {settings.scale === "assisted"
                ? "AJUDA SUAVE"
                : settings.scale === "free"
                  ? "LIVRE"
                  : "ESCALA"}
            </span>
          </div>
          <svg
            className={running && r.gain > 0 ? "wave playing" : "wave"}
            viewBox="0 0 300 60"
            aria-label="Representação decorativa de onda sonora"
          >
            <path d="M0 30 Q12 30 20 30 Q30 0 40 30 T60 30 T80 30 T100 30 T120 30 T140 30 T160 30 T180 30 T200 30 T220 30 T240 30 T260 30 Q280 30 300 30" />
          </svg>
          <div className="volume-label">
            <span>VOLUME</span>
            <span>{Math.round((r.gain / settings.maxGain) * 100) || 0}%</span>
          </div>
          <meter
            aria-label="Volume"
            min="0"
            max={settings.maxGain || 0.25}
            value={r.gain}
          />
          <div className="tracking">
            <span>
              <span>Mão de pitch</span>
              <strong>{r.pitch ? "● Detectada" : "○ Ausente"}</strong>
            </span>
            <span>
              <span>Mão de volume</span>
              <strong>{r.volume ? "● Detectada" : "○ Ausente"}</strong>
            </span>
          </div>
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
          <SoundPreview
            settings={settings}
            disabled={session.status !== "idle" || songGuide.listening}
          />
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
            <button
              disabled={!running}
              aria-pressed={recording}
              onClick={record}
            >
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
          <small>
            {r.inferenceMs > 0
              ? `Inferência: ${r.inferenceMs.toFixed(1)} ms · ${r.delegate}. Não é latência total de áudio.`
              : "Aguardando seu primeiro movimento."}
          </small>
        </aside>
      </div>
      {session.error && (
        <p className="alert" role="alert">
          {session.error}
        </p>
      )}
      <div className="session-feedback" role="status" aria-live="polite">
        {calibrating && running
          ? "Calibração em andamento: som pausado. Não é preciso clicar para avançar."
          : muted
            ? "Som mutado. Use Desmutar para ouvir."
            : running && settings.maxGain === 0
              ? "Ganho máximo está em zero. Ajuste-o em Configurações para ouvir."
              : running && !r.pitch
                ? "Mostre a mão de pitch para liberar o som. Confira a identificação no vídeo."
                : running && !r.volume
                  ? "Mostre a mão de volume e eleve-a para aumentar o som."
                  : running && r.outside
                    ? "Mão fora da área calibrada: valor limitado à borda."
                    : notice ||
                      (running
                        ? "Eleve a mão marcada VOLUME para aumentar o som."
                        : "")}
      </div>
      {config && <SettingsPanel value={settings} onChange={update} />}
      <SongPanel
        settings={settings}
        running={running}
        blocked={muted || calibrating}
        onSettings={update}
        onGuide={setSongGuide}
      />
      {settings.controlMode === "antennas" && (
        <PracticePanel
          settings={settings}
          reading={r}
          running={running}
          paused={muted || calibrating || songGuide.active}
          onCue={setPracticeCue}
        />
      )}
      <section className="instructions" aria-label="Como tocar">
        <article>
          <span>01</span>
          <div>
            <h3>Abra seu espaço</h3>
            <p>Boa luz, câmera à sua frente e as duas mãos no quadro.</p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h3>Desenhe a melodia</h3>
            <p>
              {settings.controlMode === "antennas"
                ? "Aproxime da haste para subir a nota. Abra e feche levemente os dedos para afinar; oscile a mão para criar seu vibrato."
                : "Siga a régua de notas com a mão de pitch. Suba essa mão para abrir o brilho; pequenos movimentos horizontais criam vibrato."}
            </p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h3>Dê intensidade</h3>
            <p>
              Use a outra mão para dar intensidade e separar as notas. Baixe
              para encerrar uma frase; eleve para começar a próxima.
            </p>
          </div>
        </article>
      </section>
      <footer>
        <span>
          AIR THEREMIN <span className="dim">/ UM EXPERIMENTO SONORO</span>
        </span>
        <span>Sem uploads. Sem contas. Só movimento.</span>
      </footer>
    </main>
  );
}
