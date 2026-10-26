// Confidence is feathered rather than a hard cut, preserving hair and fingers.
export function maskPixels(confidence: Float32Array) {
  const rgba = new Uint8ClampedArray(confidence.length * 4);
  for (let i = 0; i < confidence.length; i++) {
    const t = Math.max(0, Math.min(1, (confidence[i] - 0.15) / 0.7));
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = Number.isFinite(t) ? 255 * t * t * (3 - 2 * t) : 0;
  }
  return rgba;
}

export function drawMusicRoom(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
) {
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, "#10142c");
  sky.addColorStop(0.5, "#251b46");
  sky.addColorStop(1, "#093039");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(
    w * 0.5,
    h * 0.7,
    0,
    w * 0.5,
    h * 0.7,
    w * 0.7,
  );
  glow.addColorStop(0, "#a47ee52e");
  glow.addColorStop(1, "#10142c00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#9aa8d92b";
  ctx.lineWidth = 1;
  for (const base of [0.28, 0.72])
    for (let line = 0; line < 5; line++) {
      const y = h * (base + line * 0.022);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y - h * 0.08, w * 0.7, y + h * 0.08, w, y);
      ctx.stroke();
    }
  ctx.font = `${Math.round(h * 0.07)}px Georgia, serif`;
  ctx.fillStyle = "#d1c4f357";
  for (let i = 0; i < 12; i++) {
    const x = ((i * 0.173 + 0.03) % 1) * w;
    const y =
      ((i * 0.277 + 0.12) % 1) * h + Math.sin(time / 2300 + i) * h * 0.012;
    ctx.fillText(i % 3 ? "♪" : "♫", x, y);
  }
}
