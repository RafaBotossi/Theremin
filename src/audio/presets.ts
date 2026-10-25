import type { Settings } from "../types/theremin";
export const presets = {
  classic: {
    name: "Classic RCA",
    description:
      "Fundamental macia, harmônicos suaves e ressonância vocal discreta. Vibrato manual.",
    values: {
      waveform: "theremin",
      harmonic1: 1,
      harmonic2: 0.28,
      harmonic3: 0.12,
      harmonic4: 0.05,
      harmonic5: 0.02,
      brightness: 0.4,
      vocalResonance: 0.4,
      vibrato: 12,
      vibratoRate: 5.5,
      glide: 0.012,
      reverb: 0.16,
      delay: 0,
      gestureTone: false,
    },
  },
  ethereal: {
    name: "Ethereal",
    description: "Som macio com espaço estéreo e cauda de pequeno hall.",
    values: {
      waveform: "theremin",
      harmonic1: 1,
      harmonic2: 0.18,
      harmonic3: 0.07,
      harmonic4: 0.025,
      harmonic5: 0.01,
      brightness: 0.28,
      vocalResonance: 0.2,
      vibrato: 16,
      vibratoRate: 5.2,
      glide: 0.02,
      reverb: 0.42,
      delay: 0,
      gestureTone: false,
    },
  },
  pure: {
    name: "Pure",
    description: "Quase senoidal, com um pouco de calor e sem reverb.",
    values: {
      waveform: "theremin",
      harmonic1: 1,
      harmonic2: 0.045,
      harmonic3: 0.01,
      harmonic4: 0,
      harmonic5: 0,
      brightness: 0.35,
      vocalResonance: 0,
      vibrato: 10,
      vibratoRate: 5.5,
      glide: 0.01,
      reverb: 0,
      delay: 0,
      gestureTone: false,
    },
  },
  practice: {
    name: "Treino",
    description:
      "Antenas fixas, afinação livre e vibrato só da mão. Sem controle extra de brilho.",
    values: {
      controlMode: "antennas",
      waveform: "theremin",
      scale: "free",
      fMin: 220,
      fMax: 880,
      vibrato: 0,
      gestureTone: false,
      brightness: 0.4,
      reverb: 0.12,
      delay: 0,
      smoothing: 0.025,
    },
  },
  melodic: {
    name: "Melódico",
    description:
      "Som encorpado, duas oitavas e ajuda suave para sustentar notas.",
    values: {
      waveform: "theremin",
      scale: "assisted",
      fMin: 220,
      fMax: 880,
      reverb: 0.16,
      delay: 0.06,
      vibrato: 5,
      brightness: 0.45,
      gestureTone: true,
    },
  },
  strings: {
    name: "Cordas",
    description:
      "Harmônicos de cordas, notas livres e espaço para vibrato com a mão.",
    values: {
      waveform: "strings",
      scale: "free",
      fMin: 110,
      fMax: 440,
      reverb: 0.2,
      delay: 0,
      vibrato: 3,
      brightness: 0.35,
      gestureTone: true,
    },
  },
  space: {
    name: "Etéreo",
    description: "Melodias pentatônicas, ressonância suave e eco discreto.",
    values: {
      waveform: "theremin",
      scale: "pentatonic",
      fMin: 220,
      fMax: 880,
      reverb: 0.3,
      delay: 0.15,
      vibrato: 8,
      brightness: 0.3,
      gestureTone: true,
    },
  },
} satisfies Record<
  string,
  { name: string; description: string; values: Partial<Settings> }
>;
export function applyPreset(
  settings: Settings,
  key: keyof typeof presets,
): Settings {
  // Preserve camera calibration, handedness and the user's volume ceiling.
  return {
    ...settings,
    ...presets[key].values,
    controlMode: settings.controlMode,
  };
}
export const harmonics = {
  theremin: [0, 1, 0.28, 0.12, 0.05, 0.02],
  strings: [0, 1, 0.48, 0.26, 0.17, 0.095, 0.06, 0.03, 0.018],
};
