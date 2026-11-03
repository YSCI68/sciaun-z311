import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Pipette, TriangleAlert } from 'lucide-react';
import { useLab } from '../../store';
import { clamp, volToY } from '../../lib/tube';
import { TubeSVG } from '../svg/Tube';
import { Modal } from './Modal';

type Status = 'aim' | 'air' | 'drawing' | 'fail' | 'done';
const VB = { x: 0, y: 62, w: 76, h: 100 };

export function AspirateModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const mode = step.kind === 'pipette' && step.aspireMode === 'pellet' ? 'pellet' : 'phase';
  const sourceId = step.kind === 'pipette' && (step.source === 'A' || step.source === 'B' || step.source === 'C') ? step.source : 'A';
  const pid = s.held?.kind === 'pipette' ? s.held.id : 'P1000';
  const V = s.pipettes[pid].volume;
  const tube = s.tubes[sourceId];
  const org = mode === 'pellet' ? tube.layers.find((l) => l.key === 'prot')?.volume ?? 200 : tube.layers.find((l) => l.key === 'organic')?.volume ?? 520;
  const inter = tube.layers.find((l) => l.key === 'interphase')?.volume ?? 0;
  const fluidKey = mode === 'pellet' ? 'sup' : 'aqueous';
  const aq = tube.layers.find((l) => l.key === fluidKey)?.volume ?? 490;
  const total = org + inter + aq;

  const interTop = volToY(org + inter);
  const interBot = volToY(org);
  const hReal = interBot - interTop;
  const dangerY = mode === 'pellet' ? volToY(org) + 1.5 : hReal < 3.2 ? interTop - (3.2 - hReal) / 2 : interTop;
  const orgTopY = volToY(org);
  const finalY = volToY(total - V);

  const svgRef = useRef<SVGSVGElement>(null);
  const [tipY, setTipY] = useState(70);
  const [drawn, setDrawn] = useState(0);
  const [holding, setHolding] = useState(false);
  const [status, setStatus] = useState<Status>('aim');
  const [failZone, setFailZone] = useState<'interphase' | 'organic'>('interphase');
  const tipRef = useRef(tipY);
  const drawnRef = useRef(0);
  const statusRef = useRef<Status>('aim');
  const airCounted = useRef(false);
  tipRef.current = tipY;
  statusRef.current = status;

  const meniscusY = volToY(total - drawn);
  const touching = mode === 'phase' && tipY >= dangerY - 0.2;
  const inPellet = mode === 'pellet' && tipY >= dangerY;

  const toSvgY = (clientY: number) => {
    const el = svgRef.current;
    if (!el) return tipRef.current;
    const r = el.getBoundingClientRect();
    const scale = Math.min(r.width / VB.w, r.height / VB.h);
    const offY = (r.height - VB.h * scale) / 2;
    return clamp(VB.y + (clientY - r.top - offY) / scale, VB.y + 2, 186);
  };

  useEffect(() => {
    if (!holding) return;
    let raf = 0;
    let last = performance.now();
    const rate = V / 3.0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (statusRef.current === 'fail' || statusRef.current === 'done') return;
      const ty = tipRef.current;
      const curMen = volToY(total - drawnRef.current);
      if (mode === 'pellet' ? ty >= dangerY : ty >= dangerY - 0.2) {
        setFailZone(mode === 'pellet' ? 'organic' : ty >= orgTopY ? 'organic' : 'interphase');
        setStatus('fail');
        setHolding(false);
        return;
      }
      if (ty < curMen + 0.5) {
        if (!airCounted.current) {
          airCounted.current = true;
          useLab.getState().airBubble();
        }
        setStatus('air');
      } else {
        airCounted.current = false;
        drawnRef.current = Math.min(V, drawnRef.current + rate * dt);
        setDrawn(drawnRef.current);
        if (drawnRef.current >= V) {
          setStatus('done');
          setHolding(false);
          return;
        }
        setStatus('drawing');
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);

  useEffect(() => {
    if (status !== 'done') return;
    const id = window.setTimeout(() => useLab.getState().aspirateOutcome('ok'), 900);
    return () => window.clearTimeout(id);
  }, [status]);

  const reset = () => {
    drawnRef.current = 0;
    setDrawn(0);
    setTipY(70);
    setStatus('aim');
    setHolding(false);
  };

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (status === 'fail' || status === 'done') return;
    try {
      // synthetic or interrupted pointers can refuse capture; the drag still works without it
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setTipY(toSvgY(e.clientY));
    setHolding(true);
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (status === 'fail' || status === 'done') return;
    setTipY(toSvgY(e.clientY));
  };
  const onUp = () => setHolding(false);

  // tip geometry
  const tipTop = tipY - 72;
  const fillTop = tipY - 2 - 46 * (drawn / Math.max(V, 1));

  const statusBox = {
    aim: {
      cls: 'border-white/10 bg-white/[0.03] text-slate-300',
      text:
        mode === 'pellet'
          ? 'Hover over the tube to position the tip in the supernatant, well ABOVE the white protein pellet. Then press and hold to draw.'
          : 'Hover over the tube to position the tip in the UPPER (aqueous) phase. Then press and hold the mouse button to release the plunger slowly.',
    },
    drawing: { cls: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100', text: 'Drawing up liquid… keep the tip just under the falling surface!' },
    air: { cls: 'border-amber-400/40 bg-amber-400/10 text-amber-100', text: 'Air bubbles! The surface has dropped below your tip. Move the tip down a little and keep holding.' },
    done: {
      cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
      text: mode === 'pellet'
        ? `Perfect: ${V} µL of supernatant collected without disturbing the protein pellet.`
        : `Perfect: ${V} µL of clean aqueous phase, and the interphase is untouched.`,
    },
    fail: { cls: 'border-rose-400/50 bg-rose-500/10 text-rose-100', text: '' },
  }[status];

  return (
    <Modal
      title={mode === 'pellet' ? 'Transfer the supernatant' : 'Transfer the aqueous phase'}
      subtitle={`${pid} set to ${V} µL · Tube ${sourceId}${mode === 'pellet' ? ' after salting out' : ', inside the fume hood'}`} icon={<Pipette size={18} />} onClose={status === 'done' ? undefined : s.closeModal} width="max-w-3xl">
      <div
        className="grid gap-5 outline-none md:grid-cols-[300px_minmax(0,1fr)]"
        tabIndex={0}
        onKeyDown={(e) => {
          if (status === 'fail' || status === 'done') return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setTipY((y) => clamp(y + 0.6, VB.y + 2, 186));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setTipY((y) => clamp(y - 0.6, VB.y + 2, 186));
          }
          if (e.key === ' ') {
            e.preventDefault();
            setHolding(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ') setHolding(false);
        }}
      >
        <div className="relative mx-auto h-[min(400px,58vh)] w-full max-w-[300px] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 ring-1 ring-white/20">
          <div className="pointer-events-none absolute inset-0">
            <TubeSVG
              viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
              layers={tube.layers.map((l) => (l.key === fluidKey ? { ...l, volume: Math.max(0, l.volume - drawn) } : l))}
              lidOpen
              className="h-full w-full"
            />
          </div>
          <svg
            ref={svgRef}
            viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ cursor: 'ns-resize' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          >
            <defs>
              <clipPath id="aspTipClip">
                <path d={`M${30 - 0.6},${tipY} L${30 + 0.6},${tipY} L${30 + 5},${tipTop} L${30 - 5},${tipTop} Z`} />
              </clipPath>
            </defs>
            {s.hints && status !== 'fail' && (
              <g>
                <rect x="14" y={finalY} width="32" height={Math.max(0, dangerY - finalY)} fill="#22d3ee" opacity="0.13" />
                <line x1="12" x2="48" y1={finalY} y2={finalY} stroke="#0891b2" strokeWidth="0.45" strokeDasharray="1.4 1" />
                <line x1="12" x2="48" y1={dangerY} y2={dangerY} stroke="#e11d48" strokeWidth="0.5" strokeDasharray="1.4 1" />
                <text x="49" y={finalY + 1} fontSize="2.8" fill="#0e7490" fontFamily="Inter" fontWeight="700">
                  level after {V} µL
                </text>
                <text x="49" y={dangerY + 1} fontSize="2.8" fill="#be123c" fontFamily="Inter" fontWeight="700">
                  {mode === 'pellet' ? 'protein pellet: stay above!' : 'interphase: stop!'}
                </text>
              </g>
            )}
            <text x="49" y={Math.min(meniscusY, finalY) - 4} fontSize="2.8" fill="#334155" fontFamily="Inter" fontWeight="600">
              aqueous (DNA)
            </text>
            <text x="49" y={orgTopY + 8} fontSize="2.8" fill="#92400e" fontFamily="Inter" fontWeight="600">
              {mode === 'pellet' ? 'protein pellet' : 'organic phase'}
            </text>
            {/* pipette tip */}
            <path
              d={`M${30 - 0.6},${tipY} L${30 + 0.6},${tipY} L${30 + 5},${tipTop} L${30 - 5},${tipTop} Z`}
              fill="rgba(147,197,253,0.55)"
              stroke={touching || inPellet ? '#e11d48' : '#2563eb'}
              strokeWidth="0.45"
            />
            {drawn > 0 && (
              <g clipPath="url(#aspTipClip)">
                <rect x="20" y={fillTop} width="20" height={tipY - fillTop} fill="#f4ecd0" opacity="0.95" />
              </g>
            )}
            {status === 'air' && (
              <g fill="none" stroke="#fff" strokeWidth="0.35">
                <circle cx="30" cy={tipY - 4} r="0.8" />
                <circle cx="30.4" cy={tipY - 7} r="0.6" />
                <circle cx="29.6" cy={tipY - 9.5} r="0.5" />
              </g>
            )}
            <circle cx="30" cy={tipY} r="0.55" fill={touching || inPellet ? '#e11d48' : '#1d4ed8'} />
          </svg>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-200">
            in tip: {Math.round(drawn)} / {V} µL
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ol className="space-y-1.5 text-[12.5px] leading-snug text-slate-300">
            <li>
              <span className="font-bold text-cyan-300">1.</span> Move the mouse up/down over the tube to place the tip just <b>under the surface</b> of the upper phase.
            </li>
            <li>
              <span className="font-bold text-cyan-300">2.</span> <b>Press and hold</b> to draw the liquid up.
            </li>
            <li>
              <span className="font-bold text-cyan-300">3.</span> While holding, <b>follow the surface down</b>, but <b>never touch</b>{' '}
              {mode === 'pellet' ? 'the protein pellet.' : 'the white interphase.'}
            </li>
          </ol>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width]" style={{ width: `${(drawn / V) * 100}%` }} />
          </div>

          {status !== 'fail' ? (
            <div className={`rounded-xl border p-3 text-[12.5px] leading-relaxed ${statusBox.cls}`}>
              {(touching || inPellet) && status === 'aim' ? (
                <span className="flex items-start gap-1.5 text-rose-200">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" /> Your tip is in the{' '}
                  {mode === 'pellet' ? 'protein pellet' : 'interphase'}. Raise it before you draw!
                </span>
              ) : (
                statusBox.text
              )}
            </div>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-rose-400/50 bg-rose-500/10 p-3">
              <div className="flex items-center gap-2 text-[14px] font-bold text-rose-100">
                <TriangleAlert size={16} />{' '}
                {mode === 'pellet' ? 'You touched the protein pellet!' : failZone === 'interphase' ? 'You touched the interphase!' : 'You went through into the phenol phase!'}
              </div>
              <p className="text-[12.5px] leading-relaxed text-rose-50/90">
                {mode === 'pellet'
                  ? 'Loose protein pellet was sucked into your tip. Carrying it over lowers the purity of your DNA (A260/A280 drops below 1.8).'
                  : failZone === 'interphase'
                    ? 'White, denatured protein was sucked into your tip. Carrying it over will lower the purity of your DNA (A260/A280 drops below 1.8).'
                    : 'Phenol:chloroform entered the tip. Phenol carry-over inhibits enzymes and distorts UV readings (A260/A230 drops).'}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => {
                    useLab.getState().aspirateOutcome(failZone, false);
                    reset();
                  }}
                  className="rounded-lg bg-white px-3 py-2 text-[12.5px] font-bold text-slate-900 hover:bg-slate-200"
                >
                  Dispense back & try again
                </button>
                <button
                  onClick={() => useLab.getState().aspirateOutcome(failZone, true)}
                  className="rounded-lg bg-rose-500/25 px-3 py-2 text-[12.5px] font-bold text-rose-100 hover:bg-rose-500/40"
                >
                  Keep it anyway (contaminated)
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
            <span>Fine control:</span>
            <button onClick={() => setTipY((y) => clamp(y - 0.6, VB.y + 2, 186))} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10" aria-label="Raise tip">
              <ChevronUp size={15} />
            </button>
            <button onClick={() => setTipY((y) => clamp(y + 0.6, VB.y + 2, 186))} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10" aria-label="Lower tip">
              <ChevronDown size={15} />
            </button>
            <span className="text-slate-500">or ↑/↓ keys + hold Space</span>
          </div>
          <p className="mt-auto text-[11.5px] leading-snug text-slate-500">
            {mode === 'pellet'
              ? 'Real-lab tip: with a loose salt-precipitated pellet it is better to leave supernatant behind than to disturb the pellet.'
              : 'Real-lab tip: it is better to leave ~50 µL of aqueous phase behind than to risk the interphase.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
