import { BookOpen, FlaskConical, RotateCcw, ScrollText, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useLab } from '../store';
import { PICTURE_FLOWS, PRESET_NOTE } from '../data/pictureFlow';
import { fmtClock, totalVol } from '../lib/tube';

export function FreeLabPanel() {
  const s = useLab();
  const [tab, setTab] = useState<'reference' | 'notebook'>('reference');
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-900/70">
      <div className="shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300"><Unlock size={14} /> Free lab</div>
        <h2 className="mt-1 text-lg font-bold text-white">The bench is yours.</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-400">Choose any equipment or reagent. No step locks or score penalties. Your experiment report is saved separately.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => s.openModal('report')} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-white/10">Saved report</button>
          <button
            disabled={s.busy}
            onClick={() => { if (window.confirm('Reset the practice tubes? Your completed experiment report will stay saved.')) s.resetPracticeBench(); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-400/15 px-3 py-2 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-400/25 disabled:opacity-40"
          ><RotateCcw size={13} /> Reset bench</button>
        </div>
      </div>
      <div className="shrink-0 space-y-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><FlaskConical size={12} /> Samples</div>
        {(['A', 'B', 'C'] as const).map((id) => {
          const t = s.tubes[id];
          const stored = t.location === 'freezer' || t.location === 'heatblock';
          return (
            <div key={id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-slate-300">Tube {id} <span className="text-slate-500">{t.location === 'disposed' ? 'not on bench' : `${totalVol(t)} µL${t.location === 'freezer' ? ' · stored' : ''}`}</span></span>
              <button
                disabled={s.busy || !!s.held}
                onClick={() => stored ? s.retrieveTube(id) : s.freshPracticeTube(id, id === 'A')}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-white/5 disabled:opacity-35"
              >{stored ? 'Retrieve' : id === 'A' ? 'Fresh sample' : 'New empty tube'}</button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 gap-1 border-b border-white/10 p-1.5">
        <button onClick={() => setTab('reference')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold ${tab === 'reference' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><BookOpen size={13} /> Picture reference</button>
        <button onClick={() => setTab('notebook')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold ${tab === 'notebook' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><ScrollText size={13} /> Notebook</button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'reference' ? (
          <>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              The latest two study pages are the reference for method {s.exp.n}. The 100% precipitation and 70% washing steps are different. Nothing in this reference locks the free bench.
            </p>
            <ol className="space-y-3">
              {PICTURE_FLOWS[s.expId].map((step, i) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="w-4 shrink-0 pt-0.5 font-mono text-[10px] text-emerald-400/70">{String(i + 1).padStart(2, '0')}</span>
                  <div><div className="text-[12px] font-semibold text-slate-200">{step.title}</div><p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{step.detail}</p></div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-white/10 pt-3 text-[10.5px] leading-relaxed text-slate-500">{PRESET_NOTE}</p>
          </>
        ) : (
          <div className="space-y-2" role="log" aria-label="Free lab notebook">
            {[...s.log].reverse().map((entry) => (
              <p key={entry.id} className="text-[11.5px] leading-relaxed text-slate-300"><span className="mr-2 font-mono text-[10px] text-slate-500">{fmtClock(entry.time)}</span>{entry.text}</p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}