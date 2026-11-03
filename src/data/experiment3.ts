import type { Experiment, Step } from '../types';
import { COLORS, L, totalVol } from '../lib/tube';
import { COMMON_TAKEAWAYS, commonBottles, finishingSteps, initialTubes, preparationSteps, SHARED_HAZARDS, stages, updateTube } from './sharedProtocol';

const separation: Step[] = [
  {
    id: 'load', stage: 'separate', kind: 'pipette', capacity: 750,
    title: 'Bind DNA to the silica membrane', noteRef: 'Methods page - 3. Binding to support material',
    instruction: 'Leave the silica column in its holder. Transfer **500 µL of treated lysate** from Tube A onto the membrane in **Column C**.',
    why: 'The document identifies a silica membrane as the support. DNA is selectively retained on that support while unwanted material is separated. The actual binding-buffer recipe is not given in the notes.',
    tip: 'This is the silica route from the new document, not the earlier magnetic-bead route.',
    source: 'A', sourceLabel: 'treated cell lysate', target: 'C', targetLabel: 'Column C',
    vol: () => ({ min: 450, max: 500, ideal: 500 }), pipettes: ['P1000'], best: 'P1000',
    apply: (t, v) => ({
      tubes: updateTube(updateTube(t, 'A', { layers: t.A.layers.map((l) => ({ ...l, volume: Math.max(0, l.volume - v) })) }), 'C', {
        layers: [L('lys', 'Treated lysate above silica membrane', v, COLORS.digest, 0.65)],
        contents: [{ name: 'Treated lysate from Tube A', volume: v }], hasDNA: true,
      }), flags: { transferred: v },
    }),
  },
  {
    id: 'spin-bind', stage: 'separate', kind: 'spin', tube: 'C',
    title: 'Separate the DNA-bound membrane from flow-through', noteRef: 'Methods page - silica membrane drawing (handling)',
    instruction: 'Load Column C, balance it directly opposite a matching tube, and spin at **12,000 x g for 1 min**.',
    why: 'The liquid passes through the membrane into the collection tube. The DNA remains on the silica. The detailed kit conditions are not specified by your notes.',
    speed: [6000, 21000], idealSpeed: 12000, time: [1, 5], idealTime: 1, temp: 'any',
    apply: (t) => ({ tubes: updateTube(t, 'C', { layers: [], column: { bound: 100, flowThrough: totalVol(t.C) } }) }),
  },
  {
    id: 'discard-flow', stage: 'separate', kind: 'decant', tube: 'C',
    title: 'Remove the flow-through, retaining the membrane', noteRef: 'Silica separation (handling)',
    instruction: 'Empty the column collection tube into **liquid waste**. Keep the silica membrane with its bound DNA.',
    why: 'Do not confuse the discarded flow-through with the DNA held on the membrane. This handling action supports the separation drawn in your notes.',
    apply: (t) => ({ tubes: updateTube(t, 'C', { column: { bound: t.C.column?.bound ?? 0, flowThrough: 0 } }) }),
  },
  {
    id: 'seat', stage: 'separate', kind: 'seat', tube: 'C', into: 'B',
    title: 'Place the membrane column in a new tube', noteRef: 'Methods page - DNA to a new tube arrow',
    instruction: 'While holding Column C, click **Tube B** to place the column in the clean collection tube.',
    why: 'The drawing shows the isolated DNA moving to a new tube before the common ethanol stage. A clean receiver keeps it separate from the earlier waste.',
  },
  {
    id: 'recover', stage: 'separate', kind: 'recover', tube: 'C', into: 'B',
    title: 'Recover the DNA fraction shown in the diagram', noteRef: 'Methods page - schematic recovery transition',
    instruction: 'Pick up the seated column and select **Collect DNA** under Your hands to model the DNA-to-new-tube arrow. The simulation places a **100 µL illustrative DNA fraction** in Tube B.',
    why: 'This is a schematic transition, not a dry-spin elution protocol. The notes do not specify how DNA is released from silica. Real recovery requires suitable solution conditions; spinning a dry membrane alone does not release DNA. No kit recipe is inferred here.',
    tip: 'The 100 µL volume is an animation preset. After this transition, follow the 100% ethanol, 70% ethanol wash and final elution sequence shown in your notes.',
    apply: (t) => ({ tubes: updateTube(updateTube(t, 'C', { layers: [], hasDNA: false, location: 'columnStand', column: { bound: 0, flowThrough: 0 } }), 'B', {
      location: 'bench', hasDNA: true,
      layers: [L('dna-sol', 'Recovered DNA fraction (schematic)', 100, COLORS.clear, 0.42)],
      contents: [{ name: 'DNA recovered from silica (schematic transition)', volume: 100 }],
    }) }),
  },
  {
    id: 'discardC', stage: 'separate', kind: 'discard', tube: 'C', to: 'plastics',
    title: 'Discard the spent membrane column', noteRef: 'Waste handling (simulation support)',
    instruction: 'Place Column C in the designated **plastic waste** bin.',
    why: 'The recovered DNA fraction is now in Tube B. The spent column is no longer needed.',
  },
];

export const EXP3: Experiment = {
  id: 'exp3', n: 3, title: 'Silica membrane binding', sub: 'Binding to a support material', method: '3. Binding to support material (silica membrane)',
  principle: { heading: 'Silica membrane separation', bullets: [
    'The methods page specifies a silica membrane, not magnetic beads.',
    'After lysis, DNase protection, RNase and Proteinase K treatment, DNA is retained by the support.',
    'The document shows DNA going to a new tube, followed by the common 100% ethanol precipitation, 70% ethanol wash and resuspension steps.',
    'Your comparison note describes this method as safer and faster. Detailed silica binding and recovery conditions are not supplied, so recovery is explicitly schematic here.',
  ] },
  hazards: SHARED_HAZARDS, stages: stages('Silica membrane separation'),
  steps: [...preparationSteps(false), ...separation, ...finishingSteps(true)],
  bottles: commonBottles, balances: ['bal05', 'bal085', 'bal10', 'bal13'],
  hood: false, sampleVol: 100, initialTubes: () => initialTubes(false, true),
  takeaways: [...COMMON_TAKEAWAYS,
    'Silica is the only support material specified in these pages. DNA stays on the membrane during separation; flow-through is not the final DNA sample.',
    'The recovery arrow is shown schematically because the notes do not provide solution conditions. Dry centrifugation alone does not elute membrane-bound DNA.',
  ],
};