import type { Melody, SongNote } from "./song";

// Standard MIDI files, formats 0 and 1, PPQ timing. No network or audio input.
export function parseMidi(buffer: ArrayBuffer): Melody[] {
  if (buffer.byteLength > 1024 * 1024) throw Error("Use um MIDI de até 1 MB.");
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  let pos = 0,
    limit = bytes.length,
    count = 0;
  const need = (n: number) => {
    if (pos + n > limit) throw Error("MIDI incompleto ou inválido.");
  };
  const u8 = () => {
    need(1);
    return bytes[pos++];
  };
  const u16 = () => {
    need(2);
    const n = view.getUint16(pos);
    pos += 2;
    return n;
  };
  const u32 = () => {
    need(4);
    const n = view.getUint32(pos);
    pos += 4;
    return n;
  };
  const tag = () => String.fromCharCode(u8(), u8(), u8(), u8());
  const vlq = () => {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const b = u8();
      n = (n << 7) | (b & 127);
      if (!(b & 128)) return n;
    }
    throw Error("Tempo MIDI inválido.");
  };
  if (tag() !== "MThd") throw Error("Escolha um arquivo MIDI (.mid ou .midi).");
  const header = u32();
  if (header < 6) throw Error("Cabeçalho MIDI inválido.");
  const format = u16(),
    tracks = u16(),
    ppq = u16();
  if (format > 1 || !ppq || ppq & 0x8000)
    throw Error("Use MIDI formato 0 ou 1 com tempo musical (PPQ).");
  need(header - 6);
  pos += header - 6;
  const tempos = [{ tick: 0, us: 500000 }];
  const groups: { name: string; channel: number; notes: SongNote[] }[] = [];
  for (let track = 0; track < tracks; track++) {
    limit = bytes.length;
    if (tag() !== "MTrk") throw Error("Trilha MIDI inválida.");
    const length = u32();
    need(length);
    limit = pos + length;
    let tick = 0,
      running = 0,
      name = `Trilha ${track + 1}`;
    const open = new Map<
      number,
      { tick: number; midi: number; channel: number }[]
    >();
    const notesByChannel = new Map<number, SongNote[]>();
    while (pos < limit) {
      if (++count > 100000)
        throw Error("MIDI muito complexo. Exporte somente a melodia.");
      tick += vlq();
      let status = u8();
      if (status < 128) {
        if (!running) throw Error("Evento MIDI inválido.");
        pos--;
        status = running;
      } else if (status < 240) running = status;
      else running = 0;
      if (status === 255) {
        const type = u8(),
          size = vlq();
        need(size);
        if (type === 3)
          name =
            new TextDecoder()
              .decode(bytes.slice(pos, pos + Math.min(size, 120)))
              .trim() || name;
        if (type === 81 && size === 3) {
          const us = bytes[pos] * 65536 + bytes[pos + 1] * 256 + bytes[pos + 2];
          if (us > 0) tempos.push({ tick, us });
        }
        pos += size;
        if (type === 47) {
          pos = limit;
          break;
        }
        continue;
      }
      if (status === 240 || status === 247) {
        const size = vlq();
        need(size);
        pos += size;
        continue;
      }
      if (status >= 240) throw Error("Evento MIDI não suportado.");
      const kind = status >> 4,
        channel = status & 15,
        a = u8(),
        b = kind === 12 || kind === 13 ? 0 : u8();
      if (a > 127 || b > 127) throw Error("Dados MIDI inválidos.");
      if (channel === 9) continue; // Drum channel is not a pitched melody.
      const key = channel * 128 + a;
      if (kind === 9 && b > 0) {
        const pending = open.get(key) ?? [];
        pending.push({ tick, midi: a, channel });
        open.set(key, pending);
      } else if (kind === 8 || kind === 9) {
        const start = open.get(key)?.shift();
        if (start && tick > start.tick) {
          const notes = notesByChannel.get(channel) ?? [];
          notes.push({
            midi: a,
            start: start.tick,
            duration: tick - start.tick,
          });
          notesByChannel.set(channel, notes);
        }
      }
    }
    for (const pending of open.values())
      if (pending.length)
        throw Error("MIDI tem notas sem término. Exporte novamente a melodia.");
    for (const [channel, notes] of notesByChannel)
      if (notes.length) groups.push({ name, channel, notes });
  }
  tempos.sort((a, b) => a.tick - b.tick);
  const segments: { tick: number; us: number; seconds: number }[] = [];
  for (const tempo of tempos) {
    const last = segments.at(-1);
    segments.push({
      ...tempo,
      seconds: last
        ? last.seconds + ((tempo.tick - last.tick) * last.us) / ppq / 1e6
        : 0,
    });
  }
  const seconds = (tick: number) => {
    let lo = 0,
      hi = segments.length;
    while (lo < hi) {
      const m = (lo + hi) >>> 1;
      if (segments[m].tick <= tick) lo = m + 1;
      else hi = m;
    }
    const s = segments[Math.max(0, lo - 1)];
    return s.seconds + ((tick - s.tick) * s.us) / ppq / 1e6;
  };
  const melodies = groups.map((g) => ({
    name: `${g.name} · canal ${g.channel + 1}`,
    notes: g.notes
      .map((n) => ({
        midi: n.midi,
        start: seconds(n.start),
        duration: seconds(n.start + n.duration) - seconds(n.start),
      }))
      .sort((a, b) => a.start - b.start),
  }));
  if (!melodies.length)
    throw Error("Nenhuma nota melódica encontrada nesse MIDI.");
  if (
    melodies.some(
      (m) =>
        m.notes.length > 10000 ||
        m.notes.some((n) => n.start + n.duration > 7200),
    )
  )
    throw Error(
      "MIDI muito longo. Exporte um trecho de até duas horas e 10 mil notas.",
    );
  return melodies;
}
