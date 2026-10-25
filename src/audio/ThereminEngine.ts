import { clamp } from "../mapping/gestureMapping";
import type { Settings } from "../types/theremin";
import { harmonics } from "./presets";
export class ThereminEngine {
  readonly context: AudioContext;
  private oscillator: OscillatorNode;
  private gain: GainNode;
  private master: GainNode;
  private filter: BiquadFilterNode;
  private lfo: OscillatorNode;
  private depth: GainNode;
  private wet: GainNode;
  private echo: GainNode;
  private brightness = 0.45;
  private waveform: Settings["waveform"] = "sine";
  private waves: Partial<Record<"theremin" | "strings", PeriodicWave>> = {};
  readonly destination: MediaStreamAudioDestinationNode;
  constructor() {
    if (typeof AudioContext === "undefined") {
      throw new Error("Navegador incompatível: Web Audio não está disponível.");
    }
    this.context = new AudioContext({ latencyHint: "interactive" });
    const c = this.context;
    this.oscillator = c.createOscillator();
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 3500;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 12;
    this.oscillator.connect(this.filter).connect(this.gain);
    this.gain.connect(this.master);
    const reverb = c.createConvolver();
    const impulse = c.createBuffer(2, c.sampleRate * 0.65, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const a = impulse.getChannelData(ch);
      for (let i = 0; i < a.length; i++)
        a[i] = (Math.random() * 2 - 1) * (1 - i / a.length) ** 3;
    }
    reverb.buffer = impulse;
    this.wet = c.createGain();
    this.wet.gain.value = 0;
    this.gain.connect(reverb).connect(this.wet).connect(this.master);
    const delay = c.createDelay(0.5);
    delay.delayTime.value = 0.18;
    this.echo = c.createGain();
    this.echo.gain.value = 0;
    this.gain.connect(delay).connect(this.echo).connect(this.master);
    this.master.connect(compressor).connect(c.destination);
    this.destination = c.createMediaStreamDestination();
    compressor.connect(this.destination);
    this.lfo = c.createOscillator();
    this.lfo.frequency.value = 5;
    this.depth = c.createGain();
    this.depth.gain.value = 0;
    this.lfo.connect(this.depth).connect(this.oscillator.detune);
    this.oscillator.start();
    this.lfo.start();
  }
  async resume() {
    await this.context.resume();
    if (this.context.state !== "running")
      throw new Error("Áudio bloqueado. Clique em Parar e inicie novamente.");
  }
  configure(s: Settings) {
    const t = this.context.currentTime;
    this.brightness = s.brightness;
    if (s.waveform !== this.waveform) {
      if (s.waveform === "theremin" || s.waveform === "strings") {
        const imaginary = new Float32Array(harmonics[s.waveform]);
        this.waves[s.waveform] ??= this.context.createPeriodicWave(
          new Float32Array(imaginary.length),
          imaginary,
        );
        this.oscillator.setPeriodicWave(this.waves[s.waveform]!);
      } else this.oscillator.type = s.waveform;
      this.waveform = s.waveform;
    }
    this.depth.gain.setTargetAtTime(s.vibrato, t, 0.03);
    this.wet.gain.setTargetAtTime(s.reverb, t, 0.03);
    this.echo.gain.setTargetAtTime(s.delay, t, 0.03);
  }
  update(f: number, g: number, safeForMs = 150, expression = this.brightness) {
    const t = this.context.currentTime;
    const color = clamp(expression);
    // Keep the fundamental while opening harmonics as the pitch hand rises.
    this.filter.frequency.setTargetAtTime(
      clamp(f * (1.5 + color * 6), 250, 10000),
      t,
      0.06,
    );
    this.oscillator.frequency.setTargetAtTime(clamp(f, 40, 4000), t, 0.018);
    this.gain.gain.setTargetAtTime(clamp(g, 0, 0.25), t, 0.035);
    this.master.gain.cancelAndHoldAtTime(t);
    this.master.gain.setTargetAtTime(g > 0 ? 1 : 0, t, g > 0 ? 0.05 : 0.008);
    if (g > 0) this.master.gain.setTargetAtTime(0, t + safeForMs / 1000, 0.008);
  }
  silence() {
    this.update(440, 0);
  }
  async close() {
    this.silence();
    await new Promise((r) => setTimeout(r, 50));
    this.oscillator.stop();
    this.lfo.stop();
    await this.context.close();
  }
}
