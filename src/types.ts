export type ExpId = 'exp1' | 'exp2' | 'exp3';
export type DnaseProtection = 'edta' | 'heat';
export type PipetteId = 'P20' | 'P200' | 'P1000';
export type TipSize = 'T20' | 'T200' | 'T1000';
export type ReagentId =
  | 'lysis'
  | 'edta'
  | 'rnase'
  | 'protk'
  | 'pci'
  | 'nacl'
  | 'kac'
  | 'naoac'
  | 'etoh100'
  | 'etoh70'
  | 'te'
  | 'water';
export type TubeId = 'A' | 'B' | 'C';
export type BalanceId = 'bal05' | 'bal085' | 'bal10' | 'bal13' | 'balcustom';
export type LabMode = 'guided' | 'free';
export type LocationId =
  | 'bench'
  | 'hood'
  | 'heatblock'
  | 'centrifuge'
  | 'freezer'
  | 'disposed'
  | 'columnStand'
  | 'seated'
  | 'column';
export type StageId = string;
export type ModalId =
  | 'centrifuge'
  | 'heat'
  | 'freezer'
  | 'dry'
  | 'aspirate'
  | 'spool'
  | 'phaseQuiz'
  | 'quiz'
  | 'nanodrop'
  | 'report'
  | null;
export type Screen = 'intro' | 'briefing' | 'lab';

export interface Layer {
  key: string;
  label: string;
  volume: number;
  color: string;
  opacity: number;
  pattern?: 'emulsion' | 'swirl';
  /** label hidden until the tube has been "revealed" (identify-the-phases quiz) */
  secret?: boolean;
  /** draw with a minimum visual thickness (thin layers such as the interphase) */
  thin?: boolean;
}

export type PelletState = 'wet' | 'dry' | 'overdry' | null;

export interface ColumnState {
  /** amount of DNA held by the silica membrane (arbitrary units) */
  bound: number;
  /** liquid that has passed through and is sitting in the collection tube */
  flowThrough: number;
}

export interface TubeState {
  id: TubeId;
  name: string;
  location: LocationId;
  layers: Layer[];
  contents: { name: string; volume: number }[];
  strands: boolean;
  pellet: PelletState;
  unmixed: boolean;
  revealed: boolean;
  hasDNA: boolean;
  lidOpen: boolean;
  dnaNg?: number;
  reagents?: Partial<Record<ReagentId, number>>;
  column?: ColumnState;
}

export type Tubes = Record<TubeId, TubeState>;

export interface Load {
  source: string;
  label: string;
  volume: number;
  color: string;
  dnaNg?: number;
  reagents?: Partial<Record<ReagentId, number>>;
  layers?: Layer[];
}

export interface PipetteState {
  volume: number;
  tip: null | 'fresh' | 'used';
  load: Load | null;
}

export type Held = null | { kind: 'pipette'; id: PipetteId } | { kind: 'tube'; id: TubeId };

export interface VolSpec {
  min: number;
  max: number;
  ideal: number;
}

export interface Flags {
  dnaseProtected: boolean;
  protectionMethod: DnaseProtection | null;
  rnaRemoved: boolean;
  proteinsDigested: boolean;
  ethanolWashed: boolean;
  interphase: boolean;
  phenol: boolean;
  vortexed: boolean;
  transferred: number;
  pci: number;
  naoac: number;
  ethanol: number;
  te: number;
  dryMinutes: number;
  overdried: boolean;
  airBubbles: number;
  protein: boolean;
  salt: boolean;
  etohCarry: boolean;
  spooled: number;
  eluted: number;
}

export interface Snapshot {
  tubes: Tubes;
  flags: Flags;
}

export type ToastKind = 'success' | 'info' | 'warning' | 'mistake';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
  penalty?: number;
}

export interface LogEntry {
  id: number;
  time: number;
  kind: ToastKind | 'action';
  text: string;
}

export interface Mistake {
  id: number;
  title: string;
  text: string;
  penalty: number;
  step: string;
}

export interface NanoResult {
  conc: number;
  a230: number;
  a260: number;
  a280: number;
  r280: number;
  r230: number;
}

export interface CompletedRun {
  flags: Flags;
  tubes: Tubes;
  result: NanoResult | null;
  mistakes: Mistake[];
  simTime: number;
  startedAt: number;
  finishedAt: number;
  storageTemperature: -20 | -80;
}

/** one question of the "identify the phases / layers" checkpoint */
export interface PhaseQ {
  key: string;
  q: string;
  ok: string;
  wrong: Record<string, string>;
}

export interface QuizOption {
  text: string;
  correct: boolean | ((s: Snapshot, r: NanoResult | null) => boolean);
  feedback?: string;
}

interface StepBase {
  id: string;
  stage: StageId;
  title: string;
  instruction: string | ((s: Snapshot) => string);
  why: string;
  tip?: string;
  noteRef?: string;
}

export type ApplyFn = (t: Tubes, vol: number, f: Flags) => { tubes: Tubes; flags?: Partial<Flags> };

export interface PipetteStep extends StepBase {
  kind: 'pipette';
  source: ReagentId | TubeId;
  alternativeSources?: ReagentId[];
  /** layer key to relabel when an alternative source is chosen */
  altLayerKey?: string;
  sourceLabel: string;
  target: TubeId | 'nanodrop';
  targetLabel: string;
  vol: (s: Snapshot) => VolSpec;
  pipettes: PipetteId[];
  best: PipetteId;
  precision?: boolean;
  hood?: boolean;
  /** the manual skill needed when drawing liquid out of a tube */
  aspireMode?: 'phase' | 'pellet';
  /** maximum volume the destination can take (spin columns hold less than a 1.5 mL tube) */
  capacity?: number;
  instrument?: 'blank' | 'measure';
  apply?: ApplyFn;
}

export type WasteTarget = 'hazwaste' | 'liquidwaste' | 'plastics';

export type Step =
  | (StepBase & { kind: 'ppe' })
  | (StepBase & { kind: 'inspect'; tube: TubeId })
  | PipetteStep
  | (StepBase & { kind: 'mix'; tube: TubeId; method: 'invert' | 'flick'; count: number; apply: ApplyFn })
  | (StepBase & { kind: 'move'; tube: TubeId; to: 'hood' | 'bench' })
  | (StepBase & {
      kind: 'heat';
      tube: TubeId;
      temp: [number, number];
      idealTemp: number;
      time: [number, number];
      idealTime: number;
      apply: ApplyFn;
    })
  | (StepBase & {
      kind: 'spin';
      tube: TubeId;
      speed: [number, number];
      time: [number, number];
      idealSpeed: number;
      idealTime: number;
      temp: 4 | 'any';
      noBalance?: boolean;
      apply: ApplyFn;
    })
  | (StepBase & { kind: 'phaseQuiz'; tube: TubeId; qs?: PhaseQ[] })
  | (StepBase & {
      kind: 'quiz';
      question: string | ((s: Snapshot, r: NanoResult | null) => string);
      options: QuizOption[];
      explanation: string | ((s: Snapshot, r: NanoResult | null) => string);
    })
  | (StepBase & { kind: 'discard'; tube: TubeId; to: WasteTarget })
  | (StepBase & { kind: 'decant'; tube: TubeId; apply: ApplyFn })
  | (StepBase & { kind: 'freeze'; tube: TubeId; time: [number, number]; idealTime: number })
  | (StepBase & { kind: 'store'; tube: TubeId })
  | (StepBase & { kind: 'dry'; tube: TubeId })
  | (StepBase & { kind: 'spool'; tube: TubeId; need: number })
  | (StepBase & { kind: 'seat'; tube: TubeId; into: TubeId })
  | (StepBase & { kind: 'recover'; tube: TubeId; into: TubeId; apply: ApplyFn });

export type StepKind = Step['kind'];

export interface Stage {
  id: string;
  name: string;
  short: string;
  icon: string;
}

export interface Experiment {
  id: ExpId;
  n: number;
  title: string;
  sub: string;
  method: string;
  principle: { heading: string; bullets: string[] };
  hazards: string[];
  stages: Stage[];
  steps: Step[];
  bottles: { id: ReagentId; label: string; sub: string }[];
  balances: BalanceId[];
  hood: boolean;
  sampleVol: number;
  initialTubes: () => Tubes;
  takeaways: string[];
}
