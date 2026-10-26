// Detect small, repeated horizontal reversals, not travel between notes.
// The audio worklet supplies a continuous 5–6 Hz vibrato independently of FPS.
export class MotionVibrato {
  private samples: { time: number; cents: number }[] = [];
  private attack = -1;
  private last = 0;
  private amount = 0;
  reset() {
    this.samples = [];
    this.last = 0;
    this.amount = 0;
  }
  update(cents: number | null, now: number, attack: number) {
    if (cents === null || !Number.isFinite(cents)) {
      this.reset();
      return 0;
    }
    if (attack !== this.attack || now - this.last > 180 || now < this.last)
      this.reset();
    this.attack = attack;
    const dt = this.last ? Math.min(100, now - this.last) : 0;
    this.last = now;
    this.samples = this.samples.filter((p) => now - p.time <= 500);
    this.samples.push({ time: now, cents });
    const values = this.samples.map((p) => p.cents);
    const range = Math.max(...values) - Math.min(...values);
    let direction = 0,
      turns = 0,
      lastTurn = -Infinity;
    let extreme = this.samples[0].cents;
    for (const p of this.samples) {
      const delta = p.cents - extreme;
      if (!direction && Math.abs(delta) >= 8) {
        direction = Math.sign(delta);
        extreme = p.cents;
      } else if (delta * direction > 0) extreme = p.cents;
      else if (delta * direction <= -8) {
        turns++;
        lastTurn = p.time;
        direction = -direction;
        extreme = p.cents;
      }
    }
    const target =
      range <= 90 && turns >= 3 && now - lastTurn < 150
        ? Math.min(1, range / 40)
        : 0;
    this.amount +=
      (target - this.amount) *
      (1 - Math.exp(-dt / (target > this.amount ? 55 : 100)));
    return this.amount;
  }
}
