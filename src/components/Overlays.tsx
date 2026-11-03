import { useEffect, useState } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useLab } from '../store';
import type { Toast } from '../types';
import { PipetteSVG } from './svg/Pipette';
import { TubeSVG } from './svg/Tube';
import { SpinColumnSVG } from './svg/Equipment';

/** Renders whatever you are holding at the mouse position while over the bench. */
export function CursorItem() {
  const held = useLab((s) => s.held);
  const modal = useLab((s) => s.modal);
  const pip = useLab((s) => (s.held?.kind === 'pipette' ? s.pipettes[s.held.id] : null));
  const tube = useLab((s) => (s.held?.kind === 'tube' ? s.tubes[s.held.id] : null));
  const [pos, setPos] = useState({ x: -9999, y: -9999, h: 420, inScene: false });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = e.target as Element | null;
      const scene = (el?.closest?.('[data-scene]') as HTMLElement | null) ?? null;
      setPos({ x: e.clientX, y: e.clientY, h: scene ? scene.getBoundingClientRect().height : 420, inScene: !!scene });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  if (!held || modal || !pos.inScene) return null;

  if (held.kind === 'pipette' && pip) {
    const h = pos.h * 0.36;
    const w = (h * 40) / 230;
    return (
      <div className="pointer-events-none fixed z-[70]" style={{ left: pos.x - w / 2, top: pos.y - h * (227 / 230), width: w, height: h }}>
        <PipetteSVG id={held.id} tip={pip.tip} load={pip.load} volume={pip.volume} className="h-full w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]" />
        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/80 ring-2 ring-cyan-300/30" />
      </div>
    );
  }
  if (held.kind === 'tube' && tube) {
    if (tube.column) {
      const h = pos.h * 0.24;
      const w = (h * 56) / 200;
      return (
        <div className="pointer-events-none fixed z-[70]" style={{ left: pos.x + 6, top: pos.y - h * 0.5, width: w, height: h }}>
          <SpinColumnSVG
            level={tube.layers.length ? Math.min(1, tube.layers[0].volume / 750) : 0}
            liquid={tube.layers[0]?.color}
            membrane={!tube.layers.length}
            seated={tube.location === 'seated'}
            className="h-full w-full -rotate-6 drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
          />
        </div>
      );
    }
    const h = pos.h * 0.19;
    const w = (h * 76) / 200;
    return (
      <div className="pointer-events-none fixed z-[70]" style={{ left: pos.x + 6, top: pos.y - h * 0.55, width: w, height: h }}>
        <TubeSVG
          layers={tube.layers}
          pellet={tube.pellet}
          strands={tube.strands}
          label={tube.id}
          className="h-full w-full -rotate-6 drop-shadow-[0_8px_10px_rgba(0,0,0,0.5)]"
        />
      </div>
    );
  }
  return null;
}

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useLab((s) => s.dismissToast);
  useEffect(() => {
    const ms = t.kind === 'mistake' ? 7500 : t.kind === 'warning' ? 5500 : t.kind === 'success' ? 2600 : 4500;
    const id = window.setTimeout(() => dismiss(t.id), ms);
    return () => window.clearTimeout(id);
  }, [t.id, t.kind, dismiss]);

  const styles = {
    success: 'border-emerald-400/40 bg-emerald-950/90 text-emerald-50',
    info: 'border-sky-400/30 bg-slate-900/95 text-slate-100',
    warning: 'border-amber-400/40 bg-amber-950/90 text-amber-50',
    mistake: 'border-rose-400/50 bg-rose-950/95 text-rose-50',
  }[t.kind];
  const Icon = t.kind === 'success' ? CircleCheck : t.kind === 'info' ? Info : TriangleAlert;
  const iconColor = { success: 'text-emerald-300', info: 'text-sky-300', warning: 'text-amber-300', mistake: 'text-rose-300' }[t.kind];

  return (
    <div className={`toast-in pointer-events-none flex items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-2xl backdrop-blur ${styles}`}>
      <Icon size={17} className={`mt-0.5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px] font-bold">
          {t.title}
          {t.penalty ? <span className="rounded-md bg-rose-500/30 px-1.5 py-[1px] font-mono text-[10.5px] text-rose-100">−{t.penalty}</span> : null}
        </div>
        {t.text && <div className="mt-0.5 text-[12px] leading-snug opacity-90">{t.text}</div>}
      </div>
      <button onClick={() => dismiss(t.id)} className="pointer-events-auto shrink-0 rounded p-0.5 opacity-60 hover:bg-white/10 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useLab((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed left-1/2 top-[58px] z-[80] flex w-[min(430px,92vw)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
