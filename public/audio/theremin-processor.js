import { VoiceDSP, SafetyLimiterDSP } from "./dsp.js";
const descriptor = (name, defaultValue, minValue, maxValue) => ({
  name,
  defaultValue,
  minValue,
  maxValue,
  automationRate: "a-rate",
});
class ThereminVoice extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      descriptor("logFrequency", Math.log(440), Math.log(40), Math.log(4000)),
      descriptor("gain", 0, 0, 0.25),
      descriptor("glide", 0.012, 0.003, 0.15),
      descriptor("vibratoRate", 5.5, 5, 6),
      descriptor("vibratoDepth", 12, 0, 50),
      descriptor("vibratoExpression", 0, 0, 1),
      ...[1, 0.28, 0.12, 0.05, 0.02].map((v, i) =>
        descriptor("h" + (i + 1), v, 0, 1),
      ),
    ];
  }
  constructor() {
    super();
    this.dsp = new VoiceDSP(sampleRate);
  }
  process(_inputs, outputs, parameters) {
    this.dsp.render(outputs[0][0], parameters);
    return true;
  }
}
class ThereminLimiter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.dsp = new SafetyLimiterDSP(sampleRate);
  }
  process(inputs, outputs) {
    this.dsp.render(inputs[0], outputs[0]);
    return true;
  }
}
registerProcessor("theremin-voice", ThereminVoice);
registerProcessor("theremin-limiter", ThereminLimiter);
