import type { DnaseProtection, Experiment, Stage, Step, TubeId, Tubes, TubeState } from '../types';
import { COLORS, L, totalVol } from '../lib/tube';

export const updateTube = (tubes: Tubes, id: TubeId, patch: Partial<TubeState>): Tubes => ({
  ...tubes, [id]: { ...tubes[id], ...patch },
});

export const emptyTube = (id: TubeId, name: string, location: TubeState['location']): TubeState => ({
  id, name, location, layers: [], contents: [], strands: false, pellet: null,
  unmixed: false, revealed: true, hasDNA: false, lidOpen: false,
});

export function initialTubes(hood = false, silica = false): Tubes {
  return {
    A: {
      ...emptyTube('A', 'Tube A - harvested cells', 'bench'),
      layers: [L('cells', 'Cells / tissue suspension', 100, '#a75a66', 0.85)],
      contents: [{ name: 'Cells / tissue suspension', volume: 100 }],
    },
    B: emptyTube('B', 'Tube B - DNA collection', hood ? 'hood' : 'bench'),
    C: silica
      ? { ...emptyTube('C', 'Silica membrane column', 'columnStand'), column: { bound: 0, flowThrough: 0 } }
      : emptyTube('C', 'Tube C - spare', 'disposed'),
  };
}

export function stages(separation: string): Stage[] {
  return [
    { id: 'prep', name: 'Setup and cell lysis', short: 'Lysis', icon: 'shield' },
    { id: 'cleanup', name: 'DNase protection, RNA and protein removal', short: 'Protect & clean', icon: 'thermometer' },
    { id: 'separate', name: separation, short: 'Separation', icon: 'flask' },
    { id: 'precip', name: '100% ethanol and centrifugation', short: 'Precipitate', icon: 'dna' },
    { id: 'wash', name: '70% ethanol wash', short: 'Wash', icon: 'tubes' },
    { id: 'elute', name: 'Elution / resuspension', short: 'Elute', icon: 'gauge' },
  ];
}

export const SHARED_HAZARDS = [
  'Wear a lab coat, gloves and goggles.',
  'Handle cells and reagents using your laboratory safety rules.',
  'Ethanol is flammable; balance every centrifuge run.',
  'This is a conceptual simulation, not a wet-lab protocol.',
];

export function dnaseProtectionStep(method: DnaseProtection): Step {
  const why = 'Your notes say to add a chelating agent or use heating to make DNA-degrading enzymes (DNases) inactive. EDTA binds metal-ion cofactors needed by many DNases. Heat inactivation depends on the enzyme and must use validated conditions in a real lab.';
  if (method === 'heat') {
    return {
      id: 'dnase-protection', stage: 'cleanup', kind: 'heat', tube: 'A',
      title: '2. Protect DNA: heating option',
      noteRef: 'Common steps page - step 2 (heating alternative)',
      instruction: 'Carry Tube A to the **heat block**. Use **65 C for 10 min** for this teaching animation, then close the instrument and return the tube to the bench.',
      why,
      tip: '65 C / 10 min are simulation settings only. Your notes do not give a temperature or time, and these settings are not a validated DNase-inactivation protocol.',
      temp: [60, 70], idealTemp: 65, time: [5, 20], idealTime: 10,
      apply: (t) => ({ tubes: t, flags: { dnaseProtected: true, protectionMethod: 'heat' } }),
    };
  }
  return {
    id: 'dnase-protection', stage: 'cleanup', kind: 'pipette',
    title: '2. Protect DNA: chelating agent',
    noteRef: 'Common steps page - step 2 (chelating agent)',
    instruction: 'Add **20 µL of EDTA chelating agent** to Tube A. You can choose the heating alternative in the instructions instead.',
    why,
    tip: 'DNase is crossed out in your diagram: inhibit it, do not add it. The EDTA volume is a teaching preset.',
    source: 'edta', sourceLabel: 'EDTA chelating agent', target: 'A', targetLabel: 'Tube A',
    vol: () => ({ min: 18, max: 22, ideal: 20 }), pipettes: ['P20', 'P200'], best: 'P20',
    apply: (t, v) => ({
      tubes: updateTube(t, 'A', {
        layers: [L('lysate', 'Cell lysate protected with EDTA', totalVol(t.A) + v, COLORS.lysate, 0.72)],
        contents: [...t.A.contents, { name: 'EDTA chelating agent', volume: v }],
      }),
      flags: { dnaseProtected: true, protectionMethod: 'edta' },
    }),
  };
}

export function preparationSteps(hood: boolean): Step[] {
  return [
    {
      id: 'ppe', stage: 'prep', kind: 'ppe', title: 'Gear up: put on your PPE',
      noteRef: 'Safety setup (simulation support)',
      instruction: 'Put on your **lab coat, gloves and goggles** at the PPE station.',
      why: hood ? 'Phenol and chloroform require protective equipment and a fume hood.' : 'Protective equipment is still needed when working with cells, buffers and flammable ethanol.',
    },
    {
      id: 'harvest', stage: 'prep', kind: 'inspect', tube: 'A', title: 'Harvest the cells',
      noteRef: 'Methods page - cell / harvested cell',
      instruction: 'Pick up **Tube A** to inspect the harvested cell sample, then return it to the **bench rack**.',
      why: 'Your notes begin with cells and show a cell lysate after buffer is added. The virtual sample is a generic cell suspension; no species or tissue was specified.',
    },
    {
      id: 'lysis', stage: 'prep', kind: 'pipette', title: '1. Add lysis buffer',
      noteRef: 'Common steps page - step 1',
      instruction: 'Add **400 µL of lysis buffer** to Tube A to disrupt the cell and nuclear membranes.',
      why: 'The detergent in lysis buffer disrupts the cell membrane and nuclear envelope, turning cells into a cell lysate containing DNA, RNA, proteins and other material.',
      source: 'lysis', sourceLabel: 'lysis buffer', target: 'A', targetLabel: 'Tube A',
      vol: () => ({ min: 380, max: 420, ideal: 400 }), pipettes: ['P1000'], best: 'P1000',
      apply: (t, v) => ({ tubes: updateTube(t, 'A', {
        layers: [...t.A.layers, L('lysis', 'Lysis buffer', v, COLORS.lysisBuf, 0.42)],
        contents: [...t.A.contents, { name: 'Lysis buffer', volume: v }], unmixed: true,
      }) }),
    },
    {
      id: 'mix-lysis', stage: 'prep', kind: 'mix', tube: 'A', method: 'invert', count: 6,
      title: 'Mix to form the cell lysate', noteRef: 'Common steps page - step 1 (handling)',
      instruction: 'Pick up Tube A and **invert it gently 6 times**.',
      why: 'Mix the detergent through the sample without harshly shearing long DNA molecules. The mixing count is a simulation setting.',
      apply: (t) => ({ tubes: updateTube(t, 'A', {
        layers: [L('lysate', 'Cell lysate: DNA, RNA and proteins', totalVol(t.A), COLORS.lysate, 0.75)],
        hasDNA: true, unmixed: false,
      }) }),
    },
    dnaseProtectionStep('edta'),
    {
      id: 'rnase', stage: 'cleanup', kind: 'pipette', title: '3. Add RNase',
      noteRef: 'Common steps page - step 3 (RNA removal)',
      instruction: 'Add **10 µL of RNase A** to Tube A. RNase removes RNA, not DNA.',
      why: 'Your notes say RNase and Proteinase K break down RNA and protein. RNase acts on RNA; the crossed-out DNase in the diagram must be kept inactive.',
      source: 'rnase', sourceLabel: 'RNase A', target: 'A', targetLabel: 'Tube A',
      vol: () => ({ min: 8, max: 12, ideal: 10 }), pipettes: ['P20'], best: 'P20',
      apply: (t, v) => ({
        tubes: updateTube(t, 'A', { layers: [L('lysate', 'Lysate after RNase treatment', totalVol(t.A) + v, COLORS.digest, 0.7)], contents: [...t.A.contents, { name: 'RNase A', volume: v }] }),
        flags: { rnaRemoved: true },
      }),
    },
    {
      id: 'protk', stage: 'cleanup', kind: 'pipette', title: '3. Add Proteinase K',
      noteRef: 'Common steps page - step 3 (protein removal)',
      instruction: 'Add **20 µL of Proteinase K** to Tube A.',
      why: 'Proteinase K digests proteins associated with DNA. This enzyme-treatment stage represents the RNA/protein-removal arrows in your notes; incubation conditions are not specified there.',
      source: 'protk', sourceLabel: 'Proteinase K', target: 'A', targetLabel: 'Tube A',
      vol: () => ({ min: 18, max: 22, ideal: 20 }), pipettes: ['P20', 'P200'], best: 'P20',
      apply: (t, v) => ({
        tubes: updateTube(t, 'A', { layers: [L('lysate', 'Enzyme-treated cell lysate', totalVol(t.A) + v, COLORS.digest, 0.65)], contents: [...t.A.contents, { name: 'Proteinase K', volume: v }] }),
        flags: { proteinsDigested: true },
      }),
    },
  ];
}

export function finishingSteps(smallFraction = false): Step[] {
  return [
    {
      id: 'ethanol', stage: 'precip', kind: 'pipette', title: '4. Precipitate DNA with 100% ethanol',
      noteRef: 'Common steps page - step 4',
      instruction: (s) => `Add **${Math.round(totalVol(s.tubes.B) * 2 / 10) * 10} µL of 100% ethanol** to the DNA solution in Tube B. Use the 100% bottle, not the 70% wash bottle.`,
      why: 'Your notes use 100% ethanol for precipitation. Alcohol reduces DNA solubility in the salt-containing sample so DNA aggregates. The amount is a teaching preset.',
      source: 'etoh100', sourceLabel: '100% ethanol', target: 'B', targetLabel: 'Tube B',
      vol: (s) => {
        const ideal = Math.min(1000, Math.round(totalVol(s.tubes.B) * 2 / 10) * 10);
        return { min: Math.round(ideal * 0.9), max: Math.min(1000, ideal * 1.1, 1500 - totalVol(s.tubes.B)), ideal };
      },
      pipettes: smallFraction ? ['P200', 'P1000'] : ['P1000'], best: smallFraction ? 'P200' : 'P1000',
      apply: (t, v) => ({
        tubes: updateTube(t, 'B', { layers: [...t.B.layers, L('ethanol', '100% ethanol', v, COLORS.ethanol, 0.35)], contents: [...t.B.contents, { name: '100% ethanol', volume: v }], unmixed: true }),
        flags: { ethanol: v },
      }),
    },
    {
      id: 'mix-precip', stage: 'precip', kind: 'mix', tube: 'B', method: 'invert', count: 6,
      title: 'Mix gently to precipitate DNA', noteRef: 'Common steps page - step 4 (handling)',
      instruction: 'Pick up Tube B and **invert it 6 times**. Watch the white DNA precipitate appear.',
      why: 'The thread-like material represents aggregated DNA. This is the precipitation stage, not the later salt-removing wash.',
      apply: (t) => ({ tubes: updateTube(t, 'B', { layers: [L('mix', 'Ethanol mixture with DNA precipitate', totalVol(t.B), COLORS.clear, 0.32)], strands: true, unmixed: false }) }),
    },
    {
      id: 'spin-pellet', stage: 'precip', kind: 'spin', tube: 'B',
      title: '4. Centrifuge to obtain a DNA pellet', noteRef: 'Common steps page - step 4',
      instruction: 'Load Tube B, prepare a matching balance directly opposite, and run the centrifuge at **12,000 x g for 5 min** (simulation settings).',
      why: 'Centrifugation collects the precipitated DNA as a pellet and separates it from the liquid above it.',
      speed: [10000, 21000], idealSpeed: 12000, time: [3, 15], idealTime: 5, temp: 'any',
      apply: (t) => ({ tubes: updateTube(t, 'B', { strands: false, pellet: 'wet', layers: [L('sup', 'Ethanol supernatant above DNA pellet', totalVol(t.B), COLORS.clear, 0.3)] }) }),
    },
    {
      id: 'decant', stage: 'precip', kind: 'decant', tube: 'B',
      title: 'Keep the DNA pellet; remove the liquid', noteRef: 'Common steps page - pellet separation',
      instruction: 'Pour the liquid from Tube B into **liquid waste**, keeping the DNA pellet in the tube.',
      why: 'The pellet is your DNA. Do not discard it when you remove the ethanol-containing supernatant.',
      apply: (t) => ({ tubes: updateTube(t, 'B', { layers: [L('res', 'Residual ethanol', 5, COLORS.ethanol, 0.3)] }) }),
    },
    {
      id: 'wash', stage: 'wash', kind: 'pipette', title: '5. Wash with 70% ethanol',
      noteRef: 'Common steps page - step 5',
      instruction: 'Add **500 µL of 70% ethanol** to the DNA pellet in Tube B.',
      why: 'The wash removes salts, ions and other soluble contaminants while DNA remains precipitated. This is why your notes distinguish 70% ethanol washing from 100% ethanol precipitation.',
      source: 'etoh70', sourceLabel: '70% ethanol', target: 'B', targetLabel: 'Tube B',
      vol: () => ({ min: 450, max: 550, ideal: 500 }), pipettes: ['P1000'], best: 'P1000',
      apply: (t, v) => ({ tubes: updateTube(t, 'B', { layers: [L('wash', '70% ethanol wash', totalVol(t.B) + v, COLORS.ethanol, 0.3)], contents: [...t.B.contents, { name: '70% ethanol wash', volume: v }] }) }),
    },
    {
      id: 'spin-wash', stage: 'wash', kind: 'spin', tube: 'B',
      title: 'Collect the pellet after washing', noteRef: 'Common steps page - step 5 (handling)',
      instruction: 'Balance Tube B and spin at **12,000 x g for 2 min** to retain the pellet during wash removal.',
      why: 'This handling detail keeps the DNA pellet in the tube while the salt-containing wash is removed. The spin settings are not specified in the notes.',
      speed: [10000, 21000], idealSpeed: 12000, time: [1, 10], idealTime: 2, temp: 'any',
      apply: (t) => ({ tubes: t }),
    },
    {
      id: 'discard-wash', stage: 'wash', kind: 'decant', tube: 'B',
      title: 'Remove the 70% ethanol wash', noteRef: 'Common steps page - step 5',
      instruction: 'Pour the wash into **liquid waste**. Leave the DNA pellet behind.',
      why: 'The 70% ethanol wash now contains salts and other soluble material. Removing it completes the washing stage.',
      apply: (t) => ({ tubes: updateTube(t, 'B', { layers: [L('res', 'Residual wash ethanol', 5, COLORS.ethanol, 0.3)] }), flags: { ethanolWashed: true, salt: false } }),
    },
    {
      id: 'dry', stage: 'wash', kind: 'dry', tube: 'B',
      title: 'Let the remaining ethanol evaporate', noteRef: 'Common steps page - diagram after washing',
      instruction: 'Choose **Air-dry** under Your hands. Use **5-10 minutes** in the simulation until the visible droplets are gone.',
      why: 'Residual ethanol can interfere with dissolving the DNA and with later enzyme reactions. Avoid over-drying. Do not smell laboratory reagents.',
    },
    {
      id: 'resuspend', stage: 'elute', kind: 'pipette', title: '6. Elution / resuspension',
      noteRef: 'Common steps page - step 6',
      instruction: 'Add **50 µL of 1x TE (Tris-EDTA) or DNase-free water** to the DNA pellet in Tube B. Either choice follows your notes.',
      why: 'Elution / resuspension dissolves and preserves the cleaned DNA. Tris buffers the pH and EDTA binds nuclease cofactors; DNase-free water is the other option shown.',
      source: 'te', alternativeSources: ['water'], altLayerKey: 'te', sourceLabel: '1x TE or DNase-free water',
      target: 'B', targetLabel: 'Tube B', vol: () => ({ min: 40, max: 100, ideal: 50 }), pipettes: ['P200'], best: 'P200',
      apply: (t, v) => ({
        tubes: updateTube(t, 'B', { layers: [L('te', '1x TE', v, COLORS.clear, 0.32)], contents: [...t.B.contents, { name: '1x TE', volume: v }] }),
        flags: { te: v },
      }),
    },
    {
      id: 'dissolve', stage: 'elute', kind: 'mix', tube: 'B', method: 'flick', count: 6,
      title: 'Finish resuspending the DNA', noteRef: 'Common steps page - step 6 (handling)',
      instruction: 'Pick up Tube B and **flick it gently 6 times** to dissolve the pellet. This completes the sequence in your notes.',
      why: 'The final sample is DNA in the chosen resuspension liquid. The document does not require a UV measurement or a storage task; those instruments remain available in free practice afterwards.',
      apply: (t, _v, f) => ({ tubes: updateTube(t, 'B', {
        pellet: f.overdried ? 'overdry' : null,
        layers: [L('dna', t.B.contents.some((c) => c.name === 'DNase-free water') ? 'DNA in DNase-free water' : 'DNA in 1x TE', totalVol(t.B), COLORS.dna, 0.42)],
      }) }),
    },
  ];
}

export const commonBottles: Experiment['bottles'] = [
  { id: 'lysis', label: 'LYSIS', sub: 'detergent' },
  { id: 'edta', label: 'EDTA', sub: 'chelating agent' },
  { id: 'etoh70', label: '70%', sub: 'ethanol wash' },
  { id: 'te', label: 'TE', sub: '1x Tris-EDTA' },
  { id: 'water', label: 'H2O', sub: 'DNase-free' },
];

export const COMMON_TAKEAWAYS = [
  '1. Lysis buffer disrupts the cell membrane and nuclear envelope to produce a cell lysate.',
  '2. Chelation or an appropriate heating treatment protects DNA by inhibiting DNA-degrading nucleases. Do not add DNase.',
  '3. RNase removes RNA and Proteinase K digests proteins. The separation method is the main difference between the three routes.',
  '4. 100% ethanol and centrifugation produce a DNA pellet.',
  '5. A 70% ethanol wash removes salts, ions and other soluble contaminants.',
  '6. Resuspend the cleaned DNA in 1x TE (Tris-EDTA) or DNase-free water.',
];