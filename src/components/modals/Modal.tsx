import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  subtitle,
  icon,
  children,
  onClose,
  width = 'max-w-3xl',
  closeDisabled,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  width?: string;
  closeDisabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className={`pop flex max-h-[96vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/70`}>
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/50 px-5 py-3">
          {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold text-white">{title}</h3>
            {subtitle && <p className="truncate text-[12px] text-slate-400">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={closeDisabled}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  step,
  big,
  format,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  big?: number;
  format?: (v: number) => string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="font-mono text-[18px] font-bold text-cyan-200">
          {format ? format(value) : value} <span className="text-[12px] text-slate-400">{unit}</span>
        </span>
      </div>
      <input type="range" aria-label={label} className="lab-range mt-2.5 w-full" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
      <div className="mt-2 flex gap-1">
        {big && (
          <button onClick={() => set(value - big)} className="flex-1 rounded-md bg-white/5 py-1 font-mono text-[11px] text-slate-200 hover:bg-white/10">
            −{big}
          </button>
        )}
        <button onClick={() => set(value - step)} className="flex-1 rounded-md bg-white/5 py-1 font-mono text-[11px] text-slate-200 hover:bg-white/10">
          −{step}
        </button>
        <button onClick={() => set(value + step)} className="flex-1 rounded-md bg-white/5 py-1 font-mono text-[11px] text-slate-200 hover:bg-white/10">
          +{step}
        </button>
        {big && (
          <button onClick={() => set(value + big)} className="flex-1 rounded-md bg-white/5 py-1 font-mono text-[11px] text-slate-200 hover:bg-white/10">
            +{big}
          </button>
        )}
      </div>
    </div>
  );
}
