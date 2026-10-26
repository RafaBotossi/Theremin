import { useEffect, useRef, type RefObject } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { drawMusicRoom, maskPixels } from "../vision/musicalBackground";

export function MusicalBackground({
  video,
  onError,
}: {
  video: RefObject<HTMLVideoElement | null>;
  onError: (message: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const error = useRef(onError);
  error.current = onError;
  useEffect(() => {
    let alive = true,
      raf = 0;
    let segmenter: ImageSegmenter | undefined;
    const target = canvas.current!;
    const input = document.createElement("canvas"),
      mask = document.createElement("canvas"),
      person = document.createElement("canvas");
    const ctx = target.getContext("2d")!,
      inputCtx = input.getContext("2d")!,
      maskCtx = mask.getContext("2d")!,
      personCtx = person.getContext("2d")!;
    async function start() {
      const base = import.meta.env.BASE_URL + "mediapipe/";
      const files = await FilesetResolver.forVisionTasks(base + "wasm");
      if (!alive) return;
      const model = await ImageSegmenter.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: base + "selfie_segmenter.tflite",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      if (!alive) {
        model.close();
        return;
      }
      segmenter = model;
      let lastFrame = -Infinity,
        lastMask = -Infinity,
        videoTime = -1;
      let hasMask = false;
      function draw(now: number) {
        if (!alive) return;
        try {
          const v = video.current;
          if (
            !document.hidden &&
            v &&
            v.readyState >= 2 &&
            v.videoWidth &&
            now - lastFrame >= 30
          ) {
            lastFrame = now;
            const w = 640,
              h = Math.round((w * v.videoHeight) / v.videoWidth);
            const bounds = target.parentElement!.getBoundingClientRect();
            const stageHeight = Math.max(
              1,
              Math.round((640 * bounds.height) / Math.max(1, bounds.width)),
            );
            if (target.width !== 640 || target.height !== stageHeight) {
              target.width = 640;
              target.height = stageHeight;
            }
            if (person.width !== w || person.height !== h) {
              person.width = w;
              person.height = h;
              input.width = 256;
              input.height = Math.round((256 * h) / w);
              hasMask = false;
            }
            // Small inference input, at most 10 Hz; hand tracking stays on the raw video.
            if (now - lastMask >= 100 && v.currentTime !== videoTime) {
              lastMask = now;
              videoTime = v.currentTime;
              inputCtx.drawImage(v, 0, 0, input.width, input.height);
              model.segment(input, (result) => {
                const prediction = result.confidenceMasks?.[0];
                if (!prediction) throw new Error("Missing person mask");
                mask.width = prediction.width;
                mask.height = prediction.height;
                maskCtx.putImageData(
                  new ImageData(
                    maskPixels(prediction.getAsFloat32Array()),
                    mask.width,
                    mask.height,
                  ),
                  0,
                  0,
                );
                hasMask = true;
              });
            }
            if (hasMask) {
              personCtx.clearRect(0, 0, w, h);
              personCtx.save();
              personCtx.translate(w, 0);
              personCtx.scale(-1, 1);
              personCtx.drawImage(v, 0, 0, w, h);
              personCtx.globalCompositeOperation = "destination-in";
              personCtx.drawImage(mask, 0, 0, w, h);
              personCtx.restore();
              drawMusicRoom(ctx, target.width, target.height, now);
              const fit = Math.min(target.width / w, target.height / h);
              ctx.drawImage(
                person,
                (target.width - w * fit) / 2,
                (target.height - h * fit) / 2,
                w * fit,
                h * fit,
              );
              target.dataset.ready = "true";
              target.style.opacity = "1";
            }
          }
          raf = requestAnimationFrame(draw);
        } catch {
          target.dataset.ready = "false";
          target.style.opacity = "0";
          model.close();
          segmenter = undefined;
          error.current(
            "Não foi possível aplicar o fundo musical. A câmera continua sem filtro.",
          );
        }
      }
      raf = requestAnimationFrame(draw);
    }
    void start().catch(() => {
      if (alive)
        error.current(
          "Fundo musical indisponível neste navegador. A câmera continua sem filtro.",
        );
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      segmenter?.close();
    };
  }, [video]);
  return (
    <canvas
      ref={canvas}
      data-musical-background
      data-ready="false"
      aria-label="Fundo musical virtual"
      style={{ opacity: 0, objectFit: "fill" }}
    />
  );
}
