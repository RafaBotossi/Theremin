import { midiFrequency, type SongNote } from "./song";

export type EasyTarget = number | readonly number[] | null;

// In step practice, a new guide target must not retune an existing pinch.
export class PinchTarget {
  private target: EasyTarget = null;
  private attack: number | undefined;
  private held = false;
  update(target: EasyTarget, latch: boolean, playing: boolean, attack: number) {
    if (!latch || !playing || !this.held || this.attack !== attack)
      this.target = target;
    this.held = latch && playing;
    this.attack = attack;
    return this.target;
  }
}

// Current note first; ties favor the current note, then its closest neighbors.
export function easyWindow(notes: SongNote[], time: number): number[] {
  if (time < 0 || !notes.length) return [];
  const index = notes.findIndex((note) => note.start + note.duration > time);
  if (index < 0) return [];
  return [0, -1, 1, -2, 2].flatMap((offset) => {
    const note = notes[index + offset];
    return note ? [note.midi] : [];
  });
}

export function easyPitch(frequency: number, target: EasyTarget) {
  if (target === null || !Number.isFinite(frequency) || frequency <= 0)
    return frequency;
  const targets = typeof target === "number" ? [target] : target;
  const played = 69 + 12 * Math.log2(frequency / 440);
  let distance = Infinity;
  let corrected = frequency;
  for (const midi of targets) {
    const delta = Math.abs(played - midi);
    if (delta <= 3 + 1e-9 && delta < distance - 1e-9) {
      distance = delta;
      corrected = midiFrequency(midi);
    }
  }
  return corrected;
}
