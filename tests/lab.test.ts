import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { useLab } from '../src/store';
import { EXP_LIST, EXPERIMENTS } from '../src/data';
import { COMMON_FLOW, PICTURE_FLOWS } from '../src/data/pictureFlow';
import { PIPETTES } from '../src/data/reagents';
import { checklist, hintFor } from '../src/engine';
import { totalVol } from '../src/lib/tube';
import type { DnaseProtection, ExpId, TubeId } from '../src/types';

Object.assign(globalThis, { window: { setTimeout: (fn: () => void) => setTimeout(fn, 2) } });
const state = () => useLab.getState();
const click = (id: string) => state().click(id);
const pause = (ms = 10) => new Promise((r) => setTimeout(r, ms));

function putDown() {
  const held = state().held;
  if (held?.kind === 'tube') state().tubeAction('putback');
  else if (held?.kind === 'pipette') {
    if (state().pipettes[held.id].tip) state().ejectTip();
    state().returnPipette();
  }
}

function pipette(source: string, target: string, volume: number) {
  putDown();
  const id = volume <= 20 ? 'P20' : volume <= 200 ? 'P200' : 'P1000';
  click(`pipette-${id}`); state().setPipetteVolume(volume); click(`tips-${PIPETTES[id].tip}`); click(source);
  if (state().modal === 'aspirate') state().aspirateOutcome('ok');
  click(target);
  if (!state().modal) { state().ejectTip(); state().returnPipette(); }
}

function hold(id: TubeId) {
  const held = state().held;
  if (held?.kind !== 'tube' || held.id !== id) { putDown(); click(`tube-${id}`); }
}

async function completeGuided(expId: ExpId, solvent: 'te' | 'water' = 'te', protection: DnaseProtection = 'edta', salt = 'nacl') {
  state().startLab(expId);
  let iterations = 0;
  while (state().mode === 'guided') {
    assert.ok(iterations++ < 50, 'a guided run must finish');
    if (state().steps[state().stepIndex].id === 'dnase-protection' && protection === 'heat') {
      putDown(); state().chooseProtection('heat');
    }
    const s = state();
    const step = s.steps[s.stepIndex];
    const index = s.stepIndex;
    switch (step.kind) {
      case 'ppe': click('ppe-coat'); click('ppe-gloves'); click('ppe-goggles'); break;
      case 'inspect': hold(step.tube); click('rack-bench'); break;
      case 'pipette': {
        const source = step.id === 'resuspend' ? solvent : step.id === 'salt' ? salt : step.source;
        pipette(source.length === 1 ? `tube-${source}` : `reagent-${source}`, `tube-${step.target}`, step.vol({ tubes: s.tubes, flags: s.flags }).ideal);
        break;
      }
      case 'mix': hold(step.tube); for (let i = 0; i < step.count; i++) state().tubeAction(step.method); break;
      case 'move': hold(step.tube); click(step.to === 'hood' ? 'rack-hood' : 'rack-bench'); break;
      case 'heat':
        hold(step.tube); click('heatblock');
        state().setHeatSet({ temp: step.idealTemp, time: step.idealTime });
        assert.ok(state().startHeat(), `${expId} starts ${step.id}`);
        state().finishHeat(); state().closeModal(); break;
      case 'spin':
        hold(step.tube); click('centrifuge'); state().rotorClick(0, 'held'); state().prepareMatchingBalance(); state().rotorClick(6, 'balcustom');
        state().setSpin({ speed: step.idealSpeed, time: step.idealTime, temp: step.temp === 4 ? 4 : 22 });
        assert.ok(state().startSpin(), `${expId} starts ${step.id}`);
        state().finishSpin(); state().removeAfterSpin(); break;
      case 'seat': hold(step.tube); click(`tube-${step.into}`); break;
      case 'recover':
        hold(step.tube); assert.equal(state().tubes.C.location, 'seated');
        assert.ok(state().tubes.C.column?.bound);
        state().tubeAction('collect');
        assert.equal(state().tubes.C.column?.bound, 0);
        assert.equal(totalVol(state().tubes.B), 100);
        break;
      case 'decant': hold(step.tube); click('liquidwaste'); break;
      case 'discard': hold(step.tube); click(step.to); break;
      case 'dry': hold(step.tube); state().tubeAction('dry'); assert.ok(state().startDry()); state().finishDry(8); state().closeModal(); break;
      default: assert.fail(`Unexpected required stage: ${step.kind}`);
    }
    await pause();
    assert.ok(state().stepIndex !== index || state().mode === 'free', `Advance after ${expId}/${step.id}: ${JSON.stringify(state().toasts.slice(-1))}`);
  }
  const done = state();
  assert.equal(done.modal, 'report');
  assert.equal(done.tubes.B.location, 'bench');
  assert.equal(totalVol(done.tubes.B), 50);
  assert.equal(done.mistakes.length, 0);
  assert.equal(done.completedRun?.result, null, 'never claim measured purity or yield');
  assert.equal(done.flags.dnaseProtected, true);
  assert.equal(done.flags.protectionMethod, protection);
  assert.equal(done.flags.rnaRemoved, true);
  assert.equal(done.flags.proteinsDigested, true);
  assert.equal(done.flags.ethanolWashed, true);
  assert.match(done.tubes.B.layers[0].label, solvent === 'water' ? /water/ : /1x TE/);
}

function freeSpin(id: TubeId) {
  hold(id); click('centrifuge'); state().rotorClick(0, 'held'); state().prepareMatchingBalance(); state().rotorClick(6, 'balcustom');
  state().setSpin({ speed: 12000, time: 5, temp: 4 });
  assert.ok(state().startSpin()); state().finishSpin(); state().removeAfterSpin();
}

test('latest two study pages are the only active protocol reference', async (t) => {
  state().toggleSound();
  await t.test('only three document methods are registered; all share the six functions', () => {
    assert.deepEqual(Object.keys(EXPERIMENTS), ['exp1', 'exp2', 'exp3']);
    assert.equal(EXP_LIST.length, 3);
    assert.equal(COMMON_FLOW.length, 6);
    assert.equal(existsSync('src/data/experiment3b.ts'), false);
    for (const e of EXP_LIST) {
      const ids = e.steps.map((s) => s.id);
      const ordered = ['lysis', 'dnase-protection', 'rnase', 'protk', 'ethanol', 'spin-pellet', 'decant', 'wash', 'spin-wash', 'discard-wash', 'resuspend', 'dissolve'];
      for (let i = 1; i < ordered.length; i++) assert.ok(ids.indexOf(ordered[i - 1]) < ids.indexOf(ordered[i]), `${e.id}: ${ordered[i - 1]} before ${ordered[i]}`);
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(e.steps.every((s) => s.noteRef), 'every step states its source or simulation-support role');
      assert.ok(!ids.some((id) => ['beads', 'magnet1', 'freeze', 'store', 'measure', 'interpret', 'spool', 'pci2'].includes(id)));
      assert.ok(e.bottles.some((b) => b.id === 'etoh70'));
      assert.ok(e.bottles.some((b) => b.id === 'edta'));
      assert.match(PICTURE_FLOWS[e.id].map((s) => s.title).join(' '), /70% ethanol/);
    }
  });
  for (const id of ['exp1', 'exp2', 'exp3'] as const) {
    await t.test(`${id}: chelation, 100% precipitation, 70% wash and TE finish`, async () => completeGuided(id));
    await t.test(`${id}: heating alternative and DNase-free water finish`, async () => completeGuided(id, 'water', 'heat', id === 'exp2' ? 'naoac' : 'nacl'));
  }
  await t.test('all three pictured salts are accepted, including sodium acetate', async () => {
    await completeGuided('exp2', 'te', 'edta', 'kac');
    const step = state().steps.find((s) => s.id === 'salt');
    assert.ok(step?.kind === 'pipette');
    if (step?.kind === 'pipette') assert.deepEqual(step.alternativeSources, ['naoac', 'kac']);
  });
  await t.test('100% ethanol cannot substitute for the required 70% wash', () => {
    state().startLab('exp1');
    const i = state().steps.findIndex((s) => s.id === 'wash');
    useLab.setState({ stepIndex: i, ppe: { coat: true, gloves: true, goggles: true } });
    click('pipette-P1000'); state().setPipetteVolume(500); click('tips-T1000'); click('reagent-etoh100');
    assert.equal(state().pipettes.P1000.load, null);
    assert.equal(state().flags.ethanolWashed, false);
    assert.equal(state().steps[state().stepIndex].id, 'wash');
    assert.match(state().toasts.at(-1)?.text ?? '', /70% ethanol/);
    click('reagent-etoh70');
    assert.equal(state().pipettes.P1000.load?.source, 'etoh70');
  });
  await t.test('valid salt and resuspension choices share the same acceptance and hints', () => {
    for (const reagent of ['kac', 'naoac'] as const) {
      state().startLab('exp2');
      const index = state().steps.findIndex((s) => s.id === 'salt');
      useLab.setState({ stepIndex: index, ppe: { coat: true, gloves: true, goggles: true } });
      const step = state().steps[index];
      assert.ok(step.kind === 'pipette');
      if (step.kind !== 'pipette') return;
      click('pipette-P200'); state().setPipetteVolume(step.vol(state()).ideal); click('tips-T200'); click(`reagent-${reagent}`);
      assert.equal(hintFor(step, state())?.target, 'tube-A');
      assert.equal(checklist(step, state())[3].done, true);
    }
  });
  await t.test('completion works without structuredClone and free lab preserves the completed notes', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');
    try {
      Object.defineProperty(globalThis, 'structuredClone', { value: undefined, configurable: true, writable: true });
      await completeGuided('exp1', 'water');
    } finally {
      if (original) Object.defineProperty(globalThis, 'structuredClone', original);
    }
    const saved = JSON.stringify(state().completedRun);
    state().enterFreeLab(); assert.equal(state().modal, null);
    pipette('reagent-water', 'nanodrop', 2); state().nanoBlank(); state().closeModal(); putDown();
    pipette('tube-B', 'nanodrop', 2); state().nanoMeasure();
    assert.ok((state().nano.result?.conc ?? 0) > 0);
    state().nanoFinish(); putDown();
    const conc = state().nano.result!.conc;
    pipette('reagent-water', 'tube-B', 100);
    hold('B'); state().tubeAction('flick'); putDown();
    pipette('tube-B', 'nanodrop', 2); state().nanoMeasure(); assert.ok(state().nano.result!.conc < conc / 2);
    state().nanoFinish(); putDown(); freeSpin('B'); putDown();
    assert.equal(JSON.stringify(state().completedRun), saved);
    state().resetPracticeBench(); assert.equal(JSON.stringify(state().completedRun), saved);
    assert.equal(state().mode, 'free'); assert.equal(state().modal, null);
    await pause(20); assert.equal(state().modal, null);
  });
  await t.test('a report does not discard a held sample and a restart keeps the method', () => {
    click('pipette-P20'); state().setPipetteVolume(2); click('tips-T20'); click('reagent-water');
    state().openModal('report'); state().enterFreeLab();
    assert.deepEqual(state().held, { kind: 'pipette', id: 'P20' });
    assert.equal(state().pipettes.P20.load?.source, 'water');
    state().startLab('exp3'); state().startLab(); assert.equal(state().expId, 'exp3');
  });
});
