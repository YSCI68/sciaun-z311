import type { ExpId } from '../types';

export interface PictureStep { title: string; detail: string; }

export const STUDY_SOURCE = {
  title: 'Current reference: your two study pages',
  description: 'The three-methods page and the common steps / function of each step page replace all earlier workflows.',
};

export const COMMON_FLOW: PictureStep[] = [
  { title: '1. Add lysis buffer', detail: 'Disrupt the cell membrane and nuclear envelope to produce a cell lysate.' },
  { title: '2. Protect DNA from DNases', detail: 'Use a chelating agent or the heating alternative in the notes. DNase is inhibited, not added.' },
  { title: '3. RNase and Proteinase K', detail: 'RNase breaks down RNA. Proteinase K digests proteins.' },
  { title: '4. 100% ethanol + centrifugation', detail: 'Precipitate the DNA, centrifuge to obtain a pellet, and separate the liquid above it.' },
  { title: '5. Wash with 70% ethanol', detail: 'Remove salts, ions and other soluble contaminants while keeping the DNA pellet.' },
  { title: '6. Elution / resuspension', detail: 'Dissolve the cleaned DNA in 1x TE (Tris-EDTA) or DNase-free water.' },
];

const separation: Record<ExpId, PictureStep[]> = {
  exp1: [
    { title: 'Organic: phenol / chloroform', detail: 'Separate the lysate into the upper aqueous DNA layer, interphase and lower organic layer.' },
    { title: 'Pipette into a new tube', detail: 'Keep the upper aqueous DNA fraction. Do not transfer the interphase or lower organic layer.' },
  ],
  exp2: [
    { title: 'Salting out: high salt concentration', detail: 'The notes list sodium acetate, potassium acetate and NaCl.' },
    { title: 'Centrifuge, then pipette the upper layer', detail: 'DNA stays in the upper supernatant. The lower precipitated fraction is labelled salts / RNA / proteins in the drawing.' },
  ],
  exp3: [
    { title: 'Support material: silica membrane', detail: 'DNA binds to the membrane while other material is separated. No magnetic-bead route is included in these pages.' },
    { title: 'Recover DNA into a new tube', detail: 'The recovery arrow is schematic: actual membrane-release conditions are not specified. A dry spin alone does not elute DNA.' },
  ],
};

export const PICTURE_FLOWS: Record<ExpId, PictureStep[]> = {
  exp1: [...COMMON_FLOW.slice(0, 3), ...separation.exp1, ...COMMON_FLOW.slice(3)],
  exp2: [...COMMON_FLOW.slice(0, 3), ...separation.exp2, ...COMMON_FLOW.slice(3)],
  exp3: [...COMMON_FLOW.slice(0, 3), ...separation.exp3, ...COMMON_FLOW.slice(3)],
};

export const PRESET_NOTE =
  'The two study pages are the reference. Volumes, mixing counts, timers and spin settings are illustrative simulation presets because the notes do not supply them. The silica recovery arrow is modelled schematically, not as a kit protocol. Safety setup and handling actions support the illustrated stages.';
