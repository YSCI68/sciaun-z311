import { create } from 'zustand';
import type {
  BalanceId,
  Experiment,
  CompletedRun,
  DnaseProtection,
  LabMode,
  Step,
  ExpId,
  Flags,
  Stage,
  Held,
  LocationId,
  LogEntry,
  Mistake,
  ModalId,
  NanoResult,
  PipetteId,
  PipetteState,
  ReagentId,
  Screen,
  TipSize,
  Toast,
  ToastKind,
  TubeId,
  TubeState,
  Tubes,
} from './types';
import { DEFAULT_EXP, EXPERIMENTS } from './data';
import { dnaseProtectionStep } from './data/sharedProtocol';
import { OBJECT_INFO, PIPETTES, REAGENTS, TARE, TIPS } from './data/reagents';
import { isAcceptedSource, isStepDone, rotorImbalance, snap } from './engine';
import { itemName, rotorMass } from './engine';
import { setSoundEnabled, sfx } from './lib/sfx';
import { COLORS, clamp, totalVol } from './lib/tube';
import { addLiquid, decantLiquid, drawLiquid, dryLiquid, freeMeasurement, mixLiquid, spinLiquid } from './lib/freeLab';

export interface Progress {
  picked?: boolean;
  dispensed?: boolean;
  tipEjected?: boolean;
  count?: number;
  done?: boolean;
  instrumentDone?: boolean;
  completed?: boolean;
  dryMin?: number;
  loaded?: boolean;
  spun?: boolean;
}

export type RotorSlot = TubeId | BalanceId | null;
export type TubeAction = 'invert' | 'flick' | 'vortex' | 'putback' | 'dry' | 'spool' | 'collect';

interface LabData {
  mode: LabMode;
  completedRun: CompletedRun | null;
  storageTemperature: -20 | -80;
  customBalanceVolume: number;
  freeDryMinutes: Partial<Record<TubeId, number>>;
  freeSampleConcentration: number;
  freeSampleFlags: Flags | null;
  expId: ExpId;
  exp: Experiment;
  steps: Step[];
  stages: Stage[];
  stepIndex: number;
  progress: Progress;
  ppe: { coat: boolean; gloves: boolean; goggles: boolean };
  held: Held;
  focus: TubeId;
  pipettes: Record<PipetteId, PipetteState>;
  tubes: Tubes;
  flags: Flags;
  modal: ModalId;
  busy: boolean;
  toasts: Toast[];
  log: LogEntry[];
  mistakes: Mistake[];
  simTime: number;
  startedAt: number;
  finishedAt: number | null;
  anim: { kind: 'invert' | 'flick' | 'vortex' | null; key: number };
  rotor: RotorSlot[];
  spin: { speed: number; time: number; temp: 4 | 22 };
  spinState: 'idle' | 'running' | 'done' | 'imbalance';
  heatSet: { temp: number; time: number };
  nano: { loaded: 'blank' | 'sample' | null; blanked: boolean; result: NanoResult | null };
}

export interface LabState extends LabData {
  screen: Screen;
  hints: boolean;
  sound: boolean;
  setScreen: (s: Screen) => void;
  selectExp: (id: ExpId) => void;
  chooseProtection: (method: DnaseProtection) => void;
  startLab: (id?: ExpId) => void;
  enterFreeLab: () => void;
  resetPracticeBench: () => void;
  freshPracticeTube: (id: TubeId, sample?: boolean) => void;
  retrieveTube: (id: TubeId) => void;
  setStorageTemperature: (temperature: -20 | -80) => void;
  prepareMatchingBalance: () => void;
  exitLab: () => void;
  toggleHints: () => void;
  toggleSound: () => void;
  click: (obj: string) => void;
  setPipetteVolume: (v: number) => void;
  ejectTip: () => void;
  returnPipette: () => void;
  tubeAction: (a: TubeAction) => void;
  spoolFiber: () => void;
  seatColumn: (into: TubeId) => void;
  dismissToast: (id: number) => void;
  openModal: (m: ModalId) => void;
  closeModal: () => void;
  rotorClick: (i: number, item: 'held' | BalanceId | null) => void;
  setSpin: (patch: Partial<LabData['spin']>) => void;
  startSpin: () => boolean;
  finishSpin: () => void;
  removeAfterSpin: () => void;
  setHeatSet: (patch: Partial<LabData['heatSet']>) => void;
  startHeat: () => boolean;
  finishHeat: () => void;
  startFreeze: (min: number) => boolean;
  finishFreeze: (min: number) => void;
  startDry: () => boolean;
  finishDry: (min: number) => void;
  aspirateOutcome: (result: 'ok' | 'interphase' | 'organic', keep?: boolean) => void;
  airBubble: () => void;
  recordMistake: (title: string, text: string, penalty: number) => void;
  finishQuiz: () => void;
  nanoBlank: () => void;
  nanoMeasure: () => void;
  nanoFinish: () => void;
}

const freshFlags = (): Flags => ({
  dnaseProtected: false,
  protectionMethod: null,
  rnaRemoved: false,
  proteinsDigested: false,
  ethanolWashed: false,
  interphase: false,
  phenol: false,
  vortexed: false,
  transferred: 0,
  pci: 0,
  naoac: 0,
  ethanol: 0,
  te: 0,
  dryMinutes: 0,
  overdried: false,
  airBubbles: 0,
  protein: false,
  salt: false,
  etohCarry: false,
  spooled: 0,
  eluted: 0,
});

// Experiment snapshots contain plain lab data; cloning explicitly also works in
// browsers or embedded previews where structuredClone is not available.
function copyTubes(tubes: Tubes): Tubes {
  const copy = (tube: TubeState): TubeState => ({
    ...tube,
    layers: tube.layers.map((layer) => ({ ...layer })),
    contents: tube.contents.map((content) => ({ ...content })),
    reagents: tube.reagents ? { ...tube.reagents } : undefined,
    column: tube.column ? { ...tube.column } : undefined,
  });
  return { A: copy(tubes.A), B: copy(tubes.B), C: copy(tubes.C) };
}

const fresh = (expId: ExpId = DEFAULT_EXP): LabData => {
  const exp = EXPERIMENTS[expId];
  return {
  mode: 'guided',
  completedRun: null,
  storageTemperature: -20,
  customBalanceVolume: 0,
  freeDryMinutes: {},
  freeSampleConcentration: 0,
  freeSampleFlags: null,
  expId,
  exp,
  steps: exp.steps,
  stages: exp.stages,
  stepIndex: 0,
  progress: {},
  ppe: { coat: false, gloves: false, goggles: false },
  held: null,
  focus: 'A',
  pipettes: {
    P20: { volume: 10, tip: null, load: null },
    P200: { volume: 100, tip: null, load: null },
    P1000: { volume: 1000, tip: null, load: null },
  },
  tubes: exp.initialTubes(),
  flags: freshFlags(),
  modal: null,
  busy: false,
  toasts: [],
  log: [],
  mistakes: [],
  simTime: 9 * 60,
  startedAt: Date.now(),
  finishedAt: null,
  anim: { kind: null, key: 0 },
  rotor: Array(12).fill(null),
  spin: { speed: 5000, time: 1, temp: 22 },
  spinState: 'idle',
  heatSet: { temp: 37, time: 10 },
  nano: { loaded: null, blanked: false, result: null },
  };
};

export function computeResult(f: Flags, expId: ExpId = 'exp1'): NanoResult {
  let conc: number;
  let r280 = 1.87 + (Math.random() - 0.5) * 0.04;
  let r230 = 2.14 + (Math.random() - 0.5) * 0.08;
  const yieldOf = f.te || f.eluted || 50;

  if (expId === 'exp2') {
    conc = 74 * (f.transferred / 300) * (50 / yieldOf);
    if (f.protein) r280 -= 0.3;
    if (f.salt) r230 -= 0.72;
    if (f.overdried) conc *= 0.62;
  } else if (expId === 'exp3') {
    conc = 96 * (f.transferred / 700) * (50 / yieldOf);
    if (f.protein) r280 -= 0.26;
    if (f.etohCarry) r230 -= 0.85;
    if (f.overdried) conc *= 0.55;
  } else {
    conc = 82 * (f.transferred / 400) * (50 / yieldOf);
    if (f.interphase) {
      r280 -= 0.27;
      r230 -= 0.38;
      conc *= 1.12;
    }
    if (f.phenol) {
      r280 -= 0.21;
      r230 -= 0.78;
      conc *= 1.25;
    }
    if (f.overdried) conc *= 0.62;
  }
  conc *= 1 + (Math.random() - 0.5) * 0.08;
  conc = Math.round(conc * 10) / 10;
  const a260 = conc / 50;
  return { conc, a260, a280: a260 / r280, a230: a260 / r230, r280, r230 };
}

let uid = 1;
const isTube = (x: string): x is TubeId => x === 'A' || x === 'B' || x === 'C';

export const useLab = create<LabState>()((set, get) => {
  /* ---------- helpers ---------- */
  const pushToast = (kind: ToastKind, title: string, text?: string, penalty = 0) => {
    const s = get();
    if (s.mode === 'free') penalty = 0;
    if ((kind === 'mistake' || kind === 'warning') && s.toasts.some((toast) => toast.kind === kind && toast.title === title && toast.text === text)) return;
    const id = uid++;
    const step = s.steps[s.stepIndex];
    set({
      toasts: [...s.toasts, { id, kind, title, text, penalty }].slice(-4),
      log: [...s.log, { id, time: s.simTime, kind, text: text ? `${title} — ${text}` : title }].slice(-250),
      mistakes: penalty > 0 ? [...s.mistakes, { id, title, text: text ?? '', penalty, step: step.title }] : s.mistakes,
    });
    if (kind === 'mistake') sfx.mistake();
    else if (kind === 'success') sfx.success();
  };
  const info = (title: string, text?: string) => pushToast('info', title, text);
  const warn = (title: string, text?: string) => pushToast('warning', title, text);
  const mistake = (title: string, text: string, penalty = 5) => pushToast('mistake', title, text, penalty);
  const logAction = (text: string) => {
    const s = get();
    const entry: LogEntry = { id: uid++, time: s.simTime, kind: 'action', text };
    set({ log: [...s.log, entry].slice(-250) });
  };
  const tick = (m: number) => set({ simTime: get().simTime + m });
  const curStep = () => get().steps[get().stepIndex];
  const setPip = (id: PipetteId, patch: Partial<PipetteState>) => {
    const ps = get().pipettes;
    set({ pipettes: { ...ps, [id]: { ...ps[id], ...patch } } });
  };
  const setTube = (id: TubeId, patch: Partial<Tubes[TubeId]>) => {
    const t = get().tubes;
    set({ tubes: { ...t, [id]: { ...t[id], ...patch } } });
  };
  const setProgress = (patch: Progress) => set({ progress: { ...get().progress, ...patch } });

  const advance = () => {
    const s = get();
    const next = s.stepIndex + 1;
    if (next >= s.steps.length) {
      const finishedAt = Date.now();
      const tubes = copyTubes(s.tubes);
      const dnaId = (['B', 'C', 'A'] as TubeId[]).find((id) => tubes[id].hasDNA && tubes[id].location !== 'disposed');
      if (dnaId) {
        const t = tubes[dnaId];
        const solvent = t.contents.some((c) => c.name === REAGENTS.water.name) ? 'water' : 'te';
        t.dnaNg = 4100 * (s.flags.transferred / 400) * (s.flags.overdried ? 0.62 : 1);
        t.reagents = { [solvent]: totalVol(t) };
      }
      set({
        mode: 'free', modal: 'report', finishedAt, tubes, held: null,
        completedRun: {
          flags: { ...s.flags }, tubes: copyTubes(tubes),
          result: s.nano.result ? { ...s.nano.result } : null,
          mistakes: s.mistakes.map((item) => ({ ...item })), simTime: s.simTime, startedAt: s.startedAt, finishedAt,
          storageTemperature: s.storageTemperature,
        },
      });
      return;
    }
    const ns = s.steps[next];
    set({
      stepIndex: next,
      progress: {},
      modal: ns.kind === 'quiz' ? 'quiz' : ns.kind === 'phaseQuiz' ? 'phaseQuiz' : null,
    });
    check();
  };

  const check = () => {
    const s = get();
    if (s.mode === 'free') return;
    const step = s.steps[s.stepIndex];
    if (s.progress.completed) return;
    if (isStepDone(step, s)) {
      setProgress({ completed: true });
      pushToast('success', 'Step complete', step.title);
      const run = s.startedAt;
      const idx = s.stepIndex;
      window.setTimeout(() => {
        const now = get();
        if (now.mode === 'guided' && now.startedAt === run && now.stepIndex === idx && now.screen === 'lab') advance();
      }, 1100);
    }
  };

  /* ---------- PPE ---------- */
  const equip = (obj: string) => {
    const k = obj.slice(4) as 'coat' | 'gloves' | 'goggles';
    const s = get();
    const name = OBJECT_INFO[obj]?.name ?? k;
    if (s.ppe[k]) {
      info(`Already wearing: ${name}`);
      return;
    }
    set({ ppe: { ...s.ppe, [k]: true } });
    sfx.pick();
    logAction(`Put on: ${name}`);
    if (k === 'gloves' && !s.ppe.coat) info('Pro tip', 'Put the coat on first, then pull the gloves over the cuffs.');
    check();
  };

  /* ---------- empty hands ---------- */
  const clickEmpty = (obj: string) => {
    const s = get();
    if (obj.startsWith('pipette-')) {
      const id = obj.slice(8) as PipetteId;
      set({ held: { kind: 'pipette', id } });
      sfx.pick();
      logAction(`Picked up the ${id}`);
      return;
    }
    if (obj.startsWith('tube-')) {
      const id = obj.slice(5) as TubeId;
      if (s.tubes[id].location === 'disposed') return;
      set({ held: { kind: 'tube', id }, focus: id, progress: { ...s.progress, picked: true } });
      sfx.pick();
      logAction(`Picked up Tube ${id}`);
      check();
      return;
    }
    if (obj.startsWith('reagent-')) {
      const r = REAGENTS[obj.slice(8) as ReagentId];
      info(r.name, `${r.detail}. Pick up a pipette to transfer it.`);
      return;
    }
    if (obj === 'heatblock') return set({ modal: 'heat' });
    if (obj === 'centrifuge') return set({ modal: 'centrifuge' });
    if (obj === 'nanodrop') return set({ modal: 'nanodrop' });
    if (obj === 'freezer' && (['A', 'B', 'C'] as const).some((id) => s.tubes[id].location === 'freezer')) return set({ modal: 'freezer' });
    if (obj.startsWith('tips-')) {
      info('Pick up a pipette first', 'Then press it firmly into a tip of the matching size.');
      return;
    }
    const o = OBJECT_INFO[obj];
    if (o) info(o.name, o.desc);
  };

  /* ---------- pipetting ---------- */
  const volumeError = (id: PipetteId, vol: number, v: { min: number; max: number; ideal: number }) =>
    mistake(
      'Check your volume',
      `The ${id} is set to ${vol} µL, but this step needs ${v.ideal} µL (acceptable ${v.min}–${v.max} µL). Adjust the volume before aspirating.`,
    );

  const aspirateReagent = (r: ReagentId, id: PipetteId) => {
    const s = get();
    const p = s.pipettes[id];
    const step = curStep();
    const R = REAGENTS[r];
    if (!p.tip) return warn('Attach a tip first', 'Never dip the bare pipette shaft into a reagent: it contaminates both.');
    if (p.load) return info('Tip already full', `You are holding ${p.load.volume} µL of ${p.load.label}. Dispense it first.`);
    if (p.tip === 'used')
      return mistake(
        'Contamination!',
        `You were about to put a used tip into the ${R.name} stock. Always eject the old tip and attach a fresh one.`,
      );
    if (s.mode === 'free') {
      setPip(id, { load: { source: r, label: R.name, volume: p.volume, color: R.color, dnaNg: 0 } });
      sfx.aspirate();
      tick(0.3);
      logAction(`Free lab: aspirated ${p.volume} µL of ${R.name}`);
      return;
    }
    if (step.kind !== 'pipette') return warn('Not now', 'No reagent is needed for this step. Check the protocol.');
    if (!isAcceptedSource(step, r)) return mistake('Wrong reagent', `This step needs ${step.sourceLabel}, not ${R.name}.`);
    const v = step.vol(snap(s));
    if (p.volume < v.min || p.volume > v.max) return volumeError(id, p.volume, v);
    if (step.hood && step.target !== 'nanodrop' && s.tubes[step.target].location !== 'hood')
      return mistake('Use the fume hood!', 'Phenol may only be handled inside the fume hood. Move your tube into the hood first.', 10);
    setPip(id, { load: { source: r, label: R.name, volume: p.volume, color: R.color } });
    sfx.aspirate();
    tick(0.3);
    logAction(`Aspirated ${p.volume} µL of ${R.name}`);
    if (step.best !== id)
      info(
        'Accuracy tip',
        `The ${step.best} would be more accurate for ${v.ideal} µL. Pipettes are least accurate at the bottom of their range.`,
      );
  };

  const aspirateTube = (tid: TubeId, id: PipetteId) => {
    const s = get();
    const p = s.pipettes[id];
    const step = curStep();
    if (!p.tip) return warn('Attach a tip first', 'Never touch a sample with the bare pipette shaft.');
    if (s.mode === 'free') {
      const tube = s.tubes[tid];
      if (p.load) return info('Tip already loaded', 'Dispense the liquid before drawing more.');
      if (p.volume > totalVol(tube)) return warn('Not enough liquid', `Tube ${tid} contains ${totalVol(tube)} µL. Set a smaller volume.`);
      const result = drawLiquid(tube, p.volume);
      setTube(tid, result.tube);
      setPip(id, { load: result.load });
      set({ focus: tid });
      if (result.load.layers?.some((l) => l.key === 'interphase' || l.key === 'organic')) {
        set({ flags: { ...get().flags, interphase: true, phenol: true } });
        warn('Lower layer carried over', 'Your draw reached the protein / organic boundary. The practice sample will be contaminated.');
      }
      sfx.aspirate();
      logAction(`Free lab: drew ${p.volume} µL from Tube ${tid}`);
      return;
    }
    if (step.kind !== 'pipette' || step.source !== tid) {
      if (step.kind === 'pipette' && step.target === tid)
        return info('Other way round', `First aspirate ${step.sourceLabel}, then dispense it into ${step.targetLabel}.`);
      return warn('Not now', `There is no reason to draw liquid out of Tube ${tid} at this step.`);
    }
    if (p.tip === 'used')
      return mistake('Cross-contamination!', 'Never reuse a tip between different liquids. Eject it and attach a fresh one.');
    const v = step.vol(snap(s));
    if (p.volume < v.min || p.volume > v.max) return volumeError(id, p.volume, v);
    if (step.precision) {
      set({ modal: 'aspirate', focus: tid });
      return;
    }
    const t = s.tubes[tid];
    setPip(id, {
      load: {
        source: tid,
        label: tid === 'B' ? 'DNA sample' : `Tube ${tid} sample`,
        volume: p.volume,
        color: t.layers[t.layers.length - 1]?.color ?? COLORS.clear,
      },
    });
    set({ focus: tid });
    sfx.aspirate();
    logAction(`Aspirated ${p.volume} µL from Tube ${tid}`);
  };

  const dispenseTube = (tid: TubeId, id: PipetteId) => {
    const s = get();
    const p = s.pipettes[id];
    const load = p.load;
    const step = curStep();
    if (!load) return;
    if (s.mode === 'free') {
      if (totalVol(s.tubes[tid]) + load.volume > 1500) return warn('Tube capacity', 'A 1.5 mL tube cannot take that volume. Use another tube or reduce the volume.');
      setTube(tid, addLiquid(s.tubes[tid], load));
      setPip(id, { load: null, tip: 'used' });
      set({ focus: tid });
      if (load.source === 'pci' && s.tubes[tid].location !== 'hood') warn('Fume hood reminder', 'Handle phenol:chloroform inside the hood. Your virtual practice continues, but this is unsafe in a real lab.');
      if (load.source === 'water' || load.source === 'te') set({ flags: { ...get().flags, te: totalVol(get().tubes[tid]) } });
      sfx.dispense();
      tick(0.5);
      logAction(`Free lab: added ${load.volume} µL ${load.label} to Tube ${tid}`);
      return;
    }
    if (step.kind !== 'pipette' || !isAcceptedSource(step, load.source))
      return warn('Hold on', 'This liquid is not part of the current step. Discard it into the waste.');
    if (tid === load.source) return info('Same tube', 'You are trying to dispense back into the tube you drew from.');
    if (step.target !== tid) return mistake('Wrong tube', `${load.label} goes into ${step.targetLabel}, not Tube ${tid}.`);
    const t = s.tubes[tid];
    const cap = step.capacity ?? (t.column ? 750 : 1500);
    if (totalVol(t) + load.volume > cap)
      return mistake(
        t.column ? 'Column overloaded!' : 'Overflow!',
        t.column
          ? `A silica membrane can only take about ${cap} µL. In a real lab you would load it in more than one pass; overloading floods the membrane and the DNA is lost into the flow-through.`
          : 'That would overfill the 1.5 mL tube. Check the volume you are adding.',
      );
    if (t.column && t.location === 'seated' && load.source !== step.source)
      return mistake('Wrong liquid', `${load.label} does not belong on the membrane at this step.`);
    const res = step.apply ? step.apply(s.tubes, load.volume, s.flags) : { tubes: s.tubes };
    if (step.alternativeSources?.includes(load.source as ReagentId) && step.altLayerKey) {
      const tube = { ...res.tubes[tid] };
      tube.layers = tube.layers.map((l) => (l.key === step.altLayerKey ? { ...l, label: load.label } : l));
      if (tube.contents.length)
        tube.contents = tube.contents.map((c, i) => (i === tube.contents.length - 1 ? { ...c, name: load.label } : c));
      res.tubes = { ...res.tubes, [tid]: tube };
    }
    set({
      tubes: { ...res.tubes, [tid]: { ...res.tubes[tid], lidOpen: true } },
      flags: { ...s.flags, ...(res.flags ?? {}) },
      focus: tid,
      pipettes: { ...s.pipettes, [id]: { ...p, load: null, tip: 'used' } },
      progress: { ...s.progress, dispensed: true },
    });
    sfx.dispense();
    tick(0.5);
    logAction(`Dispensed ${load.volume} µL of ${load.label} into Tube ${tid}`);
    window.setTimeout(() => setTube(tid, { lidOpen: false }), 900);
    check();
  };

  const dispenseNano = (id: PipetteId) => {
    const s = get();
    const p = s.pipettes[id];
    const load = p.load;
    const step = curStep();
    if (!load) return;
    if (s.mode === 'free') {
      if (load.volume < 1 || load.volume > 2) return warn('Micro-volume pedestal', 'Load 1-2 µL using the P20.');
      const blank = load.source === 'te' || load.source === 'water';
      setPip(id, { load: null, tip: 'used' });
      set({
        nano: { ...s.nano, loaded: blank ? 'blank' : 'sample', result: null },
        freeSampleConcentration: (load.dnaNg ?? 0) / load.volume,
        freeSampleFlags: { ...s.flags },
        modal: 'nanodrop',
      });
      sfx.dispense();
      logAction(`Free lab: loaded ${load.volume} µL of ${load.label} onto the spectrophotometer`);
      return;
    }
    if (step.kind !== 'pipette' || step.target !== 'nanodrop' || load.source !== step.source)
      return warn('Not now', 'The spectrophotometer is used in the final quality-control stage.');
    const res = step.apply ? step.apply(s.tubes, load.volume, s.flags) : { tubes: s.tubes };
    set({
      tubes: res.tubes,
      pipettes: { ...s.pipettes, [id]: { ...p, load: null, tip: 'used' } },
      progress: { ...s.progress, dispensed: true },
      nano: { ...s.nano, loaded: step.instrument === 'blank' ? 'blank' : 'sample' },
    });
    sfx.dispense();
    logAction(`Loaded ${load.volume} µL of ${load.label} onto the spectrophotometer pedestal`);
    info('Drop loaded', `Now click the spectrophotometer and press ${step.instrument === 'blank' ? 'Blank' : 'Measure'}.`);
    check();
  };

  const clickPipette = (obj: string, id: PipetteId) => {
    const s = get();
    const p = s.pipettes[id];
    if (obj === 'stand' || obj === `pipette-${id}`) return get().returnPipette();
    if (obj.startsWith('pipette-')) {
      const other = obj.slice(8) as PipetteId;
      if (p.load || p.tip) return info('Hands full', `Eject the tip from the ${id} before swapping pipettes.`);
      set({ held: { kind: 'pipette', id: other } });
      sfx.pick();
      logAction(`Swapped the ${id} for the ${other}`);
      return;
    }
    if (obj.startsWith('tips-')) {
      const size = obj.slice(5) as TipSize;
      if (p.tip) return info('Tip already attached', 'Eject it first if you need a fresh one.');
      if (TIPS[size].fits !== id)
        return warn("Those tips don't fit", `The ${id} takes ${TIPS[PIPETTES[id].tip].label}. Each pipette size has its own tips.`);
      setPip(id, { tip: 'fresh' });
      sfx.tip();
      logAction(`Attached a fresh tip to the ${id}`);
      return;
    }
    if (obj.startsWith('reagent-')) return aspirateReagent(obj.slice(8) as ReagentId, id);
    if (obj.startsWith('tube-')) {
      const tid = obj.slice(5) as TubeId;
      return p.load ? dispenseTube(tid, id) : aspirateTube(tid, id);
    }
    if (obj === 'nanodrop') {
      if (p.load) return dispenseNano(id);
      return set({ modal: 'nanodrop' });
    }
    if (obj === 'tipwaste') return get().ejectTip();
    if (obj === 'liquidwaste' || obj === 'hazwaste') {
      if (!p.load) return info(OBJECT_INFO[obj].name, 'Nothing in the tip to discard.');
      const src = p.load.source;
      if (isTube(src) && s.mode !== 'free') {
        setPip(id, { load: null });
        return mistake('You discarded your DNA!', 'That liquid was your DNA sample. This is a simulation, so you can draw it up again.');
      }
      if (src === 'pci' && obj === 'liquidwaste') {
        setPip(id, { load: null });
        return mistake('Wrong waste stream', 'Phenol:chloroform must go into the halogenated organic waste, never the general liquid waste.');
      }
      logAction(`Discarded ${p.load.volume} µL of ${p.load.label}`);
      setPip(id, { load: null });
      sfx.dispense();
      return;
    }
    if (obj === 'heatblock') return set({ modal: 'heat' });
    if (obj === 'centrifuge') return set({ modal: 'centrifuge' });
    if (obj.startsWith('rack-')) return info('Click a tube', 'To pipette, click the tube itself, not the rack.');
    info('Free your hand first', 'Return the pipette to the stand (eject the tip first) before doing that.');
  };

  /* ---------- carrying a tube ---------- */
  const placeTube = (loc: 'bench' | 'hood') => {
    const s = get();
    if (s.held?.kind !== 'tube') return;
    const tid = s.held.id;
    set({ tubes: { ...s.tubes, [tid]: { ...s.tubes[tid], location: loc } }, held: null });
    sfx.place();
    tick(0.1);
    logAction(`Placed Tube ${tid} in the ${loc === 'hood' ? 'fume hood rack' : 'bench rack'}`);
    check();
  };

  const clickTube = (obj: string, tid: TubeId) => {
    const s = get();
    const t = s.tubes[tid];
    const step = curStep();
    if (obj === 'rack-bench') {
      if (tid === 'C' && t.column) return info('Not here', 'Click the column holder to put the spin column down.');
      return placeTube('bench');
    }
    if (obj === 'rack-hood') {
      if (tid === 'C' && t.column) return info('Not here', 'The silica column stays in its holder, not the hood rack.');
      return placeTube('hood');
    }
    if (obj === 'columnStand')
      return tid === 'C' && t.column
        ? set({ tubes: { ...s.tubes, C: { ...t, location: 'columnStand' } }, held: null })
        : info('Not here', 'That holder is for the silica spin column.');
    if (obj.startsWith('tube-')) {
      const oid = obj.slice(5) as TubeId;
      const other = s.tubes[oid];
      if (step.kind === 'seat' && step.tube === tid && oid === step.into) {
        set({
          tubes: { ...s.tubes, [tid]: { ...t, location: 'seated', column: t.column ? { ...t.column, flowThrough: 0 } : undefined }, [oid]: { ...other, location: 'column' } },
          held: null,
          progress: { ...s.progress, done: true },
        });
        sfx.place();
        logAction(`Seated the spin column in Tube ${oid}`);
        check();
        return;
      }
      if (other.location === 'bench' || other.location === 'hood' || other.location === 'columnStand') {
        if (tid === 'C') return info('Not here', 'Click Tube B to seat the column in it.');
        return placeTube(other.location === 'columnStand' ? 'bench' : other.location);
      }
      return info('One at a time', `Put ${tid === 'C' ? 'the column' : `Tube ${tid}`} down first.`);
    }
    const setLoc = (loc: LocationId) => ({ ...s.tubes, [tid]: { ...t, location: loc } });
    const doDiscard = (target: string): boolean => {
      if (step.kind !== 'discard' || step.tube !== tid) return false;
      const want = step.to;
      if (target !== want) {
        const where =
          step.to === 'hazwaste' ? 'the halogenated organic waste' : step.to === 'plastics' ? 'the plastics waste bin' : 'the liquid waste beaker';
        mistake('Wrong waste stream', `This belongs in ${where}. Segregating waste correctly is part of the method.`);
        return true;
      }
      set({
        tubes: { ...s.tubes, [tid]: { ...t, location: 'disposed' } },
        held: null,
        focus: tid === 'A' ? 'B' : tid === 'B' ? 'A' : 'B',
      });
      sfx.place();
      logAction(
        tid === 'C'
          ? 'Disposed of the used spin column in the plastics waste'
          : `Disposed of Tube ${tid} in ${step.to === 'hazwaste' ? 'the halogenated organic waste' : 'the liquid waste'}`,
      );
      check();
      return true;
    };
    if (s.mode === 'free') {
      if (obj === 'heatblock') {
        if (Object.values(s.tubes).some((x) => x.location === 'heatblock' && x.id !== tid)) return warn('Block occupied', 'Retrieve the other tube before loading this one.');
        set({ tubes: setLoc('heatblock'), held: null, focus: tid, modal: 'heat' });
        logAction(`Free lab: placed Tube ${tid} in the heat block`);
        return;
      }
      if (obj === 'centrifuge') return set({ modal: 'centrifuge', focus: tid });
      if (obj === 'freezer') {
        set({ tubes: setLoc('freezer'), held: null, focus: tid, modal: 'freezer' });
        logAction(`Free lab: placed Tube ${tid} in the ${s.storageTemperature} C freezer`);
        return;
      }
      if (obj === 'liquidwaste' || obj === 'hazwaste') {
        const organic = (t.reagents?.pci ?? 0) > 0;
        if (organic && obj !== 'hazwaste') warn('Hazardous solvent', 'Phenol/chloroform belongs in halogenated organic waste.');
        if (t.hasDNA && !t.pellet) warn('DNA was in the liquid', 'You discarded dissolved DNA. You can prepare a fresh sample without changing your completed result.');
        setTube(tid, decantLiquid(t));
        logAction(`Free lab: poured the liquid from Tube ${tid} into ${obj}`);
        sfx.dispense();
        return;
      }
      if (obj === 'plastics') {
        set({ tubes: setLoc('disposed'), held: null });
        logAction(`Free lab: discarded Tube ${tid}`);
        return;
      }
    }
    switch (obj) {
      case 'heatblock':
        if (step.kind === 'heat' && step.tube === tid) {
          set({ tubes: setLoc('heatblock'), held: null, modal: 'heat' });
          sfx.place();
          logAction(`Placed Tube ${tid} in the heat block`);
          return;
        }
        return info('Not now', 'No incubation is needed at this step.');
      case 'centrifuge':
        if (step.kind === 'spin' && step.tube === tid) return set({ modal: 'centrifuge' });
        return info('Not now', 'No centrifugation is needed at this step.');
      case 'freezer':
        if (step.kind === 'freeze' && step.tube === tid) {
          set({ tubes: setLoc('freezer'), held: null, modal: 'freezer' });
          sfx.place();
          return;
        }
        if (step.kind === 'store' && step.tube === tid) {
          set({ tubes: setLoc('freezer'), held: null, progress: { ...s.progress, done: true } });
          sfx.place();
          logAction(`Stored Tube ${tid} in the ${s.storageTemperature} C freezer`);
          check();
          return;
        }
        return info('Not now', 'The freezer is not needed at this step.');
      case 'liquidwaste':
        if (doDiscard(obj)) return;
        if (step.kind === 'decant' && step.tube === tid) {
          const res = step.apply(s.tubes, 0, s.flags);
          set({ tubes: res.tubes, flags: { ...s.flags, ...(res.flags ?? {}) }, progress: { ...s.progress, done: true } });
          sfx.dispense();
          tick(0.5);
          logAction(
            tid === 'C'
              ? 'Emptied the collection tube into the liquid waste'
              : `Decanted the supernatant of Tube ${tid} into the liquid waste`,
          );
          check();
          return;
        }
        if (t.hasDNA || tid === 'A')
          return mistake(
            'Stop! You would lose your sample',
            `Tube ${tid} still contains ${t.hasDNA ? 'your DNA' : 'your sample'}. Pouring it away would end the experiment.`,
          );
        return info('Empty tube', 'There is nothing to pour out.');
      case 'tipwaste':
      case 'hazwaste':
      case 'plastics':
        if (doDiscard(obj)) return;
        return mistake(
          'Stop! You would lose your sample',
          `Tube ${tid} still holds ${tid === 'B' ? 'your DNA' : 'material you need'}. Do not throw it away.`,
        );
      default:
        if (obj.startsWith('pipette-') || obj === 'stand' || obj.startsWith('tips-') || obj.startsWith('reagent-'))
          return info('Free your hand', 'Put the tube in a rack before you pipette. Clicking a rack puts it down.');
        if (obj === 'nanodrop') return info('Use a pipette', 'Samples are loaded onto the pedestal with a P20 (2 µL).');
        return info('Not here', 'Put the tube in one of the racks.');
    }
  };

  /* ================= store ================= */
  return {
    ...fresh(),
    screen: 'intro',
    hints: true,
    sound: true,

    setScreen: (screen) => set({ screen }),
    selectExp: (id) => {
      if (!(id in EXPERIMENTS)) return;
      set({ ...fresh(id), screen: 'briefing' });
    },
    chooseProtection: (method) => {
      const s = get();
      const step = curStep();
      if (s.mode !== 'guided' || s.busy || s.modal || step.id !== 'dnase-protection' || s.progress.completed || s.progress.dispensed) return;
      if (s.held) return info('Free your hands first', 'Return the tube or pipette before changing the DNase-protection option.');
      const steps = [...s.steps];
      steps[s.stepIndex] = dnaseProtectionStep(method);
      set({ steps, progress: {}, heatSet: method === 'heat' ? { temp: 65, time: 10 } : s.heatSet });
      logAction(`Selected ${method === 'heat' ? 'heating' : 'EDTA chelation'} for DNase protection (common step 2)`);
    },
    startLab: (id) => {
      const requested = id ?? get().expId;
      const expId: ExpId = requested in EXPERIMENTS ? requested : 'exp1';
      set({ ...fresh(expId), screen: 'lab', startedAt: Date.now() });
      info('Welcome to the lab', `Experiment ${EXPERIMENTS[expId].n}: ${EXPERIMENTS[expId].title}. Start by putting on your PPE.`);
    },
    enterFreeLab: () => {
      const s = get();
      if (!s.completedRun) return;
      const firstEntry = !s.log.some((entry) => entry.text.startsWith('Free lab is open'));
      set({ mode: 'free', modal: null, busy: false, toasts: [] });
      if (firstEntry) info('Free lab is open', 'Use the equipment in any order. Your picture stays as a reference; your completed result is saved.');
    },
    resetPracticeBench: () => {
      const s = get();
      if (s.mode !== 'free' || s.busy) return;
      const practice = fresh(s.expId);
      practice.tubes.A.dnaNg = 4100;
      practice.tubes.C = { ...practice.tubes.C, name: 'Tube C - practice', location: 'bench', layers: [], contents: [], hasDNA: false, dnaNg: 0 };
      set({
        tubes: practice.tubes, flags: practice.flags, pipettes: practice.pipettes, held: null, focus: 'A',
        modal: null, rotor: practice.rotor, spinState: 'idle', nano: practice.nano,
        freeDryMinutes: {}, freeSampleConcentration: 0, freeSampleFlags: null, progress: {},
      });
      logAction('Free lab: reset practice bench with a fresh sample; saved experiment report unchanged.');
    },
    freshPracticeTube: (id, sample = false) => {
      const s = get();
      if (s.mode !== 'free' || s.busy || s.held || s.rotor.includes(id)) return warn('Free your hands first', 'Return the item you are holding and remove any tube from the rotor before replacing it.');
      const tube = EXPERIMENTS[s.expId].initialTubes().A;
      setTube(id, {
        ...tube, id, name: `Tube ${id} - ${sample ? 'fresh sample' : 'practice'}`, location: 'bench',
        layers: sample ? tube.layers : [], contents: sample ? tube.contents : [],
        dnaNg: sample ? 4100 : 0, hasDNA: false,
      });
      set({ focus: id });
      set({ freeDryMinutes: { ...s.freeDryMinutes, [id]: 0 } });
      logAction(`Free lab: prepared ${sample ? 'a fresh cell sample' : 'an empty tube'} in Tube ${id}`);
    },
    retrieveTube: (id) => {
      const s = get();
      if (s.mode !== 'free' || s.busy) return;
      if (s.held) return info('Free your hands first', 'Return the pipette or tube you are holding before retrieving another one.');
      if (s.tubes[id].location !== 'freezer' && s.tubes[id].location !== 'heatblock') return;
      setTube(id, { location: 'bench' });
      set({ focus: id });
      logAction(`Free lab: retrieved Tube ${id} to the bench rack`);
    },
    setStorageTemperature: (temperature) => { if (!get().busy) set({ storageTemperature: temperature }); },
    prepareMatchingBalance: () => {
      const s = get();
      if (s.busy) return;
      const sample = s.rotor.find((x) => x && isTube(x));
      if (!sample) return info('Load your sample first', 'Then prepare a balance with the same total mass.');
      const volume = Math.max(0, rotorMass(s, sample) - TARE.tube);
      set({ customBalanceVolume: volume });
      logAction(`Prepared a matching balance containing ${volume} µL water`);
    },
    exitLab: () => set({ screen: 'intro', modal: null, held: null }),
    toggleHints: () => set({ hints: !get().hints }),
    toggleSound: () => {
      const on = !get().sound;
      setSoundEnabled(on);
      set({ sound: on });
    },

    click: (obj) => {
      const s = get();
      if (s.modal || s.busy) return;
      if (obj.startsWith('ppe-')) return equip(obj);
      if (!(s.ppe.coat && s.ppe.gloves && s.ppe.goggles))
        return warn('Safety first!', 'Put on your lab coat, gloves and goggles at the PPE station before you handle anything.');
      if (!s.held) return clickEmpty(obj);
      if (s.held.kind === 'pipette') return clickPipette(obj, s.held.id);
      return clickTube(obj, s.held.id);
    },

    setPipetteVolume: (v) => {
      const s = get();
      if (s.held?.kind !== 'pipette') return;
      const id = s.held.id;
      const P = PIPETTES[id];
      if (s.pipettes[id].load) return info('Liquid in the tip', 'Do not change the volume while the tip holds liquid.');
      const val = clamp(Math.round(v / P.step) * P.step, P.min, P.max);
      setPip(id, { volume: val });
    },

    ejectTip: () => {
      const s = get();
      if (s.held?.kind !== 'pipette') return;
      const id = s.held.id;
      const p = s.pipettes[id];
      if (!p.tip) return info('No tip', 'There is no tip on the pipette.');
      if (p.load) info('Tip discarded with liquid', `${p.load.volume} µL of ${p.load.label} went into the tip waste.`);
      set({
        pipettes: { ...s.pipettes, [id]: { ...p, tip: null, load: null } },
        progress: s.progress.dispensed ? { ...s.progress, tipEjected: true } : s.progress,
      });
      sfx.eject();
      logAction('Ejected the tip into the tip waste');
      check();
    },

    returnPipette: () => {
      const s = get();
      if (s.held?.kind !== 'pipette') return;
      const id = s.held.id;
      const p = s.pipettes[id];
      if (p.load) return info('Dispense first', 'The tip still holds liquid.');
      if (p.tip)
        return info('Eject the tip first', 'Never return a pipette to the stand with a tip on. Liquid can run back into the shaft.');
      set({ held: null });
      sfx.place();
      logAction(`Returned the ${id} to the stand`);
      check();
    },

    tubeAction: (a) => {
      const s = get();
      if (s.modal || s.busy) return;
      if (s.held?.kind !== 'tube') return info('Pick up a tube first');
      const tid = s.held.id;
      const t = s.tubes[tid];
      const step = curStep();
      if (a === 'collect') {
        if (step.kind !== 'recover' || step.tube !== tid || s.progress.done || s.mode !== 'guided') return;
        if (t.location !== 'seated' || !(t.column?.bound) || s.tubes[step.into].location !== 'column') return info('Seat the DNA-bound column first', `The column must be in clean Tube ${step.into} before collecting the schematic DNA fraction.`);
        const res = step.apply(s.tubes, 0, s.flags);
        set({ tubes: res.tubes, flags: { ...s.flags, ...(res.flags ?? {}) }, focus: step.into, progress: { ...s.progress, done: true } });
        logAction(`Modelled the notes' recovery arrow: DNA from silica to Tube ${step.into}; solution conditions are not specified in the notes.`);
        sfx.dispense();
        check();
        return;
      }
      if (a === 'putback') {
        if (tid === 'C' && t.column) return clickTube('columnStand', tid);
        return placeTube(t.location === 'hood' ? 'hood' : 'bench');
      }
      if (a === 'dry') {
        if (s.mode === 'free' || (step.kind === 'dry' && step.tube === tid)) {
          set({ tubes: { ...s.tubes, [tid]: { ...t, location: 'bench', lidOpen: true } }, held: null, focus: tid, modal: 'dry' });
          return;
        }
        return info('Not now', 'Air-drying comes after the wash.');
      }
      set({ anim: { kind: a === 'spool' ? null : a, key: s.anim.key + 1 } });
      if (a === 'spool') {
        if (step.kind === 'spool' && step.tube === tid) {
          set({ modal: 'spool', focus: tid });
          return;
        }
        return info('Not now', 'Spooling only works once the DNA has precipitated at the ethanol interface.');
      }
      if (a === 'vortex') {
        if (t.hasDNA || t.layers.length > 1) {
          set({ flags: { ...get().flags, vortexed: true } });
          return mistake(
            'Vortexing shears DNA!',
            'The violent swirling of a vortex mixer breaks long genomic DNA into short fragments. Mix genomic DNA by gentle inversion or flicking.',
          );
        }
        return info('Vortexed', 'Vortexing is harmless before the cells are lysed, but the protocol asks for gentle inversion.');
      }
      sfx.invert();
      if (s.mode === 'free') {
        setTube(tid, mixLiquid(t));
        tick(0.1);
        logAction(`Free lab: ${a === 'flick' ? 'flicked' : 'inverted'} Tube ${tid}`);
        return;
      }
      if (step.kind === 'mix' && step.tube === tid) {
        if (step.method !== a)
          return info(
            a === 'invert' ? 'Try flicking' : 'Try inverting',
            `This step calls for ${step.method === 'invert' ? 'gentle inversion' : 'gentle flicking'}.`,
          );
        if (s.progress.done) return;
        const count = (s.progress.count ?? 0) + 1;
        if (count >= step.count) {
          const res = step.apply(s.tubes, 0, s.flags);
          set({ tubes: res.tubes, flags: { ...s.flags, ...(res.flags ?? {}) }, progress: { ...s.progress, count, done: true } });
          tick(1);
          logAction(`${a === 'invert' ? 'Inverted' : 'Flicked'} Tube ${tid} ${count} times`);
          check();
          return;
        }
        set({ progress: { ...s.progress, count } });
      }
    },

    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    openModal: (m) => set({ modal: m }),
    closeModal: () => {
      if (get().busy) return;
      set({ modal: null, spinState: get().spinState === 'imbalance' ? 'idle' : get().spinState });
    },

    /* ---------- centrifuge ---------- */
    rotorClick: (i, item) => {
      const s = get();
      if (s.spinState === 'running') return;
      const rotor = [...s.rotor];
      const cur = rotor[i];
      if (cur) {
        if (isTube(cur)) {
          if (s.held) return info('Hands full', 'Free your hands before taking the tube out.');
          rotor[i] = null;
          set({
            rotor,
            held: { kind: 'tube', id: cur },
            tubes: { ...s.tubes, [cur]: { ...s.tubes[cur], location: 'bench' } },
            spinState: 'idle',
          });
          return;
        }
        rotor[i] = null;
        set({ rotor, spinState: 'idle' });
        return;
      }
      if (item === 'held') {
        if (s.held?.kind !== 'tube') return info('Nothing to load', 'Carry a tube to the centrifuge first.');
        const tid = s.held.id;
        const step = curStep();
        if (s.mode !== 'free' && !(step.kind === 'spin' && step.tube === tid)) return info('Not now', 'No centrifugation is needed at this step.');
        rotor[i] = tid;
        set({
          rotor,
          held: null,
          tubes: { ...s.tubes, [tid]: { ...s.tubes[tid], location: 'centrifuge' } },
          progress: { ...s.progress, loaded: true },
          spinState: 'idle',
        });
        sfx.place();
        logAction(`Loaded Tube ${tid} into rotor slot ${i + 1}`);
        return;
      }
      if (item) {
        const prev = rotor.indexOf(item);
        if (prev >= 0) rotor[prev] = null;
        rotor[i] = item;
        set({ rotor, spinState: 'idle' });
        sfx.place();
      }
    },
    setSpin: (patch) => { if (!get().busy) set({ spin: { ...get().spin, ...patch } }); },
    startSpin: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (!s.rotor.some((x) => x && isTube(x))) {
          info('Load a tube', 'Choose the tube you are carrying, then click an empty rotor slot.');
          return false;
        }
        if (rotorImbalance(s).imb > 160) {
          set({ spinState: 'imbalance' });
          warn('Rotor imbalance', 'Use a matching balance directly opposite the sample. The safety interlock still applies in free practice.');
          return false;
        }
        set({ spinState: 'running', busy: true });
        sfx.whirr(4.3);
        return true;
      }
      if (step.kind !== 'spin') {
        info('Nothing to spin', 'No centrifugation is needed at this step.');
        return false;
      }
      const slot = s.rotor.indexOf(step.tube);
      if (slot < 0) {
        info('Load it first', `Put ${itemName(step.tube)} in a rotor slot first.`);
        return false;
      }
      const { imb, count } = rotorImbalance(s);
      if (!step.noBalance && imb > 160) {
        const opp: RotorSlot = s.rotor[(slot + 6) % 12];
        let why: string;
        if (count === 1) why = 'You tried to spin a single item. Every tube needs a partner of equal mass directly opposite.';
        else if (!opp)
          why = `The balance must sit directly opposite your tube (slot ${slot + 1} ↔ slot ${((slot + 6) % 12) + 1}).`;
        else if (opp !== 'A' && opp !== 'B' && opp !== 'C') {
          const bv = rotorMass(s, opp);
          const mine = rotorMass(s, step.tube);
          why = `Your assembly weighs the equivalent of ${mine} µL of water (liquid + plastic) but the balance tube weighs ${bv} µL. The masses must match.`;
        } else why = 'The mass opposite your sample is not a balance tube.';
        set({ spinState: 'imbalance' });
        mistake('Rotor imbalance!', `The centrifuge shakes violently and stops. ${why}`, 10);
        return false;
      }
      const { speed, time, temp } = s.spin;
      if (speed < step.speed[0]) {
        mistake(
          'Speed too low',
          `At ${speed.toLocaleString()} × g ${
            s.tubes[step.tube].column ? 'the liquid will not be pulled through the filter' : 'the DNA will not pellet properly'
          }. Use at least ${step.speed[0].toLocaleString()} × g.`,
        );
        return false;
      }
      if (time < step.time[0]) {
        mistake('Spin too short', `${time} min is not long enough. The protocol calls for ${step.idealTime} min.`);
        return false;
      }
      if (time > step.time[1]) {
        warn('Unnecessarily long', `${step.idealTime} min is enough. Set a shorter time.`);
        return false;
      }
      if (step.temp === 4 && temp !== 4) {
        mistake('Wrong temperature', 'Pellet DNA at 4 °C. The cold keeps it from dissolving again.');
        return false;
      }
      set({ spinState: 'running', busy: true });
      sfx.whirr(4.3);
      return true;
    },
    spoolFiber: () => {
      const st = get();
      const step = st.steps[st.stepIndex];
      if (step.kind !== 'spool') return;
      const n = (st.progress.count ?? 0) + 1;
      if (n >= step.need) {
        set({ flags: { ...st.flags, spooled: n }, progress: { ...st.progress, count: n, done: true } });
        tick(1);
        logAction(`Spooled ${n} DNA fibres onto a glass rod`);
        check();
        return;
      }
      set({ progress: { ...st.progress, count: n }, flags: { ...st.flags, spooled: n } });
    },
    seatColumn: (into) => {
      const st = get();
      const step = st.steps[st.stepIndex];
      if (step.kind !== 'seat') return info('Not now', 'The column is only seated in a fresh tube for elution.');
      set({
        tubes: {
          ...st.tubes,
          [step.tube]: { ...st.tubes[step.tube], location: 'seated' },
          [into]: { ...st.tubes[into], location: 'column' },
        },
        held: null,
      });
    },
    finishSpin: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (s.spinState !== 'running') return;
        const tubes = { ...s.tubes };
        for (const id of s.rotor) if (id && isTube(id)) tubes[id] = spinLiquid(tubes[id]);
        set({ tubes, spinState: 'done', busy: false });
        tick(s.spin.time);
        logAction(`Free lab: centrifuged at ${s.spin.speed} x g for ${s.spin.time} min at ${s.spin.temp} C`);
        sfx.beep();
        return;
      }
      if (step.kind !== 'spin') return;
      const res = step.apply(s.tubes, 0, s.flags);
      set({
        tubes: res.tubes,
        flags: { ...s.flags, ...(res.flags ?? {}) },
        spinState: 'done',
        busy: false,
        progress: { ...s.progress, spun: true },
      });
      tick(s.spin.time + 1);
      sfx.beep();
      logAction(
        `Centrifuged ${step.tube === 'C' ? 'the spin column' : `Tube ${step.tube}`}: ${s.spin.speed.toLocaleString()} × g, ${s.spin.time} min, ${s.spin.temp} °C`,
      );
    },
    removeAfterSpin: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (s.spinState !== 'done') return;
        const tubes = { ...s.tubes };
        const ids = s.rotor.filter((id): id is TubeId => !!id && isTube(id));
        for (const id of ids) tubes[id] = { ...tubes[id], location: 'bench' };
        set({ tubes, rotor: Array(12).fill(null), held: ids[0] ? { kind: 'tube', id: ids[0] } : null, focus: ids[0] ?? s.focus, spinState: 'idle', modal: null });
        return;
      }
      if (step.kind !== 'spin') return;
      const back = s.tubes[step.tube].column ? 'columnStand' : 'bench';
      set({
        rotor: Array(12).fill(null),
        held: { kind: 'tube', id: step.tube },
        focus: step.tube,
        spinState: 'idle',
        modal: null,
        tubes: { ...s.tubes, [step.tube]: { ...s.tubes[step.tube], location: back } },
        progress: { ...s.progress, done: true },
      });
      sfx.pick();
      check();
    },

    /* ---------- heat block ---------- */
    setHeatSet: (patch) => { if (!get().busy) set({ heatSet: { ...get().heatSet, ...patch } }); },
    startHeat: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (!Object.values(s.tubes).some((t) => t.location === 'heatblock')) {
          info('Load the heat block', 'Carry any practice tube to the block.');
          return false;
        }
        set({ busy: true });
        return true;
      }
      if (step.kind !== 'heat') {
        info('Nothing to incubate', 'No incubation is needed at this step.');
        return false;
      }
      if (s.tubes[step.tube].location !== 'heatblock') {
        info('Load the tube', `Carry Tube ${step.tube} to the heat block first.`);
        return false;
      }
      const { temp, time } = s.heatSet;
      if (temp > step.temp[1]) {
        mistake(
          'Check the teaching temperature',
          `For this simulation stage, use ${step.idealTemp} C. The notes do not specify a validated temperature; the virtual control accepts ${step.temp[0]}-${step.temp[1]} C.`,
        );
        return false;
      }
      if (temp < step.temp[0]) {
        mistake(
          'Check the teaching temperature',
          `Use ${step.idealTemp} C for this animation. These are teaching settings, not a claim that every DNase is inactivated at this temperature.`,
        );
        return false;
      }
      if (time < step.time[0]) {
        mistake('Check the teaching timer', `Set ${step.idealTime} min for this virtual stage. The document does not specify a time.`);
        return false;
      }
      set({ busy: true });
      return true;
    },
    finishHeat: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (!s.busy) return;
        const tubes = { ...s.tubes };
        for (const id of ['A', 'B', 'C'] as const) {
          if (tubes[id].location === 'heatblock') tubes[id] = mixLiquid(tubes[id]);
        }
        set({ tubes, busy: false });
        tick(s.heatSet.time);
        logAction(`Free lab: incubated the loaded sample at ${s.heatSet.temp} C for ${s.heatSet.time} min`);
        sfx.beep();
        return;
      }
      if (step.kind !== 'heat') return;
      const res = step.apply(s.tubes, 0, s.flags);
      set({ tubes: res.tubes, flags: { ...s.flags, ...(res.flags ?? {}) }, busy: false, progress: { ...s.progress, done: true } });
      tick(s.heatSet.time);
      sfx.beep();
      logAction(`Incubated Tube ${step.tube} at ${s.heatSet.temp} °C for ${s.heatSet.time} min`);
      check();
    },

    /* ---------- freezer ---------- */
    startFreeze: (min) => {
      const step = curStep();
      if (get().mode === 'free') {
        if (!Object.values(get().tubes).some((t) => t.location === 'freezer')) return false;
        set({ busy: true });
        return true;
      }
      if (step.kind !== 'freeze') return false;
      if (min < step.time[0]) {
        warn('Too short', `Give it at least ${step.time[0]} min. ${step.idealTime} min is typical.`);
        return false;
      }
      set({ busy: true });
      return true;
    },
    finishFreeze: (min) => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        set({ busy: false, modal: null });
        tick(min);
        logAction(`Free lab: chilled stored samples at ${s.storageTemperature} C for ${min} min`);
        sfx.beep();
        return;
      }
      if (step.kind !== 'freeze') return;
      set({
        busy: false,
        modal: null,
        held: { kind: 'tube', id: step.tube },
        focus: step.tube,
        tubes: { ...s.tubes, [step.tube]: { ...s.tubes[step.tube], location: 'bench' } },
        progress: { ...s.progress, done: true },
      });
      tick(min);
      sfx.beep();
      logAction(`Chilled Tube ${step.tube} at −20 °C for ${min} min`);
      check();
    },

    /* ---------- drying ---------- */
    startDry: () => {
      set({ busy: true });
      return true;
    },
    finishDry: (min) => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        const id = s.focus;
        const total = (s.freeDryMinutes[id] ?? 0) + min;
        setTube(id, dryLiquid(s.tubes[id], min));
        set({ busy: false, freeDryMinutes: { ...s.freeDryMinutes, [id]: total } });
        tick(min);
        logAction(`Free lab: air-dried Tube ${id} for ${min} min`);
        if (total > 20 && s.tubes[id].pellet) warn('Over-dried pellet', 'The practice pellet may be difficult to redissolve. Your completed experiment is unchanged.');
        return;
      }
      const id = step.kind === 'dry' ? step.tube : 'B';
      const total = (s.progress.dryMin ?? 0) + min;
      tick(min);
      if (total > 20) {
        set({
          busy: false,
          flags: { ...s.flags, overdried: true, dryMinutes: total },
          tubes: { ...s.tubes, [id]: { ...s.tubes[id], pellet: 'overdry', layers: [] } },
          progress: { ...s.progress, dryMin: total, done: true },
        });
        mistake(
          'Over-dried pellet',
          `After ${total} min the pellet has turned glassy and chalky. It will be hard to dissolve and you will lose yield. 5–10 min is enough.`,
        );
      } else if (total >= 5) {
        set({
          busy: false,
          flags: { ...s.flags, dryMinutes: total },
          tubes: { ...s.tubes, [id]: { ...s.tubes[id], pellet: 'dry', layers: [] } },
          progress: { ...s.progress, dryMin: total, done: true },
        });
        pushToast('info', 'Pellet is dry', 'It is translucent with no ethanol droplets left. Perfect.');
      } else {
        set({ busy: false, progress: { ...s.progress, dryMin: total } });
        warn('Still wet', `After ${total} min there are still ethanol droplets. Dry it a little longer.`);
      }
      logAction(`Air-dried the pellet (${total} min in total)`);
      check();
    },

    /* ---------- precision aspiration ---------- */
    aspirateOutcome: (result, keep) => {
      const s = get();
      if (s.held?.kind !== 'pipette') return;
      const id = s.held.id;
      const p = s.pipettes[id];
      const step = curStep();
      const source: TubeId = step.kind === 'pipette' && (step.source === 'A' || step.source === 'B' || step.source === 'C') ? step.source : 'A';
      if (result === 'ok') {
        const label = s.expId === 'exp2' ? 'Supernatant (DNA)' : 'Aqueous phase (DNA)';
        setPip(id, { load: { source, label, volume: p.volume, color: COLORS.aqueous } });
        set({ modal: null });
        pushToast(
          'success',
          'Clean draw!',
          `${p.volume} µL ${s.expId === 'exp2' ? 'of supernatant collected without disturbing the protein pellet' : 'of aqueous phase collected without touching the interphase'}.`,
        );
        logAction(`Drew ${p.volume} µL from Tube ${source}`);
        return;
      }
      const pelletMode = step.kind === 'pipette' && step.aspireMode === 'pellet';
      const phenolCarry = result === 'organic' && !pelletMode;
      const what = pelletMode
        ? 'the protein pellet'
        : phenolCarry
          ? 'the lower phenol:chloroform phase'
          : 'the white interphase (denatured protein)';
      if (!keep) {
        mistake(
          'Pellet disturbed!',
          `Your tip went into ${what}. You dispensed it back; in a real lab you would re-centrifuge before trying again.`,
        );
        return;
      }
      set({
        flags: {
          ...s.flags,
          protein: s.flags.protein || !phenolCarry,
          salt: s.flags.salt || pelletMode,
          phenol: s.flags.phenol || phenolCarry,
          interphase: s.flags.interphase || result === 'interphase',
        },
        modal: null,
      });
      setPip(id, { load: { source, label: `${step.kind === 'pipette' ? step.sourceLabel : 'sample'} (contaminated)`, volume: p.volume, color: '#eef3f8' } });
      mistake(
        'Contaminated sample',
        `You kept liquid containing ${what}. Protein carried over like this lowers the A260/A280 of your DNA.`,
      );
      logAction(`Drew ${p.volume} µL from Tube ${source}, contaminated with protein from the pellet`);
    },
    airBubble: () => set({ flags: { ...get().flags, airBubbles: get().flags.airBubbles + 1 } }),

    recordMistake: (title, text, penalty) => mistake(title, text, penalty),
    finishQuiz: () => {
      const s = get();
      const step = curStep();
      if (step.kind === 'phaseQuiz') setTube(step.tube, { revealed: true });
      set({ modal: null, progress: { ...get().progress, done: true } });
      void s;
      check();
    },

    /* ---------- spectrophotometer ---------- */
    nanoBlank: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (s.nano.loaded !== 'blank') return info('Load a blank', 'Pipette 1-2 µL of the resuspension buffer or water onto the pedestal.');
        set({ nano: { loaded: null, blanked: true, result: null } });
        logAction('Free lab: blanked the spectrophotometer');
        sfx.beep();
        return;
      }
      if (step.kind !== 'pipette' || step.instrument !== 'blank') return info('Not now');
      if (s.nano.loaded !== 'blank') return info('Load the blank first', 'Pipette 2 µL of TE buffer onto the pedestal.');
      set({ nano: { loaded: null, blanked: true, result: null }, progress: { ...s.progress, instrumentDone: true } });
      sfx.beep();
      logAction('Blanked the spectrophotometer with TE buffer');
      check();
    },
    nanoMeasure: () => {
      const s = get();
      const step = curStep();
      if (s.mode === 'free') {
        if (!s.nano.blanked) return warn('Blank first', 'Use the same buffer or water as your sample before measuring.');
        if (s.nano.loaded !== 'sample') return info('Load a sample', 'Pipette 1-2 µL of a practice sample onto the pedestal.');
        const result = freeMeasurement(s.freeSampleConcentration, s.freeSampleFlags ?? s.flags);
        set({ nano: { ...s.nano, loaded: null, result } });
        logAction(`Free lab: simulated reading ${result.conc} ng/µL, 260/280 ${result.r280.toFixed(2)}. Saved report unchanged.`);
        sfx.beep();
        return;
      }
      if (step.kind !== 'pipette' || step.instrument !== 'measure') return info('Not now');
      if (s.nano.loaded !== 'sample') return info('Load your sample first', 'Pipette 2 µL of your DNA onto the pedestal.');
      const r = computeResult(s.flags, s.expId);
      set({ nano: { ...s.nano, loaded: null, result: r } });
      sfx.beep();
      tick(1);
      logAction(`Measured: ${r.conc} ng/µL · A260/A280 ${r.r280.toFixed(2)} · A260/A230 ${r.r230.toFixed(2)}`);
    },
    nanoFinish: () => {
      if (get().mode === 'free') return set({ modal: null });
      set({ modal: null, progress: { ...get().progress, instrumentDone: true } });
      check();
    },
  };
});

export const currentStep = () => useLab.getState().steps[useLab.getState().stepIndex];
