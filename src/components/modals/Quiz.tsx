import { useState } from 'react';
import { CircleCheck, CircleX, GraduationCap, Layers } from 'lucide-react';
import { useLab } from '../../store';
import { snap } from '../../engine';
import type { PhaseQ } from '../../types';
import { sfx } from '../../lib/sfx';
import { TubeSVG } from '../svg/Tube';
import { Modal } from './Modal';

const PHASE_QS: PhaseQ[] = [
  {
    key: 'aqueous',
    q: 'Click the layer that contains your DNA.',
    ok: 'Yes! DNA is polar because its phosphate backbone is negatively charged, so it stays dissolved in the polar aqueous (upper) phase.',
    wrong: {
      organic: 'That is the organic phase (phenol:chloroform). It is heavier than water, so it sinks. DNA is polar and does not dissolve in organic solvents.',
      interphase: 'That white band is precipitated protein. Your DNA stays dissolved; it does not collect here.',
    },
  },
  {
    key: 'organic',
    q: 'Now click the organic phase, where denatured proteins and lipids end up.',
    ok: 'Right. Phenol:chloroform is heavier than water, so the organic phase sinks to the bottom. Denatured proteins and lipids move into it.',
    wrong: {
      aqueous: 'The upper phase is water-based and holds your DNA. Phenol:chloroform is heavier than water.',
      interphase: 'Close: proteins do collect here, but this thin band is the interphase. The organic phase is the whole lower layer.',
    },
  },
  {
    key: 'interphase',
    q: 'Finally, click the thin white band between the two phases.',
    ok: 'Exactly. That is the interphase: a film of denatured protein where the two phases meet. Never touch it with your pipette tip!',
    wrong: {
      aqueous: 'Look for the thin white film between the two liquid layers.',
      organic: 'Look for the thin white film between the two liquid layers.',
    },
  },
];

export function PhaseQuizModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const tube = s.tubes[step.kind === 'phaseQuiz' ? step.tube : 'A'];
  const qs = step.kind === 'phaseQuiz' && step.qs ? step.qs : PHASE_QS;
  const NAMES: Record<string, string> = {};
  tube.layers.forEach((l) => {
    NAMES[l.key] = l.label.replace(/ — .*/, '');
  });
  const [qi, setQi] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const finished = found.length === qs.length;

  const onLayer = (key: string) => {
    if (finished || (fb && fb.ok)) return;
    const q = qs[qi];
    setSel(key);
    if (key === q.key) {
      setFb({ ok: true, text: q.ok });
      setFound((f) => [...f, key]);
      sfx.success();
    } else {
      const text = q.wrong[key] ?? 'Not quite. Look again.';
      setFb({ ok: false, text });
      s.recordMistake('Not quite', text, 3);
    }
  };

  const next = () => {
    setFb(null);
    setSel(null);
    setQi((i) => Math.min(i + 1, qs.length - 1));
  };

  return (
    <Modal title="Checkpoint: identify the phases" subtitle={`Tube ${tube.id} after centrifugation`} icon={<Layers size={18} />} width="max-w-3xl">
      <div className="grid gap-5 md:grid-cols-[230px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[min(380px,56vh)] w-full max-w-[230px] rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 ring-1 ring-white/20">
          <TubeSVG viewBox="0 44 76 130" layers={tube.layers} onLayerClick={onLayer} highlight={sel} className="h-full w-full" />
        </div>
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {qs.map((q, i) => (
              <div key={q.key} className={`h-1.5 flex-1 rounded-full ${found.includes(q.key) ? 'bg-emerald-400' : i === qi ? 'bg-cyan-400' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Question {Math.min(qi + 1, qs.length)} of {qs.length}
          </div>
            <p className="text-[16px] font-bold leading-snug text-white">
              {finished ? 'All layers identified!' : qs[qi].q}
            </p>
          {!finished && !fb && <p className="text-[12.5px] text-slate-400">Click directly on the tube (left).</p>}
          {fb && (
            <div className={`flex gap-2 rounded-xl border p-3 text-[12.5px] leading-relaxed ${fb.ok ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50' : 'border-rose-400/40 bg-rose-500/10 text-rose-50'}`}>
              {fb.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" /> : <CircleX size={16} className="mt-0.5 shrink-0 text-rose-300" />}
              <span>{fb.text}</span>
            </div>
          )}
          {found.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-white/[0.03] p-3">
              {found.map((k) =>
                found.includes(k) ? (
                  <li key={k} className="flex items-center gap-2 text-[12.5px] text-slate-200">
                    <span className="h-3 w-3 rounded-sm ring-1 ring-white/30" style={{ background: tube.layers.find((l) => l.key === k)?.color }} />
                    {NAMES[k]}
                  </li>
                ) : null,
              )}
            </ul>
          )}
          {fb?.ok && !finished && (
            <button onClick={next} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-[13px] font-bold text-slate-950 hover:bg-cyan-300">
              Next question →
            </button>
          )}
          {finished && (
            <div className="space-y-3">
              <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[12.5px] leading-relaxed text-amber-50/90">{step.why}</p>
              <button onClick={s.finishQuiz} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-[13px] font-bold text-slate-950 hover:bg-emerald-300">
                Continue the practical →
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function QuizModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);
  const [fb, setFb] = useState<string | null>(null);
  if (step.kind !== 'quiz') return null;
  const sn = snap(s);
  const r = s.nano.result;
  const question = typeof step.question === 'function' ? step.question(sn, r) : step.question;
  const explanation = typeof step.explanation === 'function' ? step.explanation(sn, r) : step.explanation;
  const isCorrect = (i: number) => {
    const o = step.options[i];
    return typeof o.correct === 'function' ? o.correct(sn, r) : o.correct;
  };

  const pick = (i: number) => {
    if (solved !== null || wrong.includes(i)) return;
    if (isCorrect(i)) {
      setSolved(i);
      setFb(null);
      sfx.success();
    } else {
      setWrong((w) => [...w, i]);
      const text = step.options[i].feedback ?? 'Not quite. Think about what the numbers mean and try again.';
      setFb(text);
      s.recordMistake('Not quite', text, 3);
    }
  };

  return (
    <Modal title={step.title} subtitle="Checkpoint question" icon={<GraduationCap size={18} />} width="max-w-2xl">
      <div className="space-y-4">
        {r && step.id === 'interpret' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Concentration', `${r.conc.toFixed(1)} ng/µL`],
              ['A260/A280', r.r280.toFixed(2)],
              ['A260/A230', r.r230.toFixed(2)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-black/50 p-2.5 ring-1 ring-white/10">
                <div className="text-[10.5px] uppercase tracking-wider text-slate-500">{k}</div>
                <div className="font-mono text-[18px] font-bold text-cyan-200">{v}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[16px] font-bold leading-snug text-white">{question}</p>
        <div className="space-y-2">
          {step.options.map((o, i) => {
            const isW = wrong.includes(i);
            const isS = solved === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={solved !== null || isW}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[13.5px] font-medium transition ${
                  isS
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-50'
                    : isW
                      ? 'border-rose-400/40 bg-rose-500/10 text-rose-200/80 line-through'
                      : 'border-white/10 bg-white/[0.03] text-slate-100 hover:border-cyan-400/50 hover:bg-cyan-400/10'
                }`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${isS ? 'bg-emerald-400 text-slate-950' : isW ? 'bg-rose-500/40 text-rose-100' : 'bg-white/10 text-slate-300'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
        {fb && solved === null && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-[12.5px] leading-relaxed text-rose-50">{fb}</div>}
        {solved !== null && (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-[12.5px] leading-relaxed text-emerald-50">
              <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>{explanation}</span>
            </div>
            <button onClick={s.finishQuiz} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-[13px] font-bold text-slate-950 hover:bg-emerald-300">
              Continue →
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
