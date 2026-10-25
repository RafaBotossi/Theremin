const key = "air-theremin-volume";
export function loadVolume() {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  } catch {
    return 0;
  }
}
export class VolumeLatch {
  value: number;
  locked = false;
  private openedAt: number | null = null;
  private stableAt = 0;
  private releasedAt: number | null = null;
  constructor(value = 0) {
    this.value = value;
  }
  update(target: number | null, now: number) {
    if (target === null || !Number.isFinite(target)) {
      if (this.releasedAt === null) this.releasedAt = now;
      if (now - this.releasedAt < 350) return this.value;
      this.openedAt = null;
      this.locked = false;
      return this.value;
    }
    this.releasedAt = null;
    if (this.openedAt === null) {
      this.openedAt = now;
      this.stableAt = now;
    }
    // Require a deliberate open palm, reject single-frame detections.
    if (this.locked || now - this.openedAt < 250) return this.value;
    const rounded = Math.round(Math.max(0, Math.min(1, target)) * 100) / 100;
    if (
      Math.abs(rounded - this.value) >= 0.03 ||
      rounded === 0 ||
      rounded === 1
    ) {
      if (rounded !== this.value) this.stableAt = now;
      this.value = rounded;
    }
    // Once placed, lowering the hand to rest must not turn the volume down.
    if (now - this.stableAt >= 600) this.locked = true;
    return this.value;
  }
  save() {
    try {
      localStorage.setItem(key, String(this.value));
    } catch {
      /* Session still retains the value. */
    }
  }
}
