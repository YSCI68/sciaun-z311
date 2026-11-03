import type { Flags, Layer, Load, NanoResult, ReagentId, TubeState } from '../types';
import { REAGENTS } from '../data/reagents';
import { COLORS, L, totalVol } from './tube';

const reagentKeys = (r: TubeState['reagents']) => Object.keys(r ?? {}) as ReagentId[];

export function drawLiquid(tube: TubeState, volume: number): { tube: TubeState; load: Load } {
  const original = totalVol(tube);
  let remaining = volume;
  let dna = 0;
  const captured: Layer[] = [];
  const layers = tube.layers.map((l) => ({ ...l }));
  const aqueous = layers.find((l) => l.key === 'aqueous');
  for (let i = layers.length - 1; i >= 0 && remaining > 0; i--) {
    const layer = layers[i];
    const take = Math.min(remaining, layer.volume);
    captured.unshift({ ...layer, volume: take });
    if (!tube.pellet) {
      if (aqueous) {
        if (layer.key === 'aqueous') dna += (tube.dnaNg ?? 0) * take / aqueous.volume;
      } else {
        dna += (tube.dnaNg ?? 0) * take / Math.max(original, 1);
      }
    }
    layer.volume -= take;
    remaining -= take;
  }
  const transferred = volume - remaining;
  const reagents: TubeState['reagents'] = {};
  const rest = { ...tube.reagents };
  for (const key of reagentKeys(tube.reagents)) {
    reagents[key] = key === 'pci' && aqueous
      ? captured.filter((l) => l.key === 'organic').reduce((sum, l) => sum + l.volume, 0)
      : (tube.reagents?.[key] ?? 0) * transferred / Math.max(original, 1);
    rest[key] = Math.max(0, (rest[key] ?? 0) - (reagents[key] ?? 0));
  }
  return {
    tube: { ...tube, layers: layers.filter((l) => l.volume > 0), dnaNg: Math.max(0, (tube.dnaNg ?? 0) - dna), reagents: rest },
    load: {
      source: tube.id,
      label: `${aqueous ? 'Aqueous DNA layer' : tube.hasDNA ? 'DNA sample' : 'Liquid'} from Tube ${tube.id}`,
      volume: transferred,
      color: captured[captured.length - 1]?.color ?? COLORS.clear,
      dnaNg: dna,
      reagents,
      layers: captured,
    },
  };
}

export function addLiquid(tube: TubeState, load: Load): TubeState {
  const reagents = { ...tube.reagents };
  const reagent = load.source in REAGENTS ? load.source as ReagentId : null;
  if (reagent) reagents[reagent] = (reagents[reagent] ?? 0) + load.volume;
  for (const key of reagentKeys(load.reagents)) reagents[key] = (reagents[key] ?? 0) + (load.reagents?.[key] ?? 0);
  const extra = reagent
    ? L(reagent, REAGENTS[reagent].name, load.volume, load.color, reagent === 'pci' ? 0.85 : 0.42)
    : L('transfer', load.label, load.volume, load.color, 0.5);
  return {
    ...tube,
    layers: [...tube.layers, extra],
    contents: [...tube.contents, { name: load.label, volume: load.volume }],
    reagents,
    dnaNg: (tube.dnaNg ?? 0) + (load.dnaNg ?? 0),
    hasDNA: tube.hasDNA || (load.dnaNg ?? 0) > 0 || (reagent === 'lysis' && (tube.dnaNg ?? 0) > 0),
    unmixed: true,
    lidOpen: false,
  };
}

export function mixLiquid(tube: TubeState): TubeState {
  const v = totalVol(tube);
  if (!v) return tube;
  if ((tube.reagents?.pci ?? 0) > 0) {
    return {
      ...tube,
      unmixed: false,
      layers: [L('emulsion', 'Mixed aqueous / organic emulsion', v, COLORS.emulsion, 0.95, { pattern: 'emulsion' })],
    };
  }
  const solvent = (tube.reagents?.te ?? 0) + (tube.reagents?.water ?? 0);
  const ethanol = (tube.reagents?.etoh100 ?? 0) + (tube.reagents?.etoh70 ?? 0);
  if (tube.pellet && solvent > 0 && ethanol < v * 0.1) {
    return {
      ...tube, pellet: null, strands: false, unmixed: false,
      dnaNg: (tube.dnaNg ?? 0) * (tube.pellet === 'overdry' ? 0.62 : 1),
      layers: [L('dna', 'DNA resuspended in buffer / water', v, COLORS.dna, 0.42)],
    };
  }
  const precipitated = tube.hasDNA && ethanol >= v * 0.5;
  return {
    ...tube, unmixed: false,
    strands: !tube.pellet && precipitated,
    layers: [L(precipitated ? 'mix' : 'solution', precipitated ? 'Ethanol mixture with DNA precipitate' : 'Mixed sample', v,
      tube.hasDNA && !solvent && !precipitated ? COLORS.lysate : COLORS.clear, 0.5)],
  };
}

export function spinLiquid(tube: TubeState): TubeState {
  const v = totalVol(tube);
  if (!v) return tube;
  const pci = Math.min(tube.reagents?.pci ?? 0, v * 0.9);
  if (pci > 0) {
    const inter = Math.min(30, (v - pci) * 0.12);
    return {
      ...tube, unmixed: false, revealed: true,
      layers: [
        L('organic', 'Organic phase', pci, COLORS.organic, 0.9),
        L('interphase', 'Protein interphase', inter, COLORS.interphase, 0.98, { thin: true }),
        L('aqueous', 'Upper aqueous layer with DNA', v - pci - inter, COLORS.aqueous, 0.42),
      ],
    };
  }
  const ethanol = (tube.reagents?.etoh100 ?? 0) + (tube.reagents?.etoh70 ?? 0);
  if (tube.hasDNA && (tube.strands || tube.pellet || ethanol >= v * 0.5)) {
    return { ...tube, strands: false, pellet: 'wet', layers: [L('sup', 'Ethanol supernatant above DNA pellet', v, COLORS.clear, 0.3)] };
  }
  return { ...tube, unmixed: false, layers: [L('solution', 'Centrifuged sample', v, tube.layers[0]?.color ?? COLORS.clear, 0.5)] };
}

export function decantLiquid(tube: TubeState): TubeState {
  if (!tube.pellet) return { ...tube, layers: [], dnaNg: 0, hasDNA: false, strands: false, reagents: {} };
  return {
    ...tube,
    layers: [L('res', 'Residual ethanol', Math.min(5, totalVol(tube)), COLORS.clear, 0.3)],
    reagents: { etoh100: Math.min(5, totalVol(tube)) },
  };
}

export function dryLiquid(tube: TubeState, min: number): TubeState {
  const left = Math.max(0, totalVol(tube) - min);
  return {
    ...tube,
    layers: left > 0 ? [L('res', 'Remaining ethanol', left, COLORS.clear, 0.3)] : [],
    reagents: left > 0 ? { etoh100: left } : {},
    pellet: tube.pellet ? min > 20 ? 'overdry' : left > 0 ? 'wet' : 'dry' : null,
    lidOpen: true,
  };
}

export function freeMeasurement(conc: number, flags: Flags): NanoResult {
  const r280 = 1.87 - (flags.interphase || flags.protein ? 0.28 : 0) - (flags.phenol ? 0.22 : 0);
  const r230 = 2.14 - (flags.salt ? 0.45 : 0) - (flags.phenol ? 0.75 : 0) - (flags.etohCarry ? 0.6 : 0);
  const a260 = Math.max(0, conc) / 50;
  return { conc: Math.round(Math.max(0, conc) * 10) / 10, a260, a280: a260 / r280, a230: a260 / Math.max(0.2, r230), r280, r230 };
}