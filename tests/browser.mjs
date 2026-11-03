import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const obj = (id) => page.locator(`[data-obj="${id}"]`);
const button = (name) => page.getByRole('button', { name, exact: true });
const read = () => page.evaluate(async () => {
  const { useLab } = await import('/src/store.ts');
  const s = useLab.getState();
  const step = s.steps[s.stepIndex];
  return {
    id: s.expId, mode: s.mode, modal: s.modal, index: s.stepIndex, held: s.held, busy: s.busy,
    flags: s.flags, tubes: s.tubes, spinState: s.spinState, result: s.nano.result, saved: JSON.stringify(s.completedRun),
    step: { ...step, volume: step.kind === 'pipette' ? step.vol({ tubes: s.tubes, flags: s.flags }).ideal : null },
  };
});

async function putDown() {
  const s = await read();
  if (s.held?.kind === 'pipette') {
    if (await button('Eject tip').isEnabled()) await button('Eject tip').click();
    await button('Return to stand').click();
  } else if (s.held?.kind === 'tube') {
    if (await button('Put down').isVisible()) await button('Put down').click();
    else if (await button('To holder').isVisible()) await button('To holder').click();
    else await obj(s.tubes[s.held.id].column ? 'columnStand' : 'rack-bench').click();
  }
}
async function hold(id) {
  const s = await read();
  if (s.held?.kind !== 'tube' || s.held.id !== id) { await putDown(); await obj(`tube-${id}`).click(); }
}
async function setRange(label, value) {
  await page.getByRole('slider', { name: label, exact: true }).evaluate((element, val) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(val));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function pipette(source, target, volume, preferred) {
  await putDown();
  const id = preferred ?? (volume <= 20 ? 'P20' : volume <= 200 ? 'P200' : 'P1000');
  await obj(`pipette-${id}`).click();
  const input = page.getByRole('textbox', { name: 'Pipette volume' });
  await input.fill(String(volume)); await input.press('Enter');
  await obj(`tips-${id.replace('P', 'T')}`).click();
  await obj(source).click();
  if ((await read()).modal === 'aspirate') {
    const svg = page.locator('svg[style*="ns-resize"]');
    await expect(svg).toBeVisible(); await page.waitForTimeout(400);
    const bounds = await svg.boundingBox();
    const y = await page.evaluate(async () => {
      const { useLab } = await import('/src/store.ts');
      const { totalVol, volToY } = await import('/src/lib/tube.ts');
      const s = useLab.getState();
      const step = s.steps[s.stepIndex];
      return volToY(totalVol(s.tubes[step.source]) - s.pipettes[s.held.id].volume) + 1;
    });
    const scale = Math.min(bounds.width / 76, bounds.height / 100);
    await page.mouse.move(bounds.x + (bounds.width - 76 * scale) / 2 + 30 * scale, bounds.y + (bounds.height - 100 * scale) / 2 + (y - 62) * scale);
    await page.mouse.down();
    await expect.poll(async () => (await read()).modal, { timeout: 10000 }).toBe(null);
    await page.mouse.up();
  }
  await obj(target).click();
  if (!(await read()).modal) await putDown();
}

async function run(id, heat = false) {
  for (let i = 0; i < 50; i++) {
    let s = await read();
    if (s.mode === 'free') break;
    if (s.step.id === 'dnase-protection' && heat) {
      await putDown(); await button('Heating').click(); s = await read();
      assert.equal(s.step.kind, 'heat');
    }
    const { step, index } = s;
    console.log(`${id}: ${step.id}`);
    switch (step.kind) {
      case 'ppe': await obj('ppe-coat').click(); await obj('ppe-gloves').click(); await obj('ppe-goggles').click(); break;
      case 'inspect': await hold(step.tube); await obj('rack-bench').click(); break;
      case 'pipette': {
        const source = step.id === 'salt' ? 'naoac' : step.id === 'resuspend' && id !== 'exp1' ? 'water' : step.source;
        await pipette(source.length === 1 ? `tube-${source}` : `reagent-${source}`, `tube-${step.target}`, step.volume, step.best);
        break;
      }
      case 'mix':
        await hold(step.tube); for (let j = 0; j < step.count; j++) await button(step.method === 'invert' ? 'Invert' : 'Flick').click(); break;
      case 'move': await hold(step.tube); await obj(step.to === 'hood' ? 'rack-hood' : 'rack-bench').click(); break;
      case 'heat':
        await hold(step.tube); await obj('heatblock').click();
        await setRange('Temperature', step.idealTemp); await setRange('Timer', step.idealTime); await button('Start incubation').click();
        await expect.poll(async () => (await read()).busy, { timeout: 10000 }).toBe(false);
        if ((await read()).modal === 'heat') await button('Close').click();
        break;
      case 'spin':
        await hold(step.tube); await obj('centrifuge').click(); await button('Rotor slot 1').click();
        await button('Prepare matching balance').click(); await button('Rotor slot 7').click();
        await setRange('2 · Speed (RCF)', step.idealSpeed); await setRange('Time', step.idealTime); await button('22 °C').click();
        await button('Close lid & start').click();
        await expect.poll(async () => (await read()).spinState, { timeout: 12000 }).toBe('done');
        await page.getByRole('button', { name: /^Open lid & take out/ }).click(); break;
      case 'seat': await hold(step.tube); await button(`Seat in Tube ${step.into}`).click(); break;
      case 'recover':
        await hold(step.tube); await expect(button('Collect DNA')).toBeVisible();
        await button('Show instructions').click();
        await expect(page.getByText(/spinning a dry membrane alone does not release DNA/)).toBeVisible();
        await button('Hide instructions').click(); await button('Collect DNA').click(); break;
      case 'decant':
        await hold(step.tube); await button(step.tube === 'C' ? 'Discard flow-through' : 'Pour supernatant').click(); break;
      case 'discard':
        await hold(step.tube); await button(step.to === 'hazwaste' ? 'Hazardous waste' : step.to === 'plastics' ? 'Plastic waste' : 'Liquid waste').click(); break;
      case 'dry':
        await hold(step.tube); await button('Air-dry').click(); await button('Start drying').click();
        await expect.poll(async () => (await read()).busy, { timeout: 10000 }).toBe(false);
        if ((await read()).modal === 'dry') await button('Close').click();
        break;
      default: throw new Error(`Unexpected stage ${step.kind}`);
    }
    await expect.poll(async () => (await read()).index !== index || (await read()).mode === 'free', { timeout: 6000 }).toBe(true);
  }
  const completed = await read();
  assert.equal(completed.modal, 'report'); assert.equal(completed.mode, 'free');
  assert.equal(completed.flags.dnaseProtected, true);
  assert.equal(completed.flags.ethanolWashed, true);
  assert.equal(completed.flags.proteinsDigested && completed.flags.rnaRemoved, true);
  await expect(page.getByText('70% ethanol wash', { exact: true })).toBeVisible();
  await expect(page.getByText('Not measured', { exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/lab-${id}-latest-report.png` });
  const saved = completed.saved;
  await button('Continue in free lab').click();
  if (await button('Show instructions').isVisible()) await button('Show instructions').click();
  await expect(page.getByRole('heading', { name: 'The bench is yours.' })).toBeVisible();
  await expect(page.getByText('5. Wash with 70% ethanol', { exact: true })).toBeVisible();
  assert.equal((await read()).saved, saved);
  await button('Hide instructions').click();
}

try {
  await page.goto('http://localhost:5173');
  await expect(page.getByRole('button', { name: /magnetic beads/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Open practical/ })).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'DNA Extraction' })).toBeVisible();
  await page.screenshot({ path: '/tmp/lab-latest-intro.png', fullPage: true });
  for (const [id, label, heat] of [['exp1', /Method 1 Organic extraction/, false], ['exp2', /Method 2 Inorganic extraction/, true], ['exp3', /Method 3 Silica membrane binding/, false]]) {
    if (id !== 'exp1') await page.getByTitle('Leave the lab').click();
    await page.getByRole('button', { name: label }).click();
    await expect(page.getByText(/The two study pages are the reference/)).toBeVisible();
    await button('Enter the lab').click();
    await expect(obj('reagent-etoh70')).toBeVisible();
    await expect(obj('reagent-edta')).toBeVisible();
    await expect(obj('magnetStand')).toHaveCount(0);
    await button('Zoom in').click(); await expect(page.getByLabel('Zoom level')).toHaveText('125%');
    await button('Fit workbench').click();
    await page.screenshot({ path: `/tmp/lab-${id}-latest-bench.png` });
    await run(id, heat);
  }
  const saved = (await read()).saved;
  await button('Full screen').click(); await expect(button('Exit full screen')).toBeVisible(); await button('Exit full screen').click();
  await pipette('reagent-water', 'nanodrop', 2); await button('Blank').click(); await button('Close').click(); await putDown();
  await pipette('tube-B', 'nanodrop', 2); await button('Measure').click();
  assert.ok((await read()).result.conc > 0); await button('Return to free lab').click(); await putDown();
  assert.equal((await read()).saved, saved);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', (e) => errors.push(e.message));
  await mobile.goto('http://localhost:5173');
  await mobile.getByRole('button', { name: /Method 1 Organic extraction/ }).click();
  await mobile.getByRole('button', { name: 'Enter the lab', exact: true }).click();
  await expect(mobile.getByLabel('Zoom level')).toHaveText('175%');
  await mobile.getByRole('button', { name: 'Fit workbench' }).click();
  await expect(mobile.getByLabel('Zoom level')).toHaveText('100%');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log('PASS: all three latest-document workflows, EDTA and heating, required 70% wash, silica recovery, free lab, fullscreen, zoom and mobile.');
} finally {
  await browser.close();
}
