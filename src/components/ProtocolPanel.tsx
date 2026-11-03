import { useState } from 'react';
import { BookOpen, Circle, CircleCheck, Lightbulb, ListChecks, Play, ScrollText, Sparkles } from 'lucide-react';
import { useLab } from '../store';
import { checklist, hintFor, resolveText, snap } from '../engine';
import { fmtClock } from '../lib/tube';
import { PICTURE_FLOWS, PRESET_NOTE, STUDY_SOURCE } from '../data/pictureFlow';

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-white">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

type Tab = 'step' | 'method' | 'log';

export function ProtocolPanel() {
  const s = useLab();
  const [tab, setTab] = useState<Tab>('step');
  const step = s.steps[s.stepIndex];
  const items = checklist(step, s);
  const hint = s.hints ? hintFor(step, s) : null;
  const stageNo = s.stages.findIndex((x) => x.id === step.stage) + 1;
  const stage = s.stages[stageNo - 1];
  const activeIdx = items.findIndex((i) => !i.done);

  const tabs: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
    { id: 'step', label: 'Current step', Icon: ListChecks },
    { id: 'method', label: 'Full method', Icon: BookOpen },
    { id: 'log', label: 'Notebook', Icon: ScrollText },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl backdrop-blur">
      <div className="flex shrink-0 gap-1 border-b border-white/10 p-1.5">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition ${
              tab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3.5">
        {tab === 'step' && (
          <div key={step.id} className="fade-up space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider">
                <span className="text-cyan-300">
                  Stage {stageNo} · {stage.name}
                </span>
                <span className="text-slate-500">
                  {s.stepIndex + 1}/{s.steps.length}
                </span>
              </div>
              <h2 className="mt-1 text-[17px] font-bold leading-snug text-white">{step.title}</h2>
              {step.noteRef && <p className="mt-1 text-[10.5px] leading-relaxed text-emerald-300/70">{step.noteRef}</p>}
            </div>

            <p className="text-[13px] leading-relaxed text-slate-300">
              <Rich text={resolveText(step.instruction, snap(s))} />
            </p>
            <details className="border-l-2 border-slate-600 pl-2.5 text-[10.5px] leading-relaxed text-slate-500">
              <summary className="cursor-pointer text-slate-400">Latest notes; simulation settings</summary>
              <p className="mt-1">{PRESET_NOTE}</p>
            </details>

            <ul className="space-y-1 rounded-xl border border-white/5 bg-slate-950/40 p-2">
              {items.map((it, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition ${
                    it.done ? 'text-emerald-300/90' : i === activeIdx ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-400'
                  }`}
                >
                  {it.done ? (
                    <CircleCheck size={15} className="mt-[1px] shrink-0 text-emerald-400" />
                  ) : i === activeIdx ? (
                    <Play size={14} className="mt-[2px] shrink-0 text-cyan-300" fill="currentColor" />
                  ) : (
                    <Circle size={15} className="mt-[1px] shrink-0 text-slate-600" />
                  )}
                  <span className={it.done ? 'line-through decoration-emerald-500/40' : ''}>{it.label}</span>
                </li>
              ))}
            </ul>

            {hint && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[12.5px] text-cyan-100">
                <Sparkles size={14} className="shrink-0 text-cyan-300" />
                <span>
                  <span className="font-semibold">Next:</span> {hint.text}
                </span>
              </div>
            )}

            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                <BookOpen size={13} /> Why this step?
              </div>
              <p className="text-[12.5px] leading-relaxed text-amber-50/85">{step.why}</p>
            </div>

            {step.tip && (
              <div className="flex gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-slate-300">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-yellow-300" />
                <span>{step.tip}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'method' && (
          <div className="space-y-4">
            <p className="text-[12px] leading-relaxed text-slate-400">
              {STUDY_SOURCE.description}
            </p>
              <ol className="space-y-2 border-l border-emerald-400/20 pl-3">
              {PICTURE_FLOWS[s.expId].map((item, i) => <li key={item.title} className="text-[12px] text-slate-200"><span className="mr-1.5 font-mono text-[10px] text-emerald-300">{i + 1}.</span>{item.title}</li>)}
            </ol>
            <p className="text-[11px] leading-relaxed text-slate-500">{PRESET_NOTE}</p>
            {s.stages.map((st, si) => (
              <div key={st.id}>
                <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {si + 1}. {st.name}
                </div>
                <ol className="space-y-0.5">
                  {s.steps.map((x, i) =>
                    x.stage !== st.id ? null : (
                      <li
                        key={x.id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px] ${
                          i < s.stepIndex ? 'text-slate-400' : i === s.stepIndex ? 'bg-cyan-400/10 font-semibold text-cyan-100' : 'text-slate-500'
                        }`}
                      >
                        {i < s.stepIndex ? (
                          <CircleCheck size={14} className="shrink-0 text-emerald-400" />
                        ) : i === s.stepIndex ? (
                          <Play size={12} className="shrink-0 text-cyan-300" fill="currentColor" />
                        ) : (
                          <Circle size={14} className="shrink-0 text-slate-700" />
                        )}
                        <span>
                          {i + 1}. {x.title}
                        </span>
                      </li>
                    ),
                  )}
                </ol>
              </div>
            ))}
          </div>
        )}

        {tab === 'log' && (
          <div className="space-y-1.5">
            {s.log.length === 0 && <p className="text-[12px] text-slate-500">Your actions will be recorded here, like a real lab notebook.</p>}
            {[...s.log].reverse().map((e) => (
              <div key={e.id} className="flex gap-2 text-[12px] leading-snug">
                <span className="shrink-0 font-mono text-[11px] text-slate-500">{fmtClock(e.time)}</span>
                <span
                  className={
                    e.kind === 'mistake'
                      ? 'text-rose-300'
                      : e.kind === 'success'
                        ? 'text-emerald-300'
                        : e.kind === 'warning'
                          ? 'text-amber-200'
                          : e.kind === 'info'
                            ? 'text-sky-200/80'
                            : 'text-slate-300'
                  }
                >
                  {e.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
