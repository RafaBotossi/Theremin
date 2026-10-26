import type { Reading } from "../types/theremin";
import { midiFrequency, type SongNote } from "./song";

export function performanceMessage(hits: number, errors: number) {
  const accuracy =
    hits + errors ? Math.round((100 * hits) / (hits + errors)) : 0;
  return {
    accuracy,
    message:
      accuracy >= 90
        ? "Excelente! Você tocou muito bem."
        : accuracy >= 70
          ? "Bom trabalho! Você foi bem."
          : accuracy >= 40
            ? "Quase lá! Pratique mais um pouco."
            : "Ainda precisa praticar. Tente uma velocidade menor.",
  };
}
const audible = (r: Reading) => r.pitch && r.volume && r.gain > 0.002;
const matches = (r: Reading, midi: number) =>
  audible(r) &&
  Math.abs(1200 * Math.log2(r.frequency / midiFrequency(midi))) <= 35;

export class SongScore {
  hits = 0;
  errors = 0;
  private resolved = new Set<number>();
  private held = new Map<number, number>();
  private wrong = new Set<string>();
  private wrongTime = 0;
  private wrongKey = "";
  private last = 0;
  private lastReading?: Reading;
  private readAt = 0;
  private release = 0;
  private wasPlaying = false;
  private lastHit?: { midi: number; attack?: number };
  private elapsed(reading: Reading, now: number) {
    if (reading !== this.lastReading) {
      this.lastReading = reading;
      this.readAt = now;
    }
    const dt = this.last ? Math.max(0, Math.min(150, now - this.last)) : 0;
    this.last = now;
    if (!reading.pitch) {
      if (this.wasPlaying) this.release++;
      this.lastHit = undefined;
    }
    this.wasPlaying = reading.pitch;
    return now - this.readAt <= 180 ? dt : 0;
  }
  pause() {
    this.last = 0;
    this.held.clear();
    this.wrongTime = 0;
  }
  practice(
    reading: Reading,
    index: number,
    midi: number,
    passed: boolean,
    eligible: boolean,
    now: number,
  ) {
    const dt = this.elapsed(reading, now);
    if (passed && !this.resolved.has(index)) {
      this.resolved.add(index);
      this.hits++;
    }
    const key = `${index}:${reading.attack ?? this.release}`;
    if (key !== this.wrongKey) {
      this.wrongTime = 0;
      this.wrongKey = key;
    }
    if (
      eligible &&
      audible(reading) &&
      !matches(reading, midi) &&
      !this.wrong.has(key)
    ) {
      this.wrongTime += dt;
      if (this.wrongTime >= 250) {
        this.errors++;
        this.wrong.add(key);
        this.wrongTime = 0;
      }
    } else this.wrongTime = 0;
  }
  timed(
    notes: SongNote[],
    time: number,
    reading: Reading,
    now: number,
    easy: boolean,
    speed: number,
  ) {
    const dt = this.elapsed(reading, now);
    const current = notes.findIndex((n) => n.start + n.duration > time);
    const index = current < 0 ? notes.length : current;
    const candidates = easy
      ? [index, index - 1, index + 1, index - 2, index + 2]
      : [index];
    const hit = candidates.find(
      (i) =>
        notes[i] &&
        !this.resolved.has(i) &&
        matches(reading, notes[i].midi) &&
        (easy || time >= notes[i].start),
    );
    for (const key of this.held.keys()) if (key !== hit) this.held.delete(key);
    if (hit !== undefined) {
      const note = notes[hit];
      const repeated =
        this.lastHit?.midi === note.midi &&
        this.lastHit.attack === reading.attack;
      const held = (this.held.get(hit) ?? 0) + (repeated ? 0 : dt);
      this.held.set(hit, held);
      if (held >= Math.min(250, (note.duration / speed) * 450)) {
        this.resolved.add(hit);
        this.hits++;
        this.lastHit = { midi: note.midi, attack: reading.attack };
      }
    }
    for (let i = 0; i < Math.max(0, index - (easy ? 2 : 0)); i++) {
      if (!this.resolved.has(i)) {
        this.resolved.add(i);
        this.errors++;
      }
    }
  }
  finish(total: number, timed: boolean) {
    if (timed)
      for (let i = 0; i < total; i++)
        if (!this.resolved.has(i)) {
          this.resolved.add(i);
          this.errors++;
        }
    return {
      hits: this.hits,
      errors: this.errors,
      ...performanceMessage(this.hits, this.errors),
    };
  }
}
