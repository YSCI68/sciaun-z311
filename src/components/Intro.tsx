import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  BookOpen,
  Columns3,
  Dna,
  FlaskConical,
  Gauge,
  Lightbulb,
  MousePointerClick,
  Play,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  TestTubes,
  Thermometer,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ExpId } from '../types';
import { useLab } from '../store';
import { EXP_LIST } from '../data';
import { PRESET_NOTE } from '../data/pictureFlow';
import { SpinColumnSVG } from './svg/Equipment';
import { COLORS, L } from '../lib/tube';
import { FullscreenButton } from './FullscreenButton';
import { TubeSVG } from './svg/Tube';

const HERO = 'https://images.pexels.com/photos/8940511/pexels-photo-8940511.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200';

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  shield: ShieldAlert,
  thermometer: Thermometer,
  flask: FlaskConical,
  dna: Dna,
  tubes: TestTubes,
  gauge: Gauge,
  salt: Waves,
  column: Columns3,
};

export function IntroScreen() {
  const setScreen = useLab((s) => s.setScreen);
  const selectExp = useLab((s) => s.selectExp);

  const open = (id: ExpId) => {
    selectExp(id);
    setScreen('briefing');
  };

  return (
    <div className="relative h-full overflow-y-auto bg-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img src={HERO} alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/92 to-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-6 py-7">
        <header className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950">
            <FlaskConical size={19} strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-bold text-white">MB Virtual Lab</div>
            <div className="text-[11.5px] text-slate-400">Z311 · Molecular Biology Practical</div>
          </div>
          <div className="ml-auto">
            <FullscreenButton />
          </div>
        </header>

        <div className="fade-up mt-9">
          <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[46px]">
            MB Virtual Lab
          </h1>
        </div>

        <section aria-label="DNA Extraction" className="mt-8">
          <h2 className="text-[22px] font-bold text-white">DNA Extraction</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {EXP_LIST.map((e) => {
              const available = true;
              return (
                <button
                  key={e.id}
                  onClick={() => available && open(e.id)}
                  disabled={!available}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                    available
                      ? 'border-cyan-400/40 bg-cyan-400/[0.07] hover:border-cyan-400/60 hover:bg-cyan-400/[0.12]'
                      : 'cursor-not-allowed border-white/10 bg-white/[0.02] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${available ? 'bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950' : 'bg-white/5 text-slate-500'}`}>
                      {e.n === 1 ? <FlaskConical size={21} /> : e.n === 2 ? <TestTubes size={21} /> : <Columns3 size={21} />}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider ${
                        available ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {available ? 'Available' : 'Not in this run'}
                    </span>
                  </div>
                  <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Method {e.n}</div>
                  <div className={`text-[17px] font-bold ${available ? 'text-white' : 'text-slate-400'}`}>{e.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-slate-400">{e.sub}</div>
                  <div className="mt-3 text-[11.5px] text-slate-500">
                    {available ? `${e.steps.length} steps · ${e.stages.length} stages` : 'Saved for a later session'}
                  </div>
                  <div className={`mt-4 flex items-center gap-1.5 text-[13px] font-bold ${available ? 'text-cyan-300' : 'text-slate-500'}`}>
                    <Play size={14} fill="currentColor" /> {available ? 'Open practical' : 'Not available now'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <p className="mt-6 text-center text-[11px] text-slate-600">Background photo: Thirdman / Pexels</p>
      </div>
    </div>
  );
}

const METHOD_STEPS: Record<ExpId, string[]> = {
  exp1: ['Lysis and harvest', 'Protect DNA; RNase + Proteinase K', 'Phenol / chloroform', '100% ethanol + centrifuge', '70% ethanol wash', '1x TE or DNase-free water'],
  exp2: ['Lysis and harvest', 'Protect DNA; RNase + Proteinase K', 'High salt; upper DNA fraction', '100% ethanol + centrifuge', '70% ethanol wash', '1x TE or DNase-free water'],
  exp3: ['Lysis and harvest', 'Protect DNA; RNase + Proteinase K', 'Silica membrane separation', '100% ethanol + centrifuge', '70% ethanol wash', '1x TE or DNase-free water'],
};

export function BriefingScreen() {
  const s = useLab();
  const e = s.exp;
  const demo =
    e.id === 'exp1'
      ? [
          L('organic', 'Organic', 520, COLORS.organic, 0.88),
          L('interphase', 'Interphase', 30, COLORS.interphase, 0.97, { thin: true }),
          L('aqueous', 'Aqueous', 490, COLORS.aqueous, 0.5),
        ]
      : e.id === 'exp2'
        ? [L('prot', 'Inorganic layer', 200, '#f3ece1', 0.97), L('sup', 'Aqueous layer + DNA', 760, '#eef3f8', 0.42)]
        : [L('dna', 'DNA collected from the silica', 100, COLORS.dna, 0.45)];

  const layersFor = e.id === 'exp1'
    ? [
        { c: '#c47a1a', t: 'Lower · organic phase', d: 'Phenol:chloroform with denatured proteins and lipids' },
        { c: '#f8f5ef', t: 'Interphase', d: 'White film of denatured protein' },
        { c: '#f4ecd0', t: 'Upper · aqueous phase', d: 'Your DNA — polar, so it stays here' },
      ]
    : e.id === 'exp2'
      ? [
          { c: '#f3ece1', t: 'Lower precipitated material', d: 'Salts / RNA / proteins, as labelled in the notes' },
          { c: '#eef3f8', t: 'Upper aqueous layer', d: 'Your DNA stays in solution here' },
        ]
      : [
            { c: '#f8fafc', t: 'Silica filter', d: 'DNA binds here while the rest flows through' },
            { c: '#e9eff6', t: 'Recovered DNA fraction', d: 'Recovery conditions are schematic: not specified in the notes' },
          ];

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(ellipse_at_top,#13213a,#0b1220_60%)]">
      <div className="mx-auto max-w-6xl px-6 py-7">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => s.setScreen('intro')} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-white">
            <ArrowLeft size={15} /> Modules
          </button>
          <FullscreenButton />
        </div>
        <div className="mt-3">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-cyan-300">Pre-lab briefing · Experiment {e.n}</div>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-white">{e.method}</h1>
          <p className="mt-1 text-[13.5px] text-slate-400">{e.sub}</p>
          <p className="mt-2 max-w-3xl border-l-2 border-amber-300/40 pl-3 text-[11px] leading-relaxed text-slate-500">{PRESET_NOTE}</p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="fade-up rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-amber-200">
              <BookOpen size={15} /> {e.principle.heading} (from your notes)
            </div>
            <div className="flex gap-5">
              <div className="relative w-[96px] shrink-0">
                {e.id === 'exp3' ? <SpinColumnSVG membrane className="mx-auto h-auto w-16" /> : <TubeSVG layers={demo} label="A" className="block h-auto w-full" />}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 text-[12.5px]">
                {layersFor.map((l) => (
                  <div key={l.t} className="rounded-lg border-l-4 bg-white/[0.04] px-3 py-2" style={{ borderColor: l.c }}>
                    <div className="font-bold text-white">{l.t}</div>
                    <div className="text-slate-400">{l.d}</div>
                  </div>
                ))}
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-[13px] leading-relaxed text-slate-300">
              {e.principle.bullets.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="fade-up space-y-4" style={{ animationDelay: '100ms' }}>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-400">
                What you'll do: {e.steps.length} steps in {e.stages.length} stages
              </div>
              <ol className="grid gap-2 sm:grid-cols-2">
                {e.stages.map((st, i) => {
                  const Icon = ICONS[st.icon] ?? Beaker;
                  return (
                    <li key={st.id} className="flex gap-2.5 rounded-xl bg-white/[0.03] p-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-white">
                          {i + 1}. {st.name}
                        </div>
                        <div className="text-[11.5px] leading-snug text-slate-500">{METHOD_STEPS[e.id]?.[i] ?? ''}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {METHOD_STEPS[e.id].map((m) => (
                  <span key={m} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.05] p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-rose-200">
                  <ShieldAlert size={14} /> Safety
                </div>
                <ul className="space-y-1 text-[12px] leading-snug text-rose-50/80">
                  {e.hazards.map((h) => (
                    <li key={h}>• {h}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-300">
                  <MousePointerClick size={14} /> How to play
                </div>
                <ul className="space-y-1 text-[12px] leading-snug text-slate-400">
                  <li>• Click to pick up, click again to use or place</li>
                  <li>• Set volumes and mix tubes under “Your hands”</li>
                  <li>• After completion, keep using the lab without step locks</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <button
                onClick={s.toggleHints}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition ${
                  s.hints ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/40' : 'bg-white/5 text-slate-300'
                }`}
              >
                <Lightbulb size={16} /> Guided mode: {s.hints ? 'ON' : 'OFF'}
              </button>
              <button onClick={s.toggleSound} className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-[13px] font-semibold text-slate-300">
                {s.sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound {s.sound ? 'on' : 'off'}
              </button>
              <button
                onClick={() => s.startLab(e.id)}
                className="ml-auto flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-[15px] font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
              >
                Enter the lab <ArrowRight size={18} />
              </button>
              <p className="flex w-full items-center gap-1.5 text-[11.5px] text-slate-500">
                <ShieldCheck size={13} className="text-emerald-400" /> Guided mode shows a glowing arrow on the next item. Turn it off for an exam-style run.
                {e.hood ? ' This practical uses the fume hood.' : ' No fume hood needed for this method.'}
              </p>
              <div className="flex w-full items-center gap-2 text-[11.5px] text-slate-600">
                <Snowflake size={13} /> Sample: {e.sampleVol} µL virtual cell suspension
                {e.id === 'exp3' && <span className="ml-auto">1 silica spin column (Tube C)</span>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
