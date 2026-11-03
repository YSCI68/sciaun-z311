import type { BalanceId, PipetteId, ReagentId, TipSize } from '../types';
import { COLORS } from '../lib/tube';

export interface ReagentInfo {
  id: ReagentId;
  name: string;
  short: string;
  detail: string;
  color: string;
  cap: string;
  where: 'shelf' | 'ice' | 'hood';
  hazard?: string;
}

export const REAGENTS: Record<ReagentId, ReagentInfo> = {
  water: {
    id: 'water',
    name: 'DNase-free water',
    short: 'H2O',
    detail: 'Nuclease-free water; an alternative to 1x TE for resuspension',
    color: '#dce8f5',
    cap: '#a855f7',
    where: 'shelf',
  },
  lysis: {
    id: 'lysis',
    name: 'Lysis buffer',
    short: 'LYSIS',
    detail: 'Detergent / SDS and Tris buffer; disrupts cell and nuclear membranes',
    color: COLORS.lysisBuf,
    cap: '#2563eb',
    where: 'shelf',
  },
  rnase: {
    id: 'rnase',
    name: 'RNase A',
    short: 'RNase A',
    detail: 'Digests RNA in the cell lysate; does not digest DNA',
    color: '#f8fafc',
    cap: '#2563eb',
    where: 'ice',
  },
  protk: {
    id: 'protk',
    name: 'Proteinase K',
    short: 'Prot K',
    detail: '20 mg/mL — keep on ice',
    color: '#f1f5f9',
    cap: '#dc2626',
    where: 'ice',
  },
  pci: {
    id: 'pci',
    name: 'Phenol / chloroform',
    short: 'P:C',
    detail: 'Organic extraction mixture; toxic and corrosive, fume hood only',
    color: COLORS.pci,
    cap: '#111827',
    where: 'hood',
    hazard: 'Toxic · Corrosive',
  },
  naoac: {
    id: 'naoac',
    name: '3 M sodium acetate',
    short: 'NaOAc',
    detail: '3 M, pH 5.2',
    color: COLORS.clear,
    cap: '#eab308',
    where: 'shelf',
  },
  etoh100: {
    id: 'etoh100',
    name: 'Ice-cold 100% ethanol',
    short: 'EtOH 100%',
    detail: 'Absolute ethanol, stored at −20 °C — flammable',
    color: COLORS.ethanol,
    cap: '#7c3aed',
    where: 'ice',
    hazard: 'Flammable',
  },
  etoh70: {
    id: 'etoh70',
    name: '70% ethanol',
    short: 'EtOH 70%',
    detail: '70% (v/v) ethanol in water — flammable',
    color: COLORS.ethanol,
    cap: '#0d9488',
    where: 'shelf',
    hazard: 'Flammable',
  },
  te: {
    id: 'te',
    name: 'TE buffer (1×)',
    short: 'TE',
    detail: '10 mM Tris-HCl · 1 mM EDTA, pH 8.0',
    color: COLORS.clear,
    cap: '#16a34a',
    where: 'shelf',
  },
  nacl: {
    id: 'nacl',
    name: 'Saturated NaCl',
    short: 'NaCl',
    detail: 'Sodium chloride, ~6 M — the classic salting-out salt',
    color: '#e2e8f0',
    cap: '#64748b',
    where: 'shelf',
  },
  kac: {
    id: 'kac',
    name: 'Potassium acetate',
    short: 'KAc',
    detail: '3 M potassium acetate, pH 5.2 — one of the salting-out salts',
    color: '#f8fafc',
    cap: '#8b5cf6',
    where: 'shelf',
  },
  edta: {
    id: 'edta',
    name: 'EDTA chelating agent',
    short: 'EDTA',
    detail: 'Binds metal-ion cofactors needed by many DNases; protects the DNA',
    color: '#e2e8f0',
    cap: '#f59e0b',
    where: 'shelf',
  },
};

export interface PipetteInfo {
  id: PipetteId;
  name: string;
  min: number;
  max: number;
  tip: TipSize;
  color: string;
  step: number;
}

export const PIPETTES: Record<PipetteId, PipetteInfo> = {
  P20: { id: 'P20', name: 'P20', min: 2, max: 20, tip: 'T20', color: '#a3a3a3', step: 1 },
  P200: { id: 'P200', name: 'P200', min: 20, max: 200, tip: 'T200', color: '#facc15', step: 1 },
  P1000: { id: 'P1000', name: 'P1000', min: 100, max: 1000, tip: 'T1000', color: '#3b82f6', step: 10 },
};

export const TIPS: Record<TipSize, { label: string; color: string; fill: string; fits: PipetteId }> = {
  T20: { label: '20 µL tips', color: '#e5e7eb', fill: 'rgba(241,245,249,0.85)', fits: 'P20' },
  T200: { label: '200 µL tips', color: '#facc15', fill: 'rgba(250,204,21,0.75)', fits: 'P200' },
  T1000: { label: '1000 µL tips', color: '#3b82f6', fill: 'rgba(96,165,250,0.75)', fits: 'P1000' },
};

export const BALANCES: Record<BalanceId, { label: string; volume: number }> = {
  balcustom: { label: 'Matching balance', volume: 0 },
  bal05: { label: '0.5 mL', volume: 500 },
  bal085: { label: '0.85 mL', volume: 850 },
  bal10: { label: '1.0 mL', volume: 1000 },
  bal13: { label: '1.3 mL', volume: 1300 },
};

/** water-equivalent mass of the plastic itself, used for rotor balancing */
export const TARE = { tube: 500, column: 800 };

export const OBJECT_INFO: Record<string, { name: string; desc: string }> = {
  'ppe-coat': { name: 'Lab coat', desc: 'Protects skin and clothing from splashes.' },
  'ppe-gloves': { name: 'Nitrile gloves', desc: 'Phenol penetrates skin rapidly — always glove up.' },
  'ppe-goggles': { name: 'Safety goggles', desc: 'Protect your eyes from splashes.' },
  'pipette-P20': { name: 'P20 micropipette', desc: '2–20 µL · white tips' },
  'pipette-P200': { name: 'P200 micropipette', desc: '20–200 µL · yellow tips' },
  'pipette-P1000': { name: 'P1000 micropipette', desc: '100–1000 µL · blue tips' },
  stand: { name: 'Pipette stand', desc: 'Return pipettes here (without tips).' },
  'tips-T20': { name: '20 µL tips', desc: 'Fit the P20' },
  'tips-T200': { name: '200 µL tips', desc: 'Fit the P200' },
  'tips-T1000': { name: '1000 µL tips', desc: 'Fit the P1000' },
  tipwaste: { name: 'Tip waste', desc: 'Click while holding a pipette to eject the tip.' },
  plastics: { name: 'Contaminated plastics waste', desc: 'Single-use spin columns and disposable plastic labware.' },
  liquidwaste: { name: 'Liquid waste beaker', desc: 'For ethanol supernatants.' },
  hazwaste: { name: 'Halogenated organic waste', desc: 'Phenol / chloroform waste ONLY.' },
  heatblock: { name: 'Heat block', desc: 'Digital dry bath — click to set temperature & timer.' },
  centrifuge: { name: 'Microcentrifuge', desc: 'Up to 21,000 × g, refrigerated (4–22 °C).' },
  freezer: { name: '−20 °C freezer', desc: 'Carry a tube here to chill it.' },
  nanodrop: { name: 'UV spectrophotometer', desc: 'Micro-volume (NanoDrop-style) — measures A260/A280.' },
  'rack-bench': { name: 'Bench tube rack', desc: 'Click while carrying a tube to put it here.' },
  'rack-hood': { name: 'Fume hood rack', desc: 'Work with phenol:chloroform here.' },
  'tube-A': { name: 'Tube A', desc: 'Your sample tube' },
  'tube-B': { name: 'Tube B', desc: 'Fresh, labelled tube for the DNA' },
  'tube-C': { name: 'Spin column', desc: 'Silica membrane column in a collection tube' },
  columnStand: { name: 'Column stand', desc: 'Holder for the silica spin column' },
  balances: { name: 'Balance tubes', desc: 'Water-filled tubes for balancing the rotor.' },
};
