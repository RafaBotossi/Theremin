// Draw the live instrument into a capture canvas; no screen-sharing permission
// or camera microphone is needed. The audio track comes from the synth output.
export function captureStage(
  video: HTMLVideoElement,
  skeleton: HTMLCanvasElement,
) {
  const stage = video.parentElement!;
  const canvas = document.createElement("canvas");
  const bounds = stage.getBoundingClientRect();
  const scale = Math.min(1, 1280 / bounds.width, 720 / bounds.height);
  canvas.width = Math.max(2, Math.round((bounds.width * scale) / 2) * 2);
  canvas.height = Math.max(2, Math.round((bounds.height * scale) / 2) * 2);
  const ctx = canvas.getContext("2d")!;
  function draw() {
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    ctx.setTransform(
      canvas.width / box.width,
      0,
      0,
      canvas.height / box.height,
      0,
      0,
    );
    ctx.fillStyle = "#0c1018";
    ctx.fillRect(0, 0, box.width, box.height);
    if (video.readyState >= 2 && video.videoWidth) {
      const fit = Math.min(
        box.width / video.videoWidth,
        box.height / video.videoHeight,
      );
      const w = video.videoWidth * fit,
        h = video.videoHeight * fit;
      const x = (box.width - w) / 2,
        y = (box.height - h) / 2;
      ctx.save();
      ctx.translate(box.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, x, y, w, h);
      ctx.restore();
      if (skeleton.width && skeleton.height)
        ctx.drawImage(skeleton, x, y, w, h);
    }
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - box.left,
        y: r.top - box.top,
        w: r.width,
        h: r.height,
      };
    };
    const label = (el: HTMLElement) => {
      const r = rect(el),
        style = getComputedStyle(el);
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = style.color;
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(el.textContent ?? "", r.x + r.w / 2, r.y + r.h / 2);
    };
    const guide = stage.querySelector(".note-guide");
    if (guide) {
      const g = rect(guide);
      ctx.save();
      ctx.beginPath();
      ctx.rect(g.x, g.y, g.w, g.h);
      ctx.clip();
      for (const el of guide.querySelectorAll<HTMLElement>(
        ".note-line, .pitch-cursor, .song-hit-line",
      )) {
        const r = rect(el),
          style = getComputedStyle(el);
        ctx.globalAlpha = Number(style.opacity);
        ctx.strokeStyle = el.classList.contains("pitch-cursor")
          ? "#67e8c2"
          : el.classList.contains("song-hit-line")
            ? style.borderTopColor
            : style.borderLeftColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        if (el.classList.contains("song-hit-line")) ctx.lineTo(r.x + r.w, r.y);
        else ctx.lineTo(r.x, r.y + r.h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const el of guide.querySelectorAll<HTMLElement>(".song-note-dot")) {
        const r = rect(el),
          style = getComputedStyle(el);
        ctx.fillStyle = style.backgroundColor;
        ctx.beginPath();
        ctx.ellipse(
          r.x + r.w / 2,
          r.y + r.h / 2,
          r.w / 2,
          r.h / 2,
          0,
          0,
          2 * Math.PI,
        );
        ctx.fill();
        const span = el.querySelector<HTMLElement>("span");
        if (span) label(span);
      }
      for (const el of guide.querySelectorAll<HTMLElement>(
        ".note-line span, .song-hit-line span",
      ))
        label(el);
      ctx.restore();
    }
  }
  draw();
  const stream = canvas.captureStream(30);
  const timer = window.setInterval(draw, 1000 / 30);
  return {
    stream,
    dispose() {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

export function mp4RecordingType() {
  return [
    'video/mp4;codecs="avc1.42001f,mp4a.40.2"',
    'video/mp4;codecs="avc1,mp4a.40.2"',
    "video/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}
