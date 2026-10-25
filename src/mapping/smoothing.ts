export class AdaptiveEMA {
  private value: number | undefined;
  update(target: number, dt: number, tau: number) {
    if (this.value === undefined) this.value = target;
    const speed = Math.abs(target - this.value) / Math.max(dt, 0.001);
    const a = 1 - Math.exp(-Math.max(dt, 0.001) / (tau / (1 + speed * 2)));
    this.value += a * (target - this.value);
    return this.value;
  }
  reset() {
    this.value = undefined;
  }
}
