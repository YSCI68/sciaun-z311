import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { ArrowDownToLine, Hand, MousePointerClick, RotateCw, Snowflake, Trash2, Waves, Wind } from 'lucide-react';
import { useLab } from '../store';
import { PIPETTES, TIPS } from '../data/reagents';
import { hintFor } from '../engine';
import type { PipetteId, TubeState } from '../types';
import { fmtVol, totalVol } from '../lib/tube';
import { PipetteSVG } from './svg/Pipette';
import { TubeSVG } from './svg/Tube';
import { SpinColumnSVG } from './svg/Equipment';

const LOC: Record<string, string> = {
  bench: 'Bench rack',
  hood: 'Fume hood rack',
  heatblock: 'Heat block',
  centrifuge: 'Centrifuge',
  freezer: '−20 °C freezer',
  disposed: 'Disposed',
  columnStand: 'Column holder',
  seated: 'Seated in a tube',
  column: 'Column seated in it',
};

function hintRing(on: boolean) {
  return on ? 'ring-2 ring-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.55)] animate-pulse' : '';
}

function PipetteHand({ id, hint }: { id: PipetteId; hint?: string }) {
  const p = useLab((s) => s.pipettes[id]);
  const setVol = useLab((s) => s.setPipetteVolume);
  const eject = useLab((s) => s.ejectTip);
  const ret = useLab((s) => s.returnPipette);
  const P = PIPETTES[id];
  const [draft, setDraft] = useState(String(p.volume));
  useEffect(() => setDraft(String(p.volume)), [p.volume]);
  const commit = () => {
    const n = Number(draft);
    if (draft !== '' && !Number.isNaN(n)) setVol(n);
    setDraft(String(useLab.getState().pipettes[id].volume));
  };
  const steps = [-10 * P.step, -P.step, P.step, 10 * P.step];

  return (
    <div className="flex gap-3">
      <div className="flex w-9 shrink-0 justify-center pt-1">
        <PipetteSVG id={id} tip={p.tip} load={p.load} volume={p.volume} className="h-40 w-auto drop-shadow-lg" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <div className="text-[14px] font-bold text-white">{id} micropipette</div>
          <div className="text-[11px] text-slate-400">
            Range {P.min}–{P.max} µL · {TIPS[P.tip].label}
          </div>
        </div>
        <div className={`rounded-xl border border-white/10 bg-slate-950/50 p-2 transition ${hintRing(hint === 'ui-volume')}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volume</span>
            <span className="text-[10px] text-slate-500">type or use buttons</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <input
              aria-label="Pipette volume"
              value={draft}
              inputMode="numeric"
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
              }}
              className="w-[84px] rounded-md border border-white/10 bg-black/60 px-2 py-1 text-right font-mono text-[20px] font-bold text-cyan-200 outline-none focus:border-cyan-400"
            />
            <span className="text-[12px] text-slate-400">µL</span>
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {steps.map((d) => (
              <button
                key={d}
                onClick={() => setVol(p.volume + d)}
                className="rounded-md bg-white/5 py-1 font-mono text-[11px] font-semibold text-slate-200 transition hover:bg-white/15 active:scale-95"
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tip</span>
            <span className={p.tip === 'fresh' ? 'font-semibold text-emerald-300' : p.tip === 'used' ? 'font-semibold text-amber-300' : 'text-slate-500'}>
              {p.tip === 'fresh' ? 'Fresh tip' : p.tip === 'used' ? 'Used tip' : 'No tip'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">In tip</span>
            <span className="truncate text-right font-semibold text-slate-200">{p.load ? `${p.load.volume} µL ${p.load.label}` : '—'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={eject}
            disabled={!p.tip}
            className={`rounded-lg bg-orange-500/15 px-2 py-1.5 text-[11.5px] font-semibold text-orange-200 transition hover:bg-orange-500/25 disabled:opacity-35 ${hintRing(
              hint === 'tipwaste',
            )}`}
          >
            Eject tip
          </button>
          <button
            onClick={ret}
            className={`rounded-lg bg-white/5 px-2 py-1.5 text-[11.5px] font-semibold text-slate-200 transition hover:bg-white/10 ${hintRing(hint === 'stand')}`}
          >
            Return to stand
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  id,
  Icon,
  label,
  onClick,
  hint,
  tone = 'default',
}: {
  id: string;
  Icon: ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  hint?: string;
  tone?: 'default' | 'danger' | 'accent';
}) {
  const tones = {
    default: 'bg-white/5 text-slate-100 hover:bg-white/12',
    danger: 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
    accent: 'bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold transition active:scale-95 ${tones[tone]} ${hintRing(hint === id)}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function TubeHand({ tube, hint }: { tube: TubeState; hint?: string }) {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const mixing = !free && step.kind === 'mix' && step.tube === tube.id;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-bold text-white">Holding Tube {tube.id}</div>
        <span className="text-[11px] text-slate-400">{fmtVol(totalVol(tube))}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {tube.column ? (
          <>
            {step.kind === 'recover' && step.tube === tube.id ? (
              <ActionBtn id="ui-collect" Icon={ArrowDownToLine} label="Collect DNA" onClick={() => s.tubeAction('collect')} hint={hint} tone="accent" />
            ) : step.kind === 'seat' && step.tube === tube.id ? (
              <ActionBtn id={`tube-${step.into}`} Icon={ArrowDownToLine} label={`Seat in Tube ${step.into}`} onClick={() => s.click(`tube-${step.into}`)} hint={hint} tone="accent" />
            ) : step.kind === 'decant' && step.tube === tube.id ? (
              <ActionBtn id="ui-decant" Icon={ArrowDownToLine} label="Discard flow-through" onClick={() => s.click('liquidwaste')} hint={hint} tone="accent" />
            ) : step.kind === 'discard' && step.tube === tube.id ? (
              <ActionBtn id="ui-discard" Icon={Trash2} label="Plastic waste" onClick={() => s.click(step.to)} hint={hint} tone="danger" />
            ) : (
              <>
                <ActionBtn id="columnStand" Icon={ArrowDownToLine} label="To holder" onClick={() => s.click('columnStand')} hint={hint} />
                {tube.location === 'seated' ? (
                  <ActionBtn id="ui-putback" Icon={ArrowDownToLine} label="Put down" onClick={() => s.tubeAction('putback')} hint={hint} />
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <ActionBtn id="ui-invert" Icon={RotateCw} label="Invert" onClick={() => s.tubeAction('invert')} hint={hint} tone="accent" />
            <ActionBtn id="ui-flick" Icon={Hand} label="Flick" onClick={() => s.tubeAction('flick')} hint={hint} />
            <ActionBtn id="ui-vortex" Icon={Waves} label="Vortex" onClick={() => s.tubeAction('vortex')} hint={hint} tone="danger" />
            {free ? (
              <>
                <ActionBtn id="ui-dry" Icon={Wind} label="Air-dry" onClick={() => s.tubeAction('dry')} />
                <ActionBtn id="ui-decant" Icon={ArrowDownToLine} label="Pour liquid" onClick={() => s.click((tube.reagents?.pci ?? 0) > 0 ? 'hazwaste' : 'liquidwaste')} />
                <ActionBtn id="ui-putback" Icon={ArrowDownToLine} label="Put down" onClick={() => s.tubeAction('putback')} />
              </>
            ) : step.kind === 'dry' ? (
              <ActionBtn id="ui-dry" Icon={Wind} label="Air-dry" onClick={() => s.tubeAction('dry')} hint={hint} tone="accent" />
            ) : step.kind === 'store' ? (
              <ActionBtn id="ui-store" Icon={Snowflake} label={`Store at ${s.storageTemperature} C`} onClick={() => s.click('freezer')} hint={hint} tone="accent" />
            ) : step.kind === 'spool' ? (
              <ActionBtn id="ui-spool" Icon={Waves} label="Spool" onClick={() => s.tubeAction('spool')} hint={hint} tone="accent" />
            ) : step.kind === 'discard' ? (
              <ActionBtn
                id="ui-discard"
                Icon={Trash2}
                label={step.to === 'hazwaste' ? 'Hazardous waste' : step.to === 'plastics' ? 'Plastic waste' : 'Liquid waste'}
                onClick={() => s.click(step.to)}
                hint={hint}
                tone="danger"
              />
            ) : step.kind === 'decant' ? (
              <ActionBtn id="ui-decant" Icon={ArrowDownToLine} label="Pour supernatant" onClick={() => s.click('liquidwaste')} hint={hint} tone="accent" />
            ) : (
              <ActionBtn id="ui-putback" Icon={ArrowDownToLine} label="Put down" onClick={() => s.tubeAction('putback')} hint={hint} />
            )}
          </>
        )}
      </div>
      {!free && step.kind === 'spool' && (
        <p className="text-[11px] leading-snug text-cyan-200/80">
          Spooling: keep the glass-rod tip at the ethanol interface and twirl slowly. Pulling hard breaks the fibres.
        </p>
      )}
      {!free && step.kind === 'discard' && (
        <p className="text-[11px] leading-snug text-amber-200/80">
          Dispose of the tube in the labeled {step.to === 'hazwaste' ? 'halogenated waste' : step.to === 'plastics' ? 'plastics waste' : 'liquid waste'} stream.
        </p>
      )}
      {!free && step.kind === 'store' && (
        <p className="text-[11px] leading-snug text-sky-200/80">
          Record the concentration and ratios, label the tube, then store it at −20 °C (or −80 °C for longer storage).
        </p>
      )}
      {tube.column && (
        <p className="text-[11px] leading-snug text-slate-500">
          Collection tube: {tube.column.flowThrough > 0 ? `${tube.column.flowThrough} µL of flow-through` : 'empty'} · membrane:{' '}
          {tube.column.bound > 0 ? 'DNA bound ✓' : 'nothing bound'}
        </p>
      )}
      {!free && step.kind === 'recover' && (
        <p className="border-l-2 border-amber-300/40 pl-2 text-[11px] leading-relaxed text-amber-100/80">
          Schematic transition from your notes. Actual silica recovery requires suitable solution conditions; a dry spin alone cannot elute DNA.
        </p>
      )}
      {!free && step.kind === 'store' && (
        <div className="grid grid-cols-2 gap-1.5" aria-label="Storage temperature">
          {([-20, -80] as const).map((t) => (
            <button key={t} onClick={() => s.setStorageTemperature(t)} className={`rounded-lg py-1.5 text-[12px] font-semibold ${s.storageTemperature === t ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}>{t} C</button>
          ))}
        </div>
      )}
      {mixing && (
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-slate-400">
            <span>{step.method === 'invert' ? 'Inversions' : 'Flicks'}</span>
            <span className="font-mono text-slate-200">
              {Math.min(s.progress.count ?? 0, step.count)}/{step.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.min(100, ((s.progress.count ?? 0) / step.count) * 100)}%` }} />
          </div>
        </div>
      )}
      <p className="text-[11px] leading-snug text-slate-500">Click a rack, an instrument or a waste container in the lab to put the tube there.</p>
    </div>
  );
}

function layerName(t: TubeState, idx: number, n: number) {
  const l = t.layers[idx];
  if (l.secret && !t.revealed) return idx === n - 1 ? 'Upper layer — ?' : idx === 0 ? 'Lower layer — ?' : 'Thin middle band — ?';
  return l.label;
}

export function HandPanel() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const hint = s.hints ? hintFor(step, s)?.target : undefined;
  const held = s.held;
  let focusId = held?.kind === 'tube' ? held.id : s.focus;
  if (s.tubes[focusId].location === 'disposed') {
    const alt = (['A', 'B', 'C'] as const).find((id) => s.tubes[id].location !== 'disposed');
    if (alt) focusId = alt;
  }
  const tube = s.tubes[focusId];
  const isHeldTube = held?.kind === 'tube' && held.id === tube.id;
  const anim = isHeldTube && s.anim.kind ? `anim-${s.anim.kind}` : '';
  const n = tube.layers.length;

  return (
    <div className="thin-scroll flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-3.5 shadow-xl backdrop-blur">
        <div className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          <Hand size={13} /> Your hands
        </div>
        {held?.kind === 'pipette' && <PipetteHand id={held.id} hint={hint} />}
        {held?.kind === 'tube' && <TubeHand tube={s.tubes[held.id]} hint={hint} />}
        {!held && (
          <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-white/10 p-3 text-[12px] leading-relaxed text-slate-400">
            <MousePointerClick size={16} className="mt-0.5 shrink-0 text-slate-500" />
            <span>Your hands are free. Click a pipette or a tube on the bench to pick it up.</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-3.5 shadow-xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tube inspector</span>
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${isHeldTube ? 'bg-cyan-400/15 text-cyan-200' : 'bg-white/5 text-slate-400'}`}>
            {isHeldTube ? 'In your hand' : LOC[tube.location]}
          </span>
        </div>
        <div className="flex gap-3">
          <div className="w-[78px] shrink-0">
            <div key={`${s.anim.key}-${anim}`} className={anim}>
              {tube.column ? (
                <SpinColumnSVG
                  level={tube.layers.length ? Math.min(1, tube.layers[0].volume / 750) : 0}
                  liquid={tube.layers[0]?.color}
                  membrane={!tube.layers.length}
                  seated={tube.location === 'seated'}
                  className="mx-auto block h-auto w-[62%]"
                />
              ) : (
                <TubeSVG
                  layers={tube.layers}
                  pellet={tube.pellet}
                  strands={tube.strands}
                  lidOpen={tube.lidOpen}
                  label={tube.id}
                  showGrad
                  className="block h-auto w-full"
                />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-white">{tube.name}</div>
            <div className="text-[11.5px] text-slate-400">Total volume: {fmtVol(totalVol(tube))}</div>
            <ul className="mt-2 space-y-1.5">
              {tube.layers
                .map((l, i) => ({ l, i }))
                .reverse()
                .map(({ l, i }) => (
                  <li key={l.key} className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-300">
                    <span className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-white/30" style={{ background: l.color, opacity: Math.max(0.5, l.opacity) }} />
                    <span>
                      {layerName(tube, i, n)} <span className="text-slate-500">· {Math.round(l.volume)} µL</span>
                    </span>
                  </li>
                ))}
              {tube.layers.length === 0 && !tube.pellet && <li className="text-[11.5px] text-slate-500">Empty</li>}
              {tube.pellet && (
                <li className="flex items-start gap-2 text-[11.5px] text-slate-300">
                  <span className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                  DNA pellet ({tube.pellet === 'wet' ? 'white, wet' : tube.pellet === 'dry' ? 'translucent, dry' : 'glassy, over-dried'})
                </li>
              )}
              {tube.strands && <li className="text-[11.5px] font-semibold text-cyan-200">✦ White DNA strands visible!</li>}
              {tube.unmixed && <li className="text-[11.5px] text-amber-200/80">Not mixed yet</li>}
            </ul>
          </div>
        </div>
        {tube.contents.length > 0 && (
          <details className="mt-2.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-slate-400">
            <summary className="cursor-pointer font-semibold text-slate-300">What's been added</summary>
            <ul className="mt-1 space-y-0.5">
              {tube.contents.map((c, i) => (
                <li key={i}>
                  + {c.volume} µL {c.name}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
