// Fixed-size state; no allocations inside sample loops.
const harmonicKeys = ["h1", "h2", "h3", "h4", "h5"];
export class VoiceDSP {
  constructor(rate) {
    this.rate = rate;
    this.phase = 0;
    this.vibratoPhase = 0;
    this.logFrequency = Math.log(440);
    this.gain = 0;
    this.depth = 0;
    this.harmonics = new Float64Array([1, 0.28, 0.12, 0.05, 0.02]);
    this.colorAlpha = 1 - Math.exp(-1 / (0.025 * rate));
    this.attack = 1 - Math.exp(-1 / (0.008 * rate));
    this.release = 1 - Math.exp(-1 / (0.025 * rate));
  }
  render(out, p) {
    const at = (key, i) => p[key][p[key].length === 1 ? 0 : i];
    const alpha = 1 - Math.exp(-1 / (at("glide", 0) * this.rate));
    for (let i = 0; i < out.length; i++) {
      this.logFrequency += alpha * (at("logFrequency", i) - this.logFrequency);
      const target = at("gain", i);
      this.gain +=
        (target > this.gain ? this.attack : this.release) *
        (target - this.gain);
      this.depth +=
        this.colorAlpha *
        (at("vibratoDepth", i) * at("vibratoExpression", i) - this.depth);
      this.vibratoPhase =
        (this.vibratoPhase + at("vibratoRate", i) / this.rate) % 1;
      const f =
        Math.exp(this.logFrequency) *
        2 ** ((Math.sin(this.vibratoPhase * 2 * Math.PI) * this.depth) / 1200);
      this.phase = (this.phase + f / this.rate) % 1;
      let sample = 0;
      for (let h = 0; h < 5; h++) {
        this.harmonics[h] +=
          this.colorAlpha * (at(harmonicKeys[h], i) - this.harmonics[h]);
        const band = Math.max(
          0,
          Math.min(1, (0.48 * this.rate - f * (h + 1)) / (0.08 * this.rate)),
        );
        sample +=
          Math.sin(this.phase * 2 * Math.PI * (h + 1)) *
          this.harmonics[h] *
          band;
      }
      out[i] = sample * this.gain * 0.7;
    }
  }
}
export class SafetyLimiterDSP {
  constructor(rate) {
    this.delay = Math.ceil(rate * 0.003);
    this.left = new Float32Array(this.delay + 1);
    this.right = new Float32Array(this.delay + 1);
    this.index = 0;
    this.gain = 1;
    this.hold = 0;
    this.release = 1 - Math.exp(-1 / (0.12 * rate));
  }
  render(input, output) {
    for (let i = 0; i < output[0].length; i++) {
      const l = Number.isFinite(input[0]?.[i]) ? input[0][i] : 0;
      const r = Number.isFinite(input[1]?.[i]) ? input[1][i] : l;
      const target = Math.min(
        1,
        0.94 / Math.max(Math.abs(l), Math.abs(r), 1e-12),
      );
      if (target < this.gain) {
        this.gain = target;
        this.hold = this.delay + 1;
      } else if (this.hold > 0) this.hold--;
      else this.gain += this.release * (1 - this.gain);
      this.left[this.index] = l;
      this.right[this.index] = r;
      this.index = (this.index + 1) % this.left.length;
      output[0][i] = this.left[this.index] * this.gain;
      output[1][i] = this.right[this.index] * this.gain;
    }
  }
}
