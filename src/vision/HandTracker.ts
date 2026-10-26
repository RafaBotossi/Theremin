import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { Hand, Settings } from "../types/theremin";
import { fingerOpenness } from "./fingerOpenness";
import { indexExtension } from "./indexExtension";
import { thumbVibrato } from "./thumbVibrato";
import { measuredPinch } from "./pinchTouch";
import { openPalm } from "./openPalm";
export class HandTracker {
  private model: HandLandmarker;
  readonly delegate: string;
  private constructor(model: HandLandmarker, delegate: string) {
    this.model = model;
    this.delegate = delegate;
  }
  static async create() {
    const base = import.meta.env.BASE_URL + "mediapipe/";
    const files = await FilesetResolver.forVisionTasks(base + "wasm");
    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        return new HandTracker(
          await HandLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: base + "hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.6,
            minHandPresenceConfidence: 0.6,
            minTrackingConfidence: 0.6,
          }),
          delegate,
        );
      } catch (e) {
        if (delegate === "CPU") throw e;
      }
    }
    throw new Error("Rastreamento indisponível");
  }
  detect(
    video: HTMLVideoElement,
    timestamp: number,
    landmark: Settings["landmark"],
  ): Hand[] {
    const result = this.model.detectForVideo(video, timestamp);
    return result.landmarks.map((points, i) => {
      const ids = landmark === "index" ? [8] : [0, 5, 9, 13, 17];
      const point = {
        x: 1 - ids.reduce((a, id) => a + points[id].x, 0) / ids.length,
        y: ids.reduce((a, id) => a + points[id].y, 0) / ids.length,
      };
      const aspect = video.videoHeight / (video.videoWidth || 1);
      return {
        pinchRatio: measuredPinch(
          result.worldLandmarks?.[i],
          points.map((p) => ({ x: p.x, y: p.y * aspect, z: p.z })),
        ),
        point,
        label: result.handedness[i]?.[0]?.categoryName ?? "",
        score: result.handedness[i]?.[0]?.score ?? 0,
        landmarks: points.map((p) => ({ x: 1 - p.x, y: p.y })),
        openness: fingerOpenness(result.worldLandmarks?.[i] ?? points),
        palmOpen: openPalm(
          result.worldLandmarks?.[i] ??
            points.map((p) => ({
              x: p.x,
              y: (p.y * video.videoHeight) / (video.videoWidth || 1),
              z: p.z,
            })),
        ),
        indexExtension: indexExtension(
          result.worldLandmarks?.[i] ??
            points.map((p) => ({
              x: p.x,
              y: p.y * (video.videoHeight / (video.videoWidth || 1)),
              z: p.z,
            })),
        ),
        vibratoExpression: thumbVibrato(result.worldLandmarks?.[i] ?? points),
      };
    });
  }
  close() {
    this.model.close();
  }
}
