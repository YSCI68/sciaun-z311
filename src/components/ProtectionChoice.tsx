import { ShieldCheck } from 'lucide-react';
import { useLab } from '../store';

export function ProtectionChoice() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  if (s.mode !== 'guided' || step.id !== 'dnase-protection') return null;
  const method = step.kind === 'heat' ? 'heat' : 'edta';
  const locked = s.busy || !!s.modal || !!s.held || !!s.progress.dispensed || !!s.progress.completed;
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-l-2 border-amber-300/50 bg-amber-300/[0.05] px-3 py-2" aria-label="DNase protection choices">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-100"><ShieldCheck size={13} /> Step 2: keep DNase inactive</span>
        <span className="text-[10.5px] text-slate-400">Your notes offer chelation or heating. Choose one before handling the sample.</span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Choose DNase protection method">
        <button type="button" disabled={locked} aria-pressed={method === 'edta'} onClick={() => s.chooseProtection('edta')}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold disabled:opacity-50 ${method === 'edta' ? 'bg-amber-200 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}>Chelating agent</button>
        <button type="button" disabled={locked} aria-pressed={method === 'heat'} onClick={() => s.chooseProtection('heat')}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold disabled:opacity-50 ${method === 'heat' ? 'bg-amber-200 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}>Heating</button>
      </div>
    </div>
  );
}