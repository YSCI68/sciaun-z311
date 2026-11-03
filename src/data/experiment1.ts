import type { Experiment, Step } from '../types';
import { COLORS, L, totalVol } from '../lib/tube';
import { COMMON_TAKEAWAYS, commonBottles, finishingSteps, initialTubes, preparationSteps, SHARED_HAZARDS, stages, updateTube } from './sharedProtocol';

const separation: Step[] = [
  {
    id: 'tohood', stage: 'separate', kind: 'move', tube: 'A', to: 'hood',
    title: 'Move to the fume hood', noteRef: 'Safety handling for the organic method',
    instruction: 'Carry Tube A to the **fume hood rack** before using phenol:chloroform.',
    why: 'The organic method uses toxic solvents. Work in the fume hood with protective equipment.',
  },
  {
    id: 'pci', stage: 'separate', kind: 'pipette', hood: true,
    title: 'Organic extraction: phenol / chloroform', noteRef: 'Methods page - 1. Organic extraction',
    instruction: (s) => `Add **${Math.round(totalVol(s.tubes.A) / 10) * 10} µL of phenol:chloroform** to Tube A (equal volume in this simulation).`,
    why: 'The methods page shows phenol/chloroform separating the lysate into an aqueous layer, an interphase and a lower organic layer. DNA is polar and remains in the upper aqueous layer.',
    source: 'pci', sourceLabel: 'phenol:chloroform', target: 'A', targetLabel: 'Tube A',
    vol: (s) => { const ideal = Math.round(totalVol(s.tubes.A) / 10) * 10; return { min: ideal * 0.9, max: ideal * 1.1, ideal }; },
    pipettes: ['P1000'], best: 'P1000',
    apply: (t, v) => ({
      tubes: updateTube(t, 'A', {
        layers: [L('pci', 'Phenol / chloroform', v, COLORS.pci, 0.85), ...t.A.layers],
        contents: [...t.A.contents, { name: 'Phenol / chloroform', volume: v }], unmixed: true,
      }), flags: { pci: v },
    }),
  },
  {
    id: 'mix-extract', stage: 'separate', kind: 'mix', tube: 'A', method: 'invert', count: 8,
    title: 'Mix the two phases gently', noteRef: 'Methods page - organic separation (handling)',
    instruction: 'Invert Tube A **8 times** to mix the aqueous lysate and the organic solvent.',
    why: 'Gentle inversion makes contact between the two liquids without strongly shearing the DNA. The mixing count is a simulation setting.',
    apply: (t) => ({ tubes: updateTube(t, 'A', { layers: [L('emulsion', 'Extraction emulsion', totalVol(t.A), COLORS.emulsion, 0.95, { pattern: 'emulsion' })], unmixed: false }) }),
  },
  {
    id: 'spin-extract', stage: 'separate', kind: 'spin', tube: 'A',
    title: 'Separate aqueous layer, interphase and organic layer', noteRef: 'Methods page - organic layer diagram',
    instruction: 'Balance Tube A directly opposite a matching tube, then spin at **12,000 x g for 5 min** (simulation settings).',
    why: 'The lower organic layer and interphase contain material you are removing. The upper aqueous layer contains the DNA that you will pipette into a new tube.',
    speed: [10000, 21000], idealSpeed: 12000, time: [3, 15], idealTime: 5, temp: 'any',
    apply: (t, _v, f) => ({ tubes: updateTube(t, 'A', {
      layers: [
        L('organic', 'Lower organic layer', f.pci, COLORS.organic, 0.9),
        L('interphase', 'Protein interphase', 30, COLORS.interphase, 0.98, { thin: true }),
        L('aqueous', 'Upper aqueous layer (DNA)', totalVol(t.A) - f.pci - 30, COLORS.aqueous, 0.42),
      ], revealed: true,
    }) }),
  },
  {
    id: 'tohood2', stage: 'separate', kind: 'move', tube: 'A', to: 'hood',
    title: 'Return the separated tube to the hood', noteRef: 'Safety handling for the aqueous transfer',
    instruction: 'Place Tube A in the **fume hood rack**, keeping the separated layers undisturbed.',
    why: 'Phenol and chloroform are still present in the lower layer. The fume hood remains necessary.',
  },
  {
    id: 'transfer', stage: 'separate', kind: 'pipette', precision: true,
    title: 'Pipette the upper aqueous layer into a new tube', noteRef: 'Methods page - pipette / new tube arrow',
    instruction: 'Draw **400 µL from the upper aqueous layer** of Tube A. Avoid the interphase, then dispense into clean **Tube B**.',
    why: 'DNA stays in the polar aqueous layer. A careful transfer keeps proteins and organic solvent out of the DNA sample.',
    source: 'A', sourceLabel: 'the upper aqueous DNA layer', target: 'B', targetLabel: 'Tube B',
    vol: () => ({ min: 350, max: 420, ideal: 400 }), pipettes: ['P1000'], best: 'P1000',
    apply: (t, v) => ({
      tubes: updateTube(updateTube(t, 'A', { layers: t.A.layers.map((l) => l.key === 'aqueous' ? { ...l, volume: Math.max(0, l.volume - v) } : l) }), 'B', {
        layers: [L('aqueous', 'Transferred aqueous DNA solution', v, COLORS.aqueous, 0.42)],
        contents: [{ name: 'Aqueous DNA fraction', volume: v }], hasDNA: true,
      }), flags: { transferred: v },
    }),
  },
  {
    id: 'discardA', stage: 'separate', kind: 'discard', tube: 'A', to: 'hazwaste',
    title: 'Dispose of the organic-extraction waste', noteRef: 'Waste handling (simulation support)',
    instruction: 'Place spent Tube A in the **halogenated organic waste** container.',
    why: 'Phenol/chloroform is hazardous waste. Do not put this solvent in the sink or ordinary liquid waste.',
  },
];

export const EXP1: Experiment = {
  id: 'exp1', n: 1, title: 'Organic extraction', sub: 'Phenol / chloroform', method: '1. Organic extraction',
  principle: { heading: 'Organic separation', bullets: [
    'The methods page names phenol/chloroform for organic extraction.',
    'Polar DNA remains in the upper aqueous layer; other material partitions into the interphase and organic layer.',
    'Pipette the aqueous DNA into a new tube, then follow the shared precipitation, 70% ethanol wash and elution steps.',
    'Your notes describe this route as more hazardous because it uses toxic organic solvents.',
  ] },
  hazards: [...SHARED_HAZARDS, 'Phenol / chloroform: toxic; use the fume hood and halogenated waste.'],
  stages: stages('Phenol / chloroform separation'),
  steps: [...preparationSteps(true), ...separation, ...finishingSteps()],
  bottles: commonBottles, balances: ['bal05', 'bal085', 'bal10', 'bal13'],
  hood: true, sampleVol: 100, initialTubes: () => initialTubes(true),
  takeaways: [...COMMON_TAKEAWAYS, 'Organic method: retain the upper aqueous DNA layer, not the interphase or lower organic layer.'],
};