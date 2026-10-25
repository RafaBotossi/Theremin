// Deterministic decorrelated stereo small hall, synthesized locally. RT60 ~2 s.
export function hallImpulse(context: BaseAudioContext) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.ceil(rate * 2.2), rate);
  for (let channel = 0; channel < 2; channel++) {
    let seed = 17041 + channel * 65537,
      low = 0;
    const data = buffer.getChannelData(channel),
      preDelay = 0.018 + channel * 0.0017;
    for (let i = Math.floor(rate * preDelay); i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const t = i / rate - preDelay;
      low += 0.35 * (seed / 2147483648 - 1 - low);
      data[i] =
        low * (1 - Math.exp(-t / 0.025)) * Math.exp((-Math.log(1000) * t) / 2);
    }
    for (const [time, gain] of [
      [0.023, 0.5],
      [0.037, 0.32],
      [0.053, 0.22],
      [0.079, 0.14],
    ])
      data[Math.floor(rate * (time + channel * 0.003))] += gain;
  }
  return buffer;
}
