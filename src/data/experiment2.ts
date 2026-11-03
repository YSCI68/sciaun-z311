import type { Experiment, Step } from '../types';
import { L, totalVol } from '../lib/tube';
import { COMMON_TAKEAWAYS, commonBottles, finishingSteps, initialTubes, preparationSteps, SHARED_HAZARDS, stages, updateTube } from './sharedProtocol';

const separation: Step[] = [
  {
    id: 'salt', stage: 'separate', kind: 'pipette',
    title: 'Salting out: add a high salt concentration', noteRef: 'Methods page - 2. Inorganic extraction',
    instruction: (s) => `Choose **NaCl, sodium acetate or potassium acetate** as listed in your notes. Add **${Math.round(totalVol(s.tubes.A) / 3)} µL** to Tube A (simulation setting).`,
    why: 'High salt precipitates proteins and other material. Your notes label the lower fraction as salts, RNA and proteins; the DNA stays in the upper aqueous supernatant.',
    tip: 'The latest document lists sodium acetate, potassium acetate and NaCl. The earlier ammonium-acetate route is not used.',
    source: 'nacl', alternativeSources: ['naoac', 'kac'], altLayerKey: 'salty',
    sourceLabel: 'NaCl, sodium acetate or potassium acetate', target: 'A', targetLabel: 'Tube A',
    vol: (s) => { const ideal = Math.round(totalVol(s.tubes.A) / 3); return { min: Math.floor(ideal * 0.9), max: Math.ceil(ideal * 1.1), ideal }; },
    pipettes: ['P200', 'P1000'], best: 'P200',
    apply: (t, v) => ({ tubes: updateTube(t, 'A', {
      layers: [L('salty', 'Lysate with high-concentration salt', totalVol(t.A) + v, '#c6b8a9', 0.8)],
      contents: [...t.A.contents, { name: 'Concentrated salt', volume: v }], unmixed: true,
    }) }),
  },
  {
    id: 'mix-salt', stage: 'separate', kind: 'mix', tube: 'A', method: 'invert', count: 8,
    title: 'Mix to precipitate the unwanted material', noteRef: 'Methods page - salting out (handling)',
    instruction: 'Invert Tube A **8 times**. The liquid becomes cloudy as proteins precipitate.',
    why: 'Salt reduces the solubility of proteins. The subsequent centrifugation collects this precipitate below the DNA-containing supernatant.',
    apply: (t) => ({ tubes: updateTube(t, 'A', { layers: [L('turbid', 'Salt-treated lysate', totalVol(t.A), '#d8c8b2', 0.9, { pattern: 'emulsion' })], unmixed: false }) }),
  },
  {
    id: 'spin-salt', stage: 'separate', kind: 'spin', tube: 'A',
    title: 'Centrifuge: DNA above, unwanted material below', noteRef: 'Methods page - upper and lower layer drawing',
    instruction: 'Balance Tube A and spin at **12,000 x g for 5 min** (simulation settings).',
    why: 'In salting out, the lower material is a precipitate, not an immiscible organic solvent layer. Your diagram labels this lower fraction salts/RNA/proteins. The upper aqueous supernatant contains DNA.',
    speed: [10000, 21000], idealSpeed: 12000, time: [3, 15], idealTime: 5, temp: 'any',
    apply: (t) => ({ tubes: updateTube(t, 'A', { layers: [
      L('prot', 'Lower precipitated material (salts / RNA / proteins in notes)', 150, '#f3ece1', 0.97),
      L('sup', 'Upper aqueous supernatant (DNA)', totalVol(t.A) - 150, '#eef3f8', 0.42),
    ], revealed: true }) }),
  },
  {
    id: 'transfer', stage: 'separate', kind: 'pipette', precision: true, aspireMode: 'pellet',
    title: 'Pipette the upper DNA solution into a new tube', noteRef: 'Methods page - pipette / new tube arrow',
    instruction: 'Draw **400 µL of upper aqueous supernatant** from Tube A without disturbing the lower precipitate. Dispense into **Tube B**.',
    why: 'Transfer the dissolved DNA, not the precipitated material. This is the same new-tube step drawn under the salting-out diagram.',
    source: 'A', sourceLabel: 'the upper aqueous supernatant', target: 'B', targetLabel: 'Tube B',
    vol: () => ({ min: 350, max: 420, ideal: 400 }), pipettes: ['P1000'], best: 'P1000',
    apply: (t, v) => ({
      tubes: updateTube(updateTube(t, 'A', { layers: t.A.layers.map((l) => l.key === 'sup' ? { ...l, volume: Math.max(0, l.volume - v) } : l) }), 'B', {
        layers: [L('sup', 'Transferred aqueous DNA solution', v, '#eef3f8', 0.42)],
        contents: [{ name: 'Aqueous DNA supernatant', volume: v }], hasDNA: true,
      }), flags: { transferred: v },
    }),
  },
  {
    id: 'discardA', stage: 'separate', kind: 'discard', tube: 'A', to: 'liquidwaste',
    title: 'Discard the spent salt-treated sample', noteRef: 'Waste handling (simulation support)',
    instruction: 'Place spent Tube A in the designated **liquid waste** station.',
    why: 'The DNA fraction is in Tube B. No phenol/chloroform is used in salting out. In a real lab, segregate cell-sample waste according to local safety rules.',
  },
];

export const EXP2: Experiment = {
  id: 'exp2', n: 2, title: 'Inorganic extraction', sub: 'Salting out with high salt', method: '2. Inorganic extraction (salting out)',
  principle: { heading: 'High-salt separation', bullets: [
    'The methods page specifies a high salt concentration for salting out.',
    'The salts shown are sodium acetate, potassium acetate and NaCl.',
    'DNA remains in the upper aqueous supernatant; precipitated material is collected below.',
    'Transfer the upper solution to a new tube, then use 100% ethanol, centrifugation, the 70% ethanol wash and elution.',
  ] },
  hazards: SHARED_HAZARDS, stages: stages('Salting-out separation'),
  steps: [...preparationSteps(false), ...separation, ...finishingSteps()],
  bottles: [...commonBottles.slice(0, 2),
    { id: 'nacl', label: 'NaCl', sub: 'high salt' },
    { id: 'naoac', label: 'NaOAc', sub: 'sodium acetate' },
    { id: 'kac', label: 'KAc', sub: 'potassium acetate' },
    ...commonBottles.slice(2)],
  balances: ['bal05', 'bal085', 'bal10', 'bal13'], hood: false, sampleVol: 100, initialTubes: () => initialTubes(),
  takeaways: [...COMMON_TAKEAWAYS, 'Salting out: pipette DNA from the upper supernatant without disturbing the lower precipitated material.'],
};