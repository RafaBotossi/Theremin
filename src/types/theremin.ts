export interface Point {
  x: number;
  y: number;
}
export interface Hand {
  point: Point;
  label: string;
  score: number;
  landmarks: Point[];
  openness?: number;
  palmOpen?: boolean;
  indexExtension?: number;
  vibratoExpression?: number;
}
export interface Settings {
  handLayoutVersion: number;
  controlMode: "antennas" | "screen" | "wand";
  antennaX: number;
  antennaY: number;
  antennaNear: number;
  antennaFar: number;
  volumeReach: number;
  fingerRange: number;
  pitchMin: number;
  pitchMax: number;
  volumeMin: number;
  volumeMax: number;
  fMin: number;
  fMax: number;
  sensitivity: number;
  smoothing: number;
  invertPitch: boolean;
  invertVolume: boolean;
  pitchLeft: boolean;
  assignment: "anatomical" | "screen";
  landmark: "palm" | "index";
  waveform: "theremin" | "strings" | "sine" | "triangle" | "sawtooth";
  scale: "assisted" | "free" | "chromatic" | "pentatonic";
  brightness: number;
  gestureTone: boolean;
  maxGain: number;
  vibrato: number;
  vibratoRate: number;
  gestureVibrato: boolean;
  glide: number;
  vocalResonance: number;
  harmonic1: number;
  harmonic2: number;
  harmonic3: number;
  harmonic4: number;
  harmonic5: number;
  reverb: number;
  delay: number;
}
export const defaults: Settings = {
  handLayoutVersion: 4,
  controlMode: "wand",
  antennaX: 0.9,
  antennaY: 0.8,
  antennaNear: 0.045,
  antennaFar: 0.285,
  volumeReach: 0.25,
  fingerRange: 4,
  pitchMin: 0.15,
  pitchMax: 0.85,
  volumeMin: 0.15,
  volumeMax: 0.85,
  fMin: 220,
  fMax: 880,
  sensitivity: 1,
  smoothing: 0.045,
  invertPitch: false,
  invertVolume: false,
  pitchLeft: false,
  assignment: "anatomical",
  landmark: "palm",
  waveform: "theremin",
  scale: "free",
  brightness: 0.45,
  gestureTone: false,
  maxGain: 0.18,
  vibrato: 12,
  vibratoRate: 5.5,
  gestureVibrato: false,
  glide: 0.012,
  vocalResonance: 0.4,
  harmonic1: 1,
  harmonic2: 0.28,
  harmonic3: 0.12,
  harmonic4: 0.05,
  harmonic5: 0.02,
  reverb: 0.16,
  delay: 0,
};
export function sanitize(input: Partial<Settings>): Settings {
  const s = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    const v = input[key];
    if (
      typeof v === typeof defaults[key] &&
      (typeof v !== "number" || Number.isFinite(v))
    )
      Object.assign(s, { [key]: v });
  }
  const bound = (v: number, a: number, b: number) =>
    Math.max(a, Math.min(b, v));
  s.pitchMin = bound(s.pitchMin, 0, 0.9);
  s.pitchMax = bound(s.pitchMax, s.pitchMin + 0.05, 1);
  s.volumeMin = bound(s.volumeMin, 0, 0.9);
  s.volumeMax = bound(s.volumeMax, s.volumeMin + 0.05, 1);
  s.fMin = bound(s.fMin, 40, 1800);
  s.fMax = bound(s.fMax, s.fMin + 10, 4000);
  s.maxGain = bound(s.maxGain, 0, 0.25);
  s.smoothing = bound(s.smoothing, 0.01, 0.2);
  s.sensitivity = bound(s.sensitivity, 0.5, 2);
  s.vibrato = bound(s.vibrato, 0, 50);
  s.vibratoRate = bound(s.vibratoRate, 5, 6);
  s.glide = bound(s.glide, 0.003, 0.15);
  s.vocalResonance = bound(s.vocalResonance, 0, 1);
  for (const key of [
    "harmonic1",
    "harmonic2",
    "harmonic3",
    "harmonic4",
    "harmonic5",
  ] as const)
    s[key] = bound(s[key], 0, 1);
  s.reverb = bound(s.reverb, 0, 0.6);
  s.delay = bound(s.delay, 0, 0.3);
  s.brightness = bound(s.brightness, 0, 1);
  if (!["antennas", "screen", "wand"].includes(s.controlMode))
    s.controlMode = "wand";
  s.antennaX = bound(s.antennaX, 0.55, 0.98);
  s.antennaY = bound(s.antennaY, 0.3, 0.95);
  s.antennaNear = bound(s.antennaNear, 0.005, 0.4);
  s.antennaFar = bound(s.antennaFar, s.antennaNear + 0.03, 0.8);
  s.volumeReach = bound(s.volumeReach, 0.04, 0.7);
  s.fingerRange = bound(s.fingerRange, 0, 12);
  if (!["anatomical", "screen"].includes(s.assignment))
    s.assignment = defaults.assignment;
  s.handLayoutVersion = defaults.handLayoutVersion;
  if (!["palm", "index"].includes(s.landmark)) s.landmark = "palm";
  if (
    !["theremin", "strings", "sine", "triangle", "sawtooth"].includes(
      s.waveform,
    )
  )
    s.waveform = defaults.waveform;
  if (!["assisted", "free", "chromatic", "pentatonic"].includes(s.scale))
    s.scale = defaults.scale;
  return s;
}
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(
      localStorage.getItem("air-theremin-settings") || "{}",
    );
    // Introduce antenna practice without discarding the user's selected scale.
    if (saved.controlMode === undefined) {
      Object.assign(saved, {
        controlMode: "antennas",
        gestureTone: false,
        vibrato: 0,
      });
    }
    // Swap the previous layout once; subsequent user swaps remain persistent.
    // Subsequent explicit swaps carry this version and remain persistent.
    if (saved.handLayoutVersion !== defaults.handLayoutVersion) {
      saved.pitchLeft =
        saved.handLayoutVersion === 3 ? !saved.pitchLeft : false;
      saved.assignment = "anatomical";
      saved.invertVolume = false;
      saved.controlMode = "wand";
    }
    // Migrate only the old untouched sound. Keep custom sounds and calibration.
    if (
      saved.brightness === undefined &&
      saved.waveform === "sine" &&
      saved.scale === "free" &&
      saved.fMin === 110 &&
      saved.fMax === 1760
    ) {
      Object.assign(saved, {
        waveform: defaults.waveform,
        scale: defaults.scale,
        fMin: defaults.fMin,
        fMax: defaults.fMax,
        reverb: defaults.reverb,
        delay: defaults.delay,
        vibrato: defaults.vibrato,
      });
    }
    return sanitize(saved);
  } catch {
    return { ...defaults };
  }
}
export interface Reading {
  volumeLevel?: number;
  frequency: number;
  gain: number;
  pitch: boolean;
  volume: boolean;
  outside: boolean;
  fps: number;
  inferenceMs: number;
  delegate: string;
}
export const emptyReading: Reading = {
  frequency: 440,
  gain: 0,
  pitch: false,
  volume: false,
  outside: false,
  fps: 0,
  inferenceMs: 0,
  delegate: "",
};
