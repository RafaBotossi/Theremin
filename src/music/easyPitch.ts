import { midiFrequency } from "./song";
export function easyPitch(frequency: number, target: number | null) {
  if (target === null || !Number.isFinite(frequency) || frequency <= 0)
    return frequency;
  const correct = midiFrequency(target);
  return Math.abs(1200 * Math.log2(frequency / correct)) <= 300 + 1e-7
    ? correct
    : frequency;
}
