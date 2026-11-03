import {
  Check,
  Clock,
  FlaskConical,
  Glasses,
  Hand,
  Lightbulb,
  LightbulbOff,
  LogOut,
  Shirt,
  Star,
  TriangleAlert,
  Volume2,
  VolumeX,
  Unlock,
} from 'lucide-react';
import { useLab } from '../store';
import { fmtClock } from '../lib/tube';
import { FullscreenButton } from './FullscreenButton';

export function TopBar() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const stageIdx = s.stages.findIndex((x) => x.id === step.stage);
  const penalty = s.mistakes.reduce((a, m) => a + m.penalty, 0);
  const score = Math.max(0, 100 - penalty);
  const pct = Math.round(((s.stepIndex + (s.progress.completed ? 1 : 0)) / s.steps.length) * 100);
  const ppe = [
    { on: s.ppe.coat, Icon: Shirt, name: 'Lab coat' },
    { on: s.ppe.gloves, Icon: Hand, name: 'Gloves' },
    { on: s.ppe.goggles, Icon: Glasses, name: 'Goggles' },
  ];

  return (
    <header className="relative z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/85 px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20">
          <FlaskConical size={18} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-bold text-white">MB Virtual Lab</div>
          <div className="truncate text-[11px] text-slate-400">
            {free ? 'Free lab · completed result saved' : `Exp ${s.exp.n} · ${s.exp.sub}`}
          </div>
        </div>
      </div>

      <nav className="mx-auto hidden items-center gap-1 xl:flex" aria-label={free ? 'Lab mode' : 'Experiment stages'}>
        {free ? <span className="flex items-center gap-2 text-[12px] font-semibold text-emerald-300"><Unlock size={14} /> Free practice · picture reference only</span> : s.stages.map((st, i) => {
          const done = i < stageIdx;
          const cur = i === stageIdx;
          return (
            <div
              key={st.id}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                done ? 'bg-emerald-500/15 text-emerald-300' : cur ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/50' : 'text-slate-500'
              }`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${
                  done ? 'bg-emerald-400 text-slate-950' : cur ? 'bg-cyan-300 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {done ? <Check size={10} strokeWidth={3.5} /> : i + 1}
              </span>
              {st.short}
            </div>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 xl:ml-0">
        <div className="hidden items-center gap-0.5 rounded-lg bg-white/5 px-1.5 py-1 sm:flex" title="Personal protective equipment">
          {ppe.map(({ on, Icon, name }) => (
            <span key={name} title={`${name}: ${on ? 'on' : 'not worn'}`} className={`grid h-6 w-6 place-items-center rounded-md ${on ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-600'}`}>
              <Icon size={14} />
            </span>
          ))}
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 font-mono text-[12px] text-slate-200 md:flex" title="Lab clock (simulated time)">
          <Clock size={13} className="text-slate-400" />
          {fmtClock(s.simTime)}
        </div>
        {!free && <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-[12px]" title="Score: you lose points for each mistake">
          <Star size={13} className="text-amber-300" fill="currentColor" />
          <span className="font-bold text-white">{score}</span>
          {s.mistakes.length > 0 && (
            <span className="flex items-center gap-0.5 text-rose-300">
              <TriangleAlert size={12} />
              {s.mistakes.length}
            </span>
          )}
        </div>}
        {free && <button onClick={() => s.openModal('report')} className="whitespace-nowrap rounded-lg bg-white/5 px-2.5 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/10">Saved report</button>}
        <FullscreenButton />
        {!free && <button
          onClick={s.toggleHints}
          title={s.hints ? 'Guided mode ON: the next action glows' : 'Guided mode OFF (expert)'}
          className={`grid h-8 w-8 place-items-center rounded-lg transition ${s.hints ? 'bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          {s.hints ? <Lightbulb size={16} /> : <LightbulbOff size={16} />}
        </button>}
        <button onClick={s.toggleSound} title="Sound" className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10">
          {s.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button
          onClick={() => {
            if (window.confirm('Leave the lab? Your progress in this run will be lost.')) s.exitLab();
          }}
          title="Leave the lab"
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-rose-500/20 hover:text-rose-200"
        >
          <LogOut size={16} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700" style={{ width: `${free ? 100 : pct}%` }} />
    </header>
  );
}
