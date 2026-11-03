import { useEffect, useState } from 'react';
import { CircleCheck, Gauge, Snowflake, Thermometer, TriangleAlert, Wind } from 'lucide-react';
import { SpinColumnSVG } from '../svg/Equipment';
import { useLab } from '../../store';
import { BALANCES, TARE } from '../../data/reagents';
import type { BalanceId, TubeId } from '../../types';
import { totalVol } from '../../lib/tube';
import { TubeSVG } from '../svg/Tube';
import { Modal, Stepper } from './Modal';

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* ════════════════════ CENTRIFUGE ════════════════════ */
export function CentrifugeModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const spinStep = !free && step.kind === 'spin' ? step : null;
  const heldTube: TubeId | null = s.held?.kind === 'tube' ? s.held.id : null;
  const [sel, setSel] = useState<'held' | BalanceId | null>(heldTube ? 'held' : null);
  const [remain, setRemain] = useState(0);
  const running = s.spinState === 'running';
  const effSel = sel === 'held' && !heldTube ? null : sel;
  const sampleId = spinStep?.tube ?? s.rotor.find((id) => id === 'A' || id === 'B' || id === 'C');
  const sampleSlot = sampleId ? s.rotor.indexOf(sampleId) : -1;
  const rpm = Math.round(Math.sqrt(s.spin.speed / (1.118e-5 * 8.4)) / 10) * 10;

  useEffect(() => {
    if (s.spinState !== 'running') return;
    const total = 4300;
    const t0 = performance.now();
    const secs = useLab.getState().spin.time * 60;
    let raf = 0;
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / total);
      setRemain((1 - k) * secs);
      if (k < 1) raf = requestAnimationFrame(loop);
      else useLab.getState().finishSpin();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s.spinState]);

  const slotItem = (it: string | null) => {
    if (!it) return null;
    if (it === 'A' || it === 'B') {
      const t = s.tubes[it];
      const c = t.layers[t.layers.length - 1]?.color ?? '#e2e8f0';
      return { label: it, fill: c, ring: '#f8fafc', vol: totalVol(t), column: false };
    }
    if (it === 'C') {
      const t = s.tubes.C;
      return {
        label: 'C',
        fill: t.layers[0]?.color ?? '#fb923c',
        ring: '#fdba74',
        vol: totalVol(t),
        column: true,
      };
    }
    const b = it === 'balcustom' ? { label: `${(s.customBalanceVolume / 1000).toFixed(2)} mL`, volume: s.customBalanceVolume } : BALANCES[it as BalanceId];
    return { label: b.label.replace(' mL', ''), fill: '#86efac', ring: '#bbf7d0', vol: b.volume, column: false };
  };

  return (
    <Modal
      title="Microcentrifuge"
      subtitle={
        spinStep
          ? `${step.title} · ≥ ${spinStep.speed[0].toLocaleString()} × g · ${spinStep.idealTime} min${spinStep.temp === 4 ? ' · 4 °C' : ''}${
              spinStep.noBalance ? ' · no balance needed' : ''
            }`
          : free ? 'Free lab: load any practice tube and choose your own settings' : 'Nothing needs to be spun right now'
      }
      icon={<Gauge size={18} />}
      onClose={s.closeModal}
      closeDisabled={running}
      width="max-w-4xl"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* rotor */}
        <div className="flex flex-col items-center">
          <div className={`relative w-full max-w-[310px] ${s.spinState === 'imbalance' ? 'wobble' : ''}`}>
            <svg viewBox="-110 -110 220 220" className="block w-full">
              <defs>
                <radialGradient id="rotorG">
                  <stop offset="0" stopColor="#cbd5e1" />
                  <stop offset="0.7" stopColor="#94a3b8" />
                  <stop offset="1" stopColor="#64748b" />
                </radialGradient>
              </defs>
              <circle r="107" fill="#0b1220" stroke="#334155" strokeWidth="3" />
              <g className={running ? 'rotor-spin' : ''} style={{ transformOrigin: '0px 0px' }}>
                <circle r="93" fill="url(#rotorG)" stroke="#475569" strokeWidth="2" />
                <circle r="20" fill="#475569" stroke="#334155" strokeWidth="2" />
                <circle r="7" fill="#1e293b" />
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                  const x = 66 * Math.cos(a);
                  const y = 66 * Math.sin(a);
                  const it = slotItem(s.rotor[i]);
                  const isOpp = sampleSlot >= 0 && i === (sampleSlot + 6) % 12 && !s.rotor[i];
                  return (
                    <g
                      key={i}
                      transform={`translate(${x},${y})`}
                      role="button"
                      tabIndex={running ? -1 : 0}
                      aria-label={`Rotor slot ${i + 1}`}
                      onClick={() => s.rotorClick(i, effSel)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.rotorClick(i, effSel); } }}
                      style={{ cursor: running ? 'default' : 'pointer' }}
                    >
                      <circle r="14.5" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                      {it ? (
                        <g>
                          <circle r="12" fill={it.ring} />
                          <circle r="9" fill={it.fill} opacity="0.95" />
                          {it.column && <circle r="4" fill="#f8fafc" stroke="#9a3412" strokeWidth="0.8" />}
                          <text y="3.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={it.column ? '#7c2d12' : '#0f172a'} fontFamily="Inter">
                            {it.label}
                          </text>
                        </g>
                      ) : (
                        <circle r="9" fill="#0f172a" />
                      )}
                      {isOpp && s.hints && <circle r="17.5" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 3" className="animate-pulse" />}
                      <text
                        x={20 * Math.cos(a)}
                        y={20 * Math.sin(a) + 2.5}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="700"
                        fill="#1e293b"
                        fontFamily="JetBrains Mono"
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            {s.spinState === 'imbalance' && (
              <div className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-lg bg-rose-600 px-3 py-1.5 font-mono text-sm font-bold text-white shadow-xl">
                IMBALANCE — STOPPED
              </div>
            )}
          </div>
          <div className="mt-3 w-full rounded-xl bg-black/60 px-4 py-2.5 text-center font-mono ring-1 ring-white/10">
            {running ? (
              <div className="text-cyan-200">
                <div className="text-[20px] font-bold">{s.spin.speed.toLocaleString()} × g</div>
                <div className="text-[12px] text-slate-400">
                  {rpm.toLocaleString()} rpm · {mmss(remain)} remaining · fast-forward ×{Math.round((s.spin.time * 60) / 4.3)}
                </div>
              </div>
            ) : s.spinState === 'done' ? (
              <div className="text-emerald-300">
                <div className="text-[18px] font-bold">RUN COMPLETE</div>
                <div className="text-[12px] text-slate-400">Rotor stopped. You may open the lid.</div>
              </div>
            ) : (
              <div className="text-slate-300">
                <div className="text-[18px] font-bold">{s.rotor.some(Boolean) ? 'LOADED' : 'READY'}</div>
                <div className="text-[12px] text-slate-500">Click a slot to load the selected item · click a loaded slot to remove it</div>
              </div>
            )}
          </div>
        </div>

        {/* controls */}
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">1 · Choose what to load, then click a slot</div>
            <div className="flex flex-wrap gap-1.5">
              {heldTube && (
                <button
                  onClick={() => setSel('held')}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    effSel === 'held' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {heldTube === 'C' ? 'Spin column' : `Tube ${heldTube}`} (in hand ·{' '}
                  {totalVol(s.tubes[heldTube])} µL)
                </button>
              )}
              {[...s.exp.balances, ...(sampleSlot >= 0 ? ['balcustom' as const] : [])].map((b) => (
                <button
                  key={b}
                  onClick={() => setSel(b)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    effSel === b ? 'bg-emerald-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {b === 'balcustom' ? `Matching: ${s.customBalanceVolume} µL` : BALANCES[b].label}
                </button>
              ))}
            </div>
            {sampleSlot >= 0 && (
              <button
                onClick={() => { s.prepareMatchingBalance(); setSel('balcustom'); }}
                disabled={running}
                className="mt-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-400/25"
              >
                Prepare matching balance
              </button>
            )}
            {effSel === 'held' && heldTube === 'C' && (
              <div className="mt-2 flex items-center gap-3 rounded-lg bg-white/[0.03] p-2">
                <div className="w-6 shrink-0">
                  <SpinColumnSVG
                    level={s.tubes.C.layers.length ? Math.min(1, s.tubes.C.layers[0].volume / 750) : 0}
                    liquid={s.tubes.C.layers[0]?.color}
                    membrane={!s.tubes.C.layers.length}
                    className="block h-auto w-full"
                  />
                </div>
                <span className="text-[11.5px] leading-snug text-slate-400">
                  The column goes into the rotor with its collection tube. {s.tubes.C.column && s.tubes.C.column.flowThrough > 0 ? 'It still holds flow-through — empty it first.' : ''}
                </span>
              </div>
            )}
            <p className="mt-2 text-[11.5px] leading-snug text-slate-400">
              {effSel === 'held'
                ? 'Click any empty slot to load your tube.'
                : effSel
                  ? `Click the slot directly opposite your tube to place the ${effSel === 'balcustom' ? 'matching balance' : BALANCES[effSel].label.toLowerCase()}.`
                  : sampleSlot >= 0
                    ? 'Now pick a balance tube whose volume matches your sample.'
                    : 'Carry your tube here to load it.'}
            </p>
          </div>

          <Stepper
            label="2 · Speed (RCF)"
            value={s.spin.speed}
            unit="× g"
            min={1000}
            max={21000}
            step={500}
            big={5000}
            format={(v) => v.toLocaleString()}
            onChange={(v) => s.setSpin({ speed: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Time" value={s.spin.time} unit="min" min={1} max={30} step={1} onChange={(v) => s.setSpin({ time: v })} />
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Temperature</div>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {([4, 22] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => s.setSpin({ temp: t })}
                    className={`rounded-lg py-2 font-mono text-[13px] font-bold transition ${
                      s.spin.temp === t ? (t === 4 ? 'bg-sky-400 text-slate-950' : 'bg-amber-300 text-slate-950') : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t} °C
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-center text-[10.5px] text-slate-500">{s.spin.temp === 4 ? 'Refrigerated' : 'Room temp.'}</div>
            </div>
          </div>

          {s.spinState === 'done' ? (
            <button
              onClick={s.removeAfterSpin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-[14px] font-bold text-slate-950 transition hover:bg-emerald-300"
            >
              <CircleCheck size={18} /> Open lid & take out {free ? 'the sample' : spinStep?.tube === 'C' ? 'the column' : `Tube ${spinStep?.tube}`}
            </button>
          ) : (
            <button
              onClick={() => s.startSpin()}
              disabled={running || (!spinStep && !free) || sampleSlot < 0}
              className="w-full rounded-xl bg-cyan-400 py-3 text-[14px] font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? 'Spinning…' : 'Close lid & start'}
            </button>
          )}
          <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-400">
            <TriangleAlert size={13} className="mt-0.5 shrink-0 text-amber-300" />
            Balance by total mass: liquid plus the plastic (a 1.5 mL tube ≈ {TARE.tube} µL water-equivalent, a spin column ≈ {TARE.column} µL). Slots 1↔7, 2↔8, …
            {spinStep?.noBalance && ' This short spin is exempt.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════════ HEAT BLOCK ════════════════════ */
export function HeatModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const heatStep = !free && step.kind === 'heat' ? step : null;
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>(heatStep && s.progress.done ? 'done' : 'idle');
  const [cur, setCur] = useState(22);
  const [remain, setRemain] = useState(s.heatSet.time * 60);
  const tubeIn = (['A', 'B', 'C'] as const).find((id) => s.tubes[id].location === 'heatblock');

  useEffect(() => {
    if (phase !== 'running') return;
    const total = 3800;
    const t0 = performance.now();
    const { temp, time } = useLab.getState().heatSet;
    let raf = 0;
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / total);
      setCur(22 + (temp - 22) * Math.min(1, k / 0.3));
      setRemain((1 - k) * time * 60);
      if (k < 1) raf = requestAnimationFrame(loop);
      else {
        useLab.getState().finishHeat();
        setPhase('done');
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const tube = tubeIn ? s.tubes[tubeIn] : null;

  return (
    <Modal
      title="Heat block (dry bath)"
      subtitle={heatStep ? `${heatStep.title} · ${heatStep.idealTemp} °C for ${heatStep.idealTime} min` : free ? 'Free lab: choose the temperature and time' : 'Optional instrument; not a separate stage in your picture'}
      icon={<Thermometer size={18} />}
      onClose={s.closeModal}
      closeDisabled={phase === 'running'}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-2xl bg-black/70 p-4 font-mono ring-1 ring-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Set</div>
                <div className="text-[26px] font-bold text-red-400">{s.heatSet.temp.toFixed(1)}°</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Actual</div>
                <div className="text-[26px] font-bold text-red-300">{(phase === 'idle' ? 22 : phase === 'done' ? s.heatSet.temp : cur).toFixed(1)}°</div>
              </div>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Timer</div>
              <div className="text-[22px] font-bold text-amber-200">
                {phase === 'running' ? mmss(remain) : phase === 'done' ? '00:00' : mmss(s.heatSet.time * 60)}
                {phase === 'running' && <span className="ml-2 text-[11px] text-slate-500">fast-forward</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <div className="w-10 shrink-0">
              {tube ? (
                <TubeSVG layers={tube.layers} label={tube.id} className={`block h-auto w-full ${phase === 'running' ? 'humming' : ''}`} />
              ) : (
                <div className="grid h-24 place-items-center rounded-lg border border-dashed border-white/15 text-[10px] text-slate-500">empty</div>
              )}
            </div>
            <p className="text-[12px] leading-snug text-slate-300">
              {tube
                ? phase === 'done'
                  ? `Incubation complete. Tube ${tube.id} is ready to retrieve.`
                  : `Tube ${tube.id} is sitting in the block.`
                : heatStep
                  ? `No tube loaded. Close this window, pick up Tube ${heatStep.tube} and click the heat block. (You can pre-heat now though.)`
                  : 'The block is empty.'}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Stepper
            label="Temperature"
            value={s.heatSet.temp}
            unit="°C"
            min={20}
            max={100}
            step={1}
            big={10}
            onChange={(v) => s.setHeatSet({ temp: v })}
          />
          <Stepper label="Timer" value={s.heatSet.time} unit="min" min={5} max={180} step={5} big={30} onChange={(v) => s.setHeatSet({ time: v })} />
          {phase === 'done' ? (
            <button onClick={() => { if (free && tubeIn) s.retrieveTube(tubeIn); s.closeModal(); }} className="w-full rounded-xl bg-emerald-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-emerald-300">
              {free ? 'Retrieve tube & close' : 'Done: close'}
            </button>
          ) : (
            <button
              disabled={phase === 'running'}
              onClick={() => {
                if (useLab.getState().startHeat()) setPhase('running');
              }}
              className="w-full rounded-xl bg-red-500 py-3 text-[14px] font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
            >
              {phase === 'running' ? 'Incubating…' : 'Start incubation'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════════ FREEZER ════════════════════ */
export function FreezerModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const fStep = step.kind === 'freeze' ? step : null;
  const [min, setMin] = useState(30);
  const [phase, setPhase] = useState<'idle' | 'running'>('idle');
  const [remain, setRemain] = useState(0);
  const tubeIn = (['A', 'B', 'C'] as const).find((id) => s.tubes[id].location === 'freezer');

  useEffect(() => {
    if (phase !== 'running') return;
    const total = 3000;
    const t0 = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / total);
      setRemain((1 - k) * min * 60);
      if (k < 1) raf = requestAnimationFrame(loop);
      else useLab.getState().finishFreeze(min);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Modal title={`${s.storageTemperature} C freezer`} subtitle={s.mode === 'free' ? 'Free lab: store, retrieve or chill samples' : fStep ? fStep.title : 'Storage'} icon={<Snowflake size={18} />} onClose={s.closeModal} closeDisabled={phase === 'running'} width="max-w-xl">
      <div className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-sky-200 p-5 ring-1 ring-sky-300">
          {phase === 'running' &&
            [12, 40, 70, 25, 58, 85].map((x, i) => (
              <Snowflake key={i} size={14} className="absolute animate-pulse text-sky-400" style={{ left: `${x}%`, top: `${(i * 17) % 80}%` }} />
            ))}
          <div className="mx-auto w-14">
            {tubeIn ? (
              <TubeSVG layers={s.tubes[tubeIn].layers} strands={s.tubes[tubeIn].strands} label={tubeIn} frost={phase === 'running'} className="block h-auto w-full" />
            ) : (
              <div className="grid h-32 place-items-center text-[11px] text-sky-700">empty</div>
            )}
          </div>
          <div className="mt-2 text-center font-mono text-[13px] font-bold text-sky-800">{s.storageTemperature}.0 C</div>
        </div>
        <div className="space-y-3">
          {s.mode === 'free' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {([-20, -80] as const).map((t) => (
                  <button key={t} disabled={s.busy} onClick={() => s.setStorageTemperature(t)} className={`flex-1 rounded-lg p-2 text-sm ${s.storageTemperature === t ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-200'}`}>{t} C</button>
                ))}
              </div>
              {(['A', 'B', 'C'] as const).filter((id) => s.tubes[id].location === 'freezer').map((id) => (
                <button key={id} disabled={s.busy} onClick={() => { s.retrieveTube(id); s.closeModal(); }} className="w-full rounded-lg bg-white/5 px-3 py-2 text-[12px] text-sky-200 hover:bg-white/10">Retrieve Tube {id}</button>
              ))}
              <button disabled={s.busy} onClick={s.closeModal} className="w-full rounded-lg bg-sky-400/20 px-3 py-2 text-[12px] font-semibold text-sky-100">Leave sample in storage</button>
            </div>
          )}
          <Stepper label="Incubation time" value={min} unit="min" min={5} max={120} step={5} big={15} onChange={setMin} />
          <div className="rounded-xl bg-black/60 px-3 py-2 text-center font-mono text-[18px] font-bold text-sky-200 ring-1 ring-white/10">
            {phase === 'running' ? mmss(remain) : mmss(min * 60)}
          </div>
          <button
            disabled={phase === 'running' || !tubeIn}
            onClick={() => {
              if (useLab.getState().startFreeze(min)) setPhase('running');
            }}
            className="w-full rounded-xl bg-sky-400 py-3 text-[14px] font-bold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50"
          >
            {phase === 'running' ? 'Chilling…' : 'Close door & wait'}
          </button>
          <p className="text-[11.5px] leading-snug text-slate-400">Cold makes DNA less soluble and helps more of it precipitate. Labs commonly use 30 min to overnight.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ════════════════════ AIR-DRY ════════════════════ */
export function DryModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const tubeId = free ? s.focus : step.kind === 'dry' ? step.tube : 'B';
  const tube = s.tubes[tubeId];
  const [min, setMin] = useState(10);
  const [phase, setPhase] = useState<'idle' | 'running'>('idle');
  const [shown, setShown] = useState(0);
  const total = free ? s.freeDryMinutes[tubeId] ?? 0 : s.progress.dryMin ?? 0;
  const done = free ? total >= 5 && !s.busy : !!s.progress.done || s.flags.overdried;

  useEffect(() => {
    if (phase !== 'running') return;
    const ms = 2600;
    const t0 = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setShown(k * min);
      if (k < 1) raf = requestAnimationFrame(loop);
      else {
        useLab.getState().finishDry(min);
        setPhase('idle');
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const elapsed = phase === 'running' ? total + shown : total;
  const pct = (v: number) => `${Math.min(100, (v / 30) * 100)}%`;

  return (
    <Modal title="Air-dry the DNA pellet" subtitle="Lid open · tube in the bench rack" icon={<Wind size={18} />} onClose={s.closeModal} closeDisabled={phase === 'running'} width="max-w-xl">
      <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="rounded-2xl bg-slate-950/60 p-4 ring-1 ring-white/10">
          <TubeSVG layers={phase === 'running' && elapsed >= 5 ? [] : tube.layers} pellet={tube.pellet} lidOpen label={tubeId} showGrad className="mx-auto block h-auto w-16" />
          <div className="mt-2 text-center text-[11px] text-slate-400">
            Pellet: {tube.pellet === 'overdry' ? 'glassy (over-dried)' : tube.pellet === 'dry' ? 'translucent ✓' : 'white & wet'}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>Total drying time</span>
              <span className="font-mono font-bold text-slate-100">{elapsed.toFixed(1)} min</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 bg-amber-400/30" style={{ left: 0, width: pct(5) }} />
              <div className="absolute inset-y-0 bg-emerald-400/35" style={{ left: pct(5), width: `${(15 / 30) * 100}%` }} />
              <div className="absolute inset-y-0 bg-rose-500/35" style={{ left: pct(20), right: 0 }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-cyan-300/80" style={{ width: pct(elapsed) }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>wet</span>
              <span>ideal 5–10 min</span>
              <span>over-dried &gt; 20</span>
            </div>
          </div>
          {!done && <Stepper label="Leave open for" value={min} unit="min" min={1} max={30} step={1} big={5} onChange={setMin} />}
          {done ? (
            <button onClick={s.closeModal} className="w-full rounded-xl bg-emerald-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-emerald-300">
              Continue ✓
            </button>
          ) : (
            <button
              disabled={phase === 'running'}
              onClick={() => {
                if (useLab.getState().startDry()) {
                  setShown(0);
                  setPhase('running');
                }
              }}
              className="w-full rounded-xl bg-cyan-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              {phase === 'running' ? 'Drying…' : total > 0 ? 'Dry a bit longer' : 'Start drying'}
            </button>
          )}
          <p className="text-[11.5px] leading-snug text-slate-400">
            Look for the pellet turning from white to translucent, with no droplets of ethanol left on the tube wall.
          </p>
        </div>
      </div>
    </Modal>
  );
}

