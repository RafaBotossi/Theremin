import type { Settings } from "../types/theremin";
import { antennaGeometry } from "../mapping/antennaMapping";
export function AntennaOverlay({ settings: s }: { settings: Settings }) {
  const a = antennaGeometry(s);
  const near = a.pitchX - a.direction * s.antennaNear,
    far = a.pitchX - a.direction * s.antennaFar;
  return (
    <div className="antenna-overlay" aria-hidden="true">
      <div
        className="pitch-field"
        style={{
          left: `${Math.min(near, far) * 100}%`,
          width: `${Math.abs(near - far) * 100}%`,
        }}
      />
      <div className="pitch-antenna" style={{ left: `${a.pitchX * 100}%` }}>
        <span>NOTA</span>
      </div>
      <div
        className="volume-field"
        style={{
          left: `${(a.volumeX - 0.1) * 100}%`,
          top: `${(a.volumeY - s.volumeReach) * 100}%`,
          height: `${s.volumeReach * 100}%`,
        }}
      />
      <div
        className="volume-antenna"
        style={{
          left: `${(a.volumeX - 0.11) * 100}%`,
          top: `${a.volumeY * 100}%`,
        }}
      >
        <span>SILÊNCIO</span>
      </div>
    </div>
  );
}
