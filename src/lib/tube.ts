import type { Layer, TubeState } from '../types';

/* Geometry of the 1.5 mL microcentrifuge tube used in every SVG (viewBox 0 0 76 200). */
export const TUBE = {
  top: 46, // y of the 1.5 mL mark
  cylBottom: 150, // where the conical part starts
  tip: 189, // inner tip
  coneVol: 170,
  cap: 1500,
  cx: 30,
};

export function volToY(v: number): number {
  const { top, cylBottom, tip, coneVol, cap } = TUBE;
  if (v <= 0) return tip;
  if (v <= coneVol) return tip - (tip - cylBottom) * Math.cbrt(v / coneVol);
  const clamped = Math.min(v, cap + 60);
  return cylBottom - ((clamped - coneVol) / (cap - coneVol)) * (cylBottom - top);
}

export const COLORS = {
  blood: '#7c0a1b',
  lysisBuf: '#dbeafe',
  lysate: '#8f1d2c',
  digest: '#6f2b1d',
  pci: '#f0bf2a',
  emulsion: '#e9c6a2',
  aqueous: '#f4ecd0',
  interphase: '#f8f5ef',
  organic: '#c47a1a',
  clear: '#dce8f5',
  ethanol: '#e6f0fa',
  dna: '#e9eff6',
  water: '#cfe3fb',
};

export function L(
  key: string,
  label: string,
  volume: number,
  color: string,
  opacity: number,
  extra: Partial<Layer> = {},
): Layer {
  return { key, label, volume, color, opacity, ...extra };
}

export function totalVol(t: Pick<TubeState, 'layers'>): number {
  return Math.round(t.layers.reduce((a, l) => a + l.volume, 0));
}

export function fmtVol(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 1 : 2)} mL`;
  return `${Math.round(v)} µL`;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function fmtClock(mins: number): string {
  const m = Math.floor(mins) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
