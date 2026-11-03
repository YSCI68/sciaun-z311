import type { LabState } from './store';
import type { BalanceId, PipetteStep, Snapshot, Step, TubeId } from './types';
import { BALANCES, PIPETTES, REAGENTS, TARE } from './data/reagents';
import { totalVol } from './lib/tube';

export interface Hint {
  target: string;
  text: string;
}

export const snap = (s: Pick<LabState, 'tubes' | 'flags'>): Snapshot => ({ tubes: s.tubes, flags: s.flags });

export function isAcceptedSource(step: PipetteStep, source: string | undefined): boolean {
  return !!source && (source === step.source || !!step.alternativeSources?.some((item) => item === source));
}

export function resolveText(v: string | ((s: Snapshot) => string), s: Snapshot): string {
  return typeof v === 'function' ? v(s) : v;
}

/** water-equivalent mass of one rotor item: the liquid plus the plastic itself */
export function rotorMass(s: Pick<LabState, 'rotor' | 'tubes' | 'customBalanceVolume'>, item: string): number {
  if (item === 'balcustom') return s.customBalanceVolume + TARE.tube;
  if (item === 'A' || item === 'B') return totalVol(s.tubes[item]) + TARE.tube;
  if (item === 'C') {
    if (!s.tubes.C.column) return totalVol(s.tubes.C) + TARE.tube;
    return totalVol(s.tubes.C) + TARE.column + (s.tubes.B.location === 'column' ? TARE.tube : 0);
  }
  return BALANCES[item as BalanceId].volume + TARE.tube;
}

/** Net imbalance (µL-weighted vector) of the rotor and number of loaded tubes. */
export function rotorImbalance(s: Pick<LabState, 'rotor' | 'tubes' | 'customBalanceVolume'>): { imb: number; count: number } {
  let x = 0;
  let y = 0;
  let count = 0;
  s.rotor.forEach((it, i) => {
    if (!it) return;
    const m = rotorMass(s, it);
    const a = (i / 12) * Math.PI * 2;
    x += m * Math.cos(a);
    y += m * Math.sin(a);
    count++;
  });
  return { imb: Math.hypot(x, y), count };
}

export const itemName = (id: string) => (id === 'C' ? 'the spin column' : `Tube ${id}`);

export function isStepDone(step: Step, s: LabState): boolean {
  const p = s.progress;
  switch (step.kind) {
    case 'ppe':
      return s.ppe.coat && s.ppe.gloves && s.ppe.goggles;
    case 'inspect':
      return !!p.picked && s.held === null && s.tubes[step.tube].location === 'bench';
    case 'pipette':
      if (!p.dispensed) return false;
      if (step.instrument) return !!p.instrumentDone;
      return !!p.tipEjected;
    case 'move':
      return s.tubes[step.tube].location === step.to && !(s.held?.kind === 'tube' && s.held.id === step.tube);
    case 'discard':
      return s.tubes[step.tube].location === 'disposed';
    default:
      return !!p.done;
  }
}

export function checklist(step: Step, s: LabState): { label: string; done: boolean }[] {
  const p = s.progress;
  const heldTube = s.held?.kind === 'tube' ? s.held.id : null;
  const heldPip = s.held?.kind === 'pipette' ? s.held.id : null;
  const done = isStepDone(step, s);
  switch (step.kind) {
    case 'ppe':
      return [
        { label: 'Lab coat', done: s.ppe.coat },
        { label: 'Nitrile gloves', done: s.ppe.gloves },
        { label: 'Safety goggles', done: s.ppe.goggles },
      ];
    case 'inspect':
      return [
        { label: `Pick up Tube ${step.tube}`, done: !!p.picked },
        { label: 'Put it back in the bench rack', done },
      ];
    case 'pipette': {
      const v = step.vol(snap(s));
      const ok = heldPip && step.pipettes.includes(heldPip) ? s.pipettes[heldPip] : null;
      const d = !!p.dispensed;
      const items = [
        { label: `Pick up the ${step.best}`, done: d || !!ok },
        { label: `Set the volume to ${v.ideal} µL`, done: d || (!!ok && ok.volume >= v.min && ok.volume <= v.max) },
        { label: 'Attach a fresh tip', done: d || (!!ok && !!ok.tip) },
        { label: `Aspirate ${step.sourceLabel}`, done: d || (!!ok && isAcceptedSource(step, ok.load?.source)) },
        { label: `Dispense into ${step.targetLabel}`, done: d },
      ];
      if (step.instrument)
        items.push({
          label: `Press ${step.instrument === 'blank' ? 'Blank' : 'Measure'} on the spectrophotometer`,
          done: !!p.instrumentDone,
        });
      else items.push({ label: 'Eject the used tip', done: !!p.tipEjected });
      return items;
    }
    case 'mix':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || (p.count ?? 0) > 0 },
        {
          label: `${step.method === 'invert' ? 'Invert' : 'Flick'} gently (${Math.min(p.count ?? 0, step.count)}/${step.count})`,
          done: !!p.done,
        },
      ];
    case 'move':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || done },
        { label: `Place it in the ${step.to === 'hood' ? 'fume hood rack' : 'bench rack'}`, done },
      ];
    case 'heat':
      return [
        { label: `Place Tube ${step.tube} in the heat block`, done: s.tubes[step.tube].location === 'heatblock' || !!p.done },
        { label: `Set ${step.idealTemp} °C · ${step.idealTime} min and start`, done: !!p.done },
      ];
    case 'spin': {
      const { imb, count } = rotorImbalance(s);
      const balanced = !!p.spun || (!!p.loaded && count >= 2 && imb <= 160);
      return [
        { label: `Load Tube ${step.tube} into the rotor`, done: !!p.loaded || !!p.spun },
        { label: 'Add a matching balance tube opposite', done: balanced },
        {
          label: `Set ≥ ${step.speed[0].toLocaleString()} × g · ${step.idealTime} min${step.temp === 4 ? ' · 4 °C' : ''} & start`,
          done: !!p.spun,
        },
        { label: 'Remove your tube', done: !!p.done },
      ];
    }
    case 'phaseQuiz':
    case 'quiz':
      return [{ label: 'Answer the checkpoint question', done: !!p.done }];
    case 'discard':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || done },
        {
          label: `Place it in the ${step.to === 'hazwaste' ? 'halogenated waste' : step.to === 'plastics' ? 'plastic waste' : 'liquid waste'}`,
          done,
        },
      ];
    case 'decant':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || !!p.done },
        { label: 'Pour into the liquid waste beaker', done: !!p.done },
      ];
    case 'freeze':
      return [
        { label: `Put Tube ${step.tube} in the −20 °C freezer`, done: s.tubes[step.tube].location === 'freezer' || !!p.done },
        { label: `Incubate ${step.idealTime} min`, done: !!p.done },
      ];
    case 'store':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || done },
        { label: 'Store it in the −20 °C freezer', done },
      ];
    case 'dry':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || s.modal === 'dry' || !!p.done },
        { label: 'Air-dry 5–10 min with the lid open', done: !!p.done },
      ];
    case 'spool':
      return [
        { label: `Pick up Tube ${step.tube}`, done: heldTube === step.tube || (p.count ?? 0) > 0 || !!p.done },
        {
          label: `Twirl the glass rod at the interface (${Math.min(p.count ?? 0, step.need)}/${step.need} fibres)`,
          done: !!p.done,
        },
      ];
    case 'seat':
      return [
        { label: `Pick up ${itemName(step.tube)}`, done: heldTube === step.tube || done },
        { label: `Click Tube ${step.into} to seat the column in it`, done },
      ];
    case 'recover':
      return [
        { label: 'Pick up the seated membrane column', done: heldTube === step.tube || done },
        { label: `Collect the schematic DNA fraction into Tube ${step.into}`, done },
      ];
  }
}

function putAway(s: LabState): Hint | null {
  const held = s.held;
  if (held?.kind === 'pipette') {
    const ps = s.pipettes[held.id];
    if (ps.load)
      return { target: ps.load.source === 'pci' ? 'hazwaste' : 'liquidwaste', text: 'Discard the liquid in your tip' };
    if (ps.tip) return { target: 'tipwaste', text: 'Eject the tip into the tip waste' };
    return { target: 'stand', text: `Return the ${held.id} to the stand` };
  }
  if (held?.kind === 'tube') {
    const id = held.id;
    const loc = s.tubes[id].location;
    if (s.tubes[id].column) return { target: 'columnStand', text: 'Put the column back in its holder' };
    return { target: loc === 'hood' ? 'rack-hood' : 'rack-bench', text: `Put Tube ${id} down in a rack` };
  }
  return null;
}

const pickTube = (id: TubeId): Hint => ({ target: `tube-${id}`, text: `Pick up Tube ${id}` });

function pipetteHint(step: PipetteStep, s: LabState): Hint | null {
  const p = s.progress;
  const held = s.held;
  const v = step.vol(snap(s));
  const srcTarget = step.source in REAGENTS ? `reagent-${step.source}` : `tube-${step.source}`;
  const tgtTarget = step.target === 'nanodrop' ? 'nanodrop' : `tube-${step.target}`;
  if (p.dispensed) {
    if (step.instrument && !p.instrumentDone)
      return {
        target: 'nanodrop',
        text: `Open the spectrophotometer and press ${step.instrument === 'blank' ? 'Blank' : 'Measure'}`,
      };
    if (held?.kind === 'pipette' && s.pipettes[held.id].tip) return { target: 'tipwaste', text: 'Eject the used tip' };
    return null;
  }
  if (held?.kind === 'tube') return putAway(s);
  if (!held) return { target: `pipette-${step.best}`, text: `Pick up the ${step.best}` };
  const ps = s.pipettes[held.id];
  if (!step.pipettes.includes(held.id)) {
    if (ps.load || ps.tip) return putAway(s);
    return { target: `pipette-${step.best}`, text: `Swap to the ${step.best}` };
  }
  if (ps.load) {
    if (!isAcceptedSource(step, ps.load.source))
      return { target: ps.load.source === 'pci' ? 'hazwaste' : 'liquidwaste', text: 'Discard the wrong liquid' };
    return { target: tgtTarget, text: `Dispense into ${step.targetLabel}` };
  }
  if (ps.volume < v.min || ps.volume > v.max) return { target: 'ui-volume', text: `Set the volume to ${v.ideal} µL` };
  if (!ps.tip) return { target: `tips-${PIPETTES[held.id].tip}`, text: 'Attach a fresh tip' };
  if (ps.tip === 'used') return { target: 'tipwaste', text: 'Eject the used tip first' };
  return { target: srcTarget, text: `Aspirate ${step.sourceLabel}` };
}

export function hintFor(step: Step, s: LabState): Hint | null {
  if (s.mode === 'free' || s.modal || s.progress.completed) return null;
  const held = s.held;
  const holding = (id: TubeId) => held?.kind === 'tube' && held.id === id;
  switch (step.kind) {
    case 'ppe': {
      const next = !s.ppe.coat ? 'coat' : !s.ppe.gloves ? 'gloves' : 'goggles';
      const name = next === 'coat' ? 'lab coat' : next === 'gloves' ? 'nitrile gloves' : 'safety goggles';
      return { target: `ppe-${next}`, text: `Put on the ${name}` };
    }
    case 'inspect':
      if (holding(step.tube)) return { target: 'rack-bench', text: 'Put the tube back in the bench rack' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'pipette':
      return pipetteHint(step, s);
    case 'mix':
      if (holding(step.tube))
        return {
          target: step.method === 'invert' ? 'ui-invert' : 'ui-flick',
          text: `${step.method === 'invert' ? 'Invert' : 'Flick'} the tube (${s.progress.count ?? 0}/${step.count})`,
        };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'move':
      if (holding(step.tube))
        return {
          target: step.to === 'hood' ? 'rack-hood' : 'rack-bench',
          text: `Place it in the ${step.to === 'hood' ? 'fume hood rack' : 'bench rack'}`,
        };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'heat':
      if (holding(step.tube)) return { target: 'heatblock', text: 'Place the tube in the heat block' };
      if (s.tubes[step.tube].location === 'heatblock') return { target: 'heatblock', text: 'Open the heat block and start' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'spin':
      if (holding(step.tube)) return { target: 'centrifuge', text: 'Carry the tube to the centrifuge' };
      if (s.tubes[step.tube].location === 'centrifuge') return { target: 'centrifuge', text: 'Open the centrifuge' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'discard':
      if (holding(step.tube))
        return {
          target: 'ui-discard',
          text: `Dispose of it in the ${step.to === 'hazwaste' ? 'halogenated' : step.to === 'plastics' ? 'plastics' : 'liquid'} waste`,
        };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'decant':
      if (holding(step.tube)) return { target: 'ui-decant', text: 'Pour the liquid into the waste beaker' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'freeze':
      if (holding(step.tube)) return { target: 'freezer', text: 'Put the tube in the −20 °C freezer' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'store':
      if (holding(step.tube)) return { target: 'ui-store', text: 'Store the DNA in the −20 °C freezer' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'dry':
      if (holding(step.tube)) return { target: 'ui-dry', text: 'Choose "Air-dry" under Your hands' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'spool':
      if (holding(step.tube))
        return { target: 'ui-spool', text: `Choose "Spool" and twirl the rod (${s.progress.count ?? 0}/${step.need})` };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'seat':
      if (holding(step.tube)) return { target: `tube-${step.into}`, text: `Click Tube ${step.into} to seat the column` };
      if (held) return putAway(s);
      return pickTube(step.tube);
    case 'recover':
      if (holding(step.tube)) return { target: 'ui-collect', text: 'Choose Collect DNA to model the recovery arrow' };
      if (held) return putAway(s);
      return pickTube(step.tube);
    default:
      return null;
  }
}
