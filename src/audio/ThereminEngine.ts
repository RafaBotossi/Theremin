import { clamp } from "../mapping/gestureMapping";
import { defaults, sanitize, type Settings } from "../types/theremin";
import { hallImpulse } from "./reverb";
export class ThereminEngine {
  readonly context: AudioContext;
  readonly destination: MediaStreamAudioDestinationNode;
  private voice: AudioWorkletNode | null = null;
  private nodes: AudioNode[] = [];
  private lowpass: BiquadFilterNode;
  private vowel: BiquadFilterNode;
  private dry: GainNode;
  private wet: GainNode;
  private echo: GainNode;
  private master: GainNode;
  private settings = { ...defaults };
  private loading: Promise<void> | null = null;
  private closing: Promise<void> | null = null;
  private failed = false;
  constructor() {
    if (typeof AudioContext === "undefined")
      throw Error("Web Audio indisponível neste navegador.");
    const c = (this.context = new AudioContext({ latencyHint: "interactive" }));
    this.destination = c.createMediaStreamDestination();
    this.lowpass = c.createBiquadFilter();
    this.lowpass.type = "lowpass";
    this.lowpass.Q.value = 0.5;
    this.vowel = c.createBiquadFilter();
    this.vowel.type = "peaking";
    this.vowel.frequency.value = 900;
    this.vowel.Q.value = 0.65;
    this.dry = c.createGain();
    this.wet = c.createGain();
    this.echo = c.createGain();
    this.master = c.createGain();
    this.master.gain.value = 0;
    const reverb = c.createConvolver();
    reverb.buffer = hallImpulse(c);
    const delay = c.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 12;
    compressor.ratio.value = 1.5;
    compressor.attack.value = 0.025;
    compressor.release.value = 0.18;
    this.lowpass.connect(this.vowel);
    this.vowel.connect(this.dry).connect(compressor);
    this.vowel.connect(reverb).connect(this.wet).connect(compressor);
    this.vowel.connect(delay).connect(this.echo).connect(compressor);
    this.nodes = [
      this.lowpass,
      this.vowel,
      this.dry,
      this.wet,
      this.echo,
      this.master,
      reverb,
      delay,
      compressor,
      this.destination,
    ];
    this.loading = this.initialize(compressor);
    void this.loading.catch(() => {
      this.failed = true;
    });
  }
  private async initialize(compressor: DynamicsCompressorNode) {
    if (!this.context.audioWorklet)
      throw Error(
        "AudioWorklet indisponível. Use HTTPS e um navegador atualizado.",
      );
    await this.context.audioWorklet.addModule(
      import.meta.env.BASE_URL + "audio/theremin-processor.js",
    );
    if (this.closing) return;
    const voice = new AudioWorkletNode(this.context, "theremin-voice", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const limiter = new AudioWorkletNode(this.context, "theremin-limiter", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: "explicit",
    });
    const failure = () => {
      this.failed = true;
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    };
    voice.onprocessorerror = failure;
    limiter.onprocessorerror = failure;
    this.voice = voice;
    voice.connect(this.lowpass);
    compressor.connect(limiter).connect(this.master);
    this.master.connect(this.context.destination);
    this.master.connect(this.destination);
    this.nodes.push(voice, limiter);
    this.configure(this.settings);
    this.master.gain.setTargetAtTime(1, this.context.currentTime, 0.02);
  }
  async resume() {
    await this.context.resume();
    await this.loading;
    if (this.closing || this.failed || this.context.state !== "running")
      throw Error("Áudio bloqueado. Ative novamente pelo botão.");
  }
  get healthy() {
    return !this.failed && !this.closing && this.context.state === "running";
  }
  private parameter(name: string, value: number) {
    const p = this.voice?.parameters.get(name);
    if (p) {
      p.cancelScheduledValues(this.context.currentTime);
      p.setValueAtTime(value, this.context.currentTime);
    }
  }
  configure(input: Settings) {
    if (this.closing) return;
    const s = (this.settings = sanitize(input)),
      t = this.context.currentTime;
    const coefficients =
      s.waveform === "sine"
        ? [1, 0, 0, 0, 0]
        : s.waveform === "strings"
          ? [1, 0.38, 0.18, 0.08, 0.04]
          : s.waveform === "triangle"
            ? [1, 0, 0.111, 0, 0.04]
            : s.waveform === "sawtooth"
              ? [1, 0.5, 0.333, 0.25, 0.2]
              : [
                  s.harmonic1,
                  s.harmonic2,
                  s.harmonic3,
                  s.harmonic4,
                  s.harmonic5,
                ];
    coefficients.forEach((h, i) => this.parameter("h" + (i + 1), h));
    this.parameter("glide", s.glide);
    this.parameter("vibratoRate", s.vibratoRate);
    this.parameter("vibratoDepth", s.vibrato);
    this.vowel.gain.setTargetAtTime(s.vocalResonance * 3, t, 0.04);
    this.dry.gain.setTargetAtTime(Math.cos((s.reverb * Math.PI) / 2), t, 0.04);
    this.wet.gain.setTargetAtTime(Math.sin((s.reverb * Math.PI) / 2), t, 0.04);
    this.echo.gain.setTargetAtTime(s.delay, t, 0.04);
  }
  update(
    f: number,
    g: number,
    safeForMs = 150,
    expression = this.settings.brightness,
    vibratoExpression = 0,
  ) {
    if (!this.voice || this.closing || this.failed) return;
    const frequency = clamp(Number.isFinite(f) ? f : 440, 40, 4000),
      gain = clamp(Number.isFinite(g) ? g : 0, 0, 0.25),
      t = this.context.currentTime;
    this.parameter("logFrequency", Math.log(frequency));
    this.parameter(
      "vibratoExpression",
      clamp(Number.isFinite(vibratoExpression) ? vibratoExpression : 0),
    );
    const volume = this.voice.parameters.get("gain")!;
    volume.cancelScheduledValues(t);
    volume.setValueAtTime(gain, t);
    // The audio clock owns this deadline, even if the main thread stops.
    volume.setValueAtTime(
      0,
      t + clamp(Number.isFinite(safeForMs) ? safeForMs : 150, 0, 2000) / 1000,
    );
    const color = clamp(
      Number.isFinite(expression) ? expression : this.settings.brightness,
    );
    this.lowpass.frequency.setTargetAtTime(
      clamp(frequency * (3 + color * 9), 500, 16000),
      t,
      0.025,
    );
  }
  silence() {
    if (this.voice && !this.closing) {
      this.parameter("gain", 0);
      this.parameter("vibratoExpression", 0);
    }
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.silence();
    this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
    this.closing = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      this.nodes.forEach((n) => n.disconnect());
      if (this.context.state !== "closed") await this.context.close();
    })();
    return this.closing;
  }
}
