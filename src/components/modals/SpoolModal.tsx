import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { CircleCheck, TriangleAlert, Waves } from 'lucide-react';
import { useLab } from '../../store';
import { clamp, volToY } from '../../lib/tube';
import { sfx } from '../../lib/sfx';
import { TubeSVG } from '../svg/Tube';
import { Modal } from './Modal';

const VB = { x: 0, y: 40, w: 76, h: 130 };

export function SpoolModal() {
  const s = useLab();
  const st = s.steps[s.stepIndex];
  const need = st.kind === 'spool' ? st.need : 3;
  const tube = s.tubes.B;

  const aqVol = tube.layers.find((l) => l.key === 'aq')?.volume ?? 390;
  const total = tube.layers.reduce((a, l) => a + l.volume, 0);
  const interfaceY = volToY(aqVol);
  const [rodY, setRodY] = useState(interfaceY - 16);
  const [holding, setHolding] = useState(false);
  const [fibers, setFibers] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [twirl, setTwirl] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const rodRef = useRef(rodY);
  const fibRef = useRef(0);
  rodRef.current = rodY;

  useEffect(() => {
    if (!holding) return;
    setTwirl(true);
    const id = window.setInterval(() => {
      const dist = Math.abs(rodRef.current - interfaceY);
      if (dist > 14) {
        if (fibRef.current > 0) {
          fibRef.current -= 1;
          setFibers(fibRef.current);
          setMsg({ ok: false, text: 'You pulled too hard — the fibre snapped and slipped off the rod. Keep the tip at the interface.' });
          sfx.mistake();
        }
        return;
      }
      if (dist > 6) return; // close, but not enough to wind
      fibRef.current += 1;
      setFibers(fibRef.current);
      sfx.pick();
      useLab.getState().spoolFiber();
      if (fibRef.current >= need) {
        setMsg({ ok: true, text: `You wound ${need} continuous fibres of genomic DNA onto the rod. That is your DNA — visible to the naked eye!` });
        setHolding(false);
        setTwirl(false);
      }
    }, 620);
    return () => {
      window.clearInterval(id);
      setTwirl(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding, interfaceY, need]);

  const toSvgY = (clientY: number) => {
    const el = svgRef.current;
    if (!el) return rodRef.current;
    const r = el.getBoundingClientRect();
    const scale = Math.min(r.width / VB.w, r.height / VB.h);
    const offY = (r.height - VB.h * scale) / 2;
    return clamp(VB.y + (clientY - r.top - offY) / scale, VB.y + 4, VB.y + VB.h - 3);
  };

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (msg?.ok) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setRodY(toSvgY(e.clientY));
    setHolding(true);
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (msg?.ok) return;
    setRodY(toSvgY(e.clientY));
  };
  const onUp = () => setHolding(false);

  const done = !!s.progress.done;

  return (
    <Modal
      title="Spool the DNA fibres"
      subtitle="Glass rod · Tube B · ethanol layered on top"
      icon={<Waves size={18} />}
      onClose={s.closeModal}
      width="max-w-3xl"
    >
      <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[min(380px,56vh)] w-full max-w-[300px] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 ring-1 ring-white/20">
          <div className="pointer-events-none absolute inset-0">
            <TubeSVG viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} layers={tube.layers} strands={tube.strands} lidOpen className="h-full w-full" />
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
            {/* target band */}
            <rect x="12" y={interfaceY - 6} width="30" height="12" fill="#22d3ee" opacity="0.16" />
            <line x1="10" x2="46" y1={interfaceY} y2={interfaceY} stroke="#0891b2" strokeWidth="0.4" strokeDasharray="1.4 1" />
            <text x="47" y={interfaceY + 1} fontSize="2.8" fill="#0e7490" fontWeight="700" fontFamily="Inter">
              interface
            </text>
            <text x="47" y={volToY(total) + 3} fontSize="2.8" fill="#475569" fontWeight="600" fontFamily="Inter">
              ethanol
            </text>

            {/* rod */}
            <g className={twirl ? 'rotor-spinup' : ''} style={{ transformOrigin: `30px ${interfaceY}px` }}>
              <line x1="30" y1="43" x2="30" y2={rodY} stroke="#64748b" strokeWidth="1.8" />
              <line x1="29.4" y1="43" x2="29.4" y2={rodY - 1} stroke="#fff" strokeWidth="0.45" />
              <circle cx="30" cy="43" r="3.4" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
              {fibers > 0 && (
                <g fill="none" stroke="#fff" strokeWidth="1.15" opacity="0.9">
                  {Array.from({ length: Math.min(fibers, 6) }, (_, i) => (
                    <ellipse key={i} cx="30" cy={rodY - 7 - i * 2.3} rx={4.4 + i * 0.4} ry="1.8" />
                  ))}
                </g>
              )}
            </g>
            <circle cx="4" cy={rodY} r="0.7" fill={Math.abs(rodY - interfaceY) < 6 ? '#059669' : '#e11d48'} />
          </svg>
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 font-mono text-[11px] text-slate-200">
            fibres on rod: {fibers} / {need}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ol className="space-y-1.5 text-[12.5px] leading-snug text-slate-300">
            <li>
              <span className="font-bold text-cyan-300">1.</span> Move the mouse to lower the glass rod towards the tube.
            </li>
            <li>
              <span className="font-bold text-cyan-300">2.</span> Put the rod tip into the cyan band at the <b>ethanol / aqueous interface</b>, where the DNA fibres
              have precipitated.
            </li>
            <li>
              <span className="font-bold text-cyan-300">3.</span> <b>Press and hold</b> to twirl the rod. Keep it steady in the band until you have {need} fibres.
            </li>
          </ol>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width]" style={{ width: `${Math.min(100, (fibers / need) * 100)}%` }} />
          </div>

          {msg && (
            <div
              className={`flex gap-2 rounded-xl border p-3 text-[12.5px] leading-relaxed ${
                msg.ok ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50' : 'border-amber-400/40 bg-amber-400/10 text-amber-50'
              }`}
            >
              {msg.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />}
              <span>{msg.text}</span>
            </div>
          )}
          {!msg && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-slate-300">
              The white threads sit right at the boundary between the ethanol and the salty DNA solution. Keep the rod still and let the rotation wind them up.
            </div>
          )}

          {done && (
            <button
              onClick={() => {
                useLab.getState().finishQuiz();
              }}
              className="rounded-xl bg-emerald-400 px-5 py-2.5 text-[13px] font-bold text-slate-950 hover:bg-emerald-300"
            >
              Continue — now pellet the rest of the DNA →
            </button>
          )}
          <p className="mt-auto text-[11.5px] leading-snug text-slate-500">
            Spooling only recovers part of the DNA. In the next step you will centrifuge the tube so the remaining precipitated DNA forms a compact pellet (Figure
            6.8).
          </p>
        </div>
      </div>
    </Modal>
  );
}
