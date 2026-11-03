import { Activity, Clock, RefreshCcw, TriangleAlert, Trophy, Unlock, ArrowRight } from 'lucide-react';
import { useLab } from '../../store';
import type { NanoResult } from '../../types';
import { fmtClock } from '../../lib/tube';
import { NanoDropSVG } from '../svg/Equipment';
import { Modal } from './Modal';

function spectrumPoints(r: NanoResult): [number, number][] {
  return [
    [220, r.a230 * 1.55],
    [230, r.a230],
    [240, r.a260 * 0.62],
    [250, r.a260 * 0.87],
    [260, r.a260],
    [270, r.a260 * (r.r230 < 1.6 ? 0.97 : 0.86)],
    [280, r.a280],
    [290, r.a280 * 0.42],
    [300, r.a260 * 0.05],
    [320, r.a260 * 0.012],
    [350, 0],
  ];
}

function smoothPath(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

export function Spectrum({ r }: { r: NanoResult }) {
  const W = 340;
  const H = 170;
  const pad = { l: 34, r: 10, t: 10, b: 26 };
  const raw = spectrumPoints(r);
  const maxA = Math.max(...raw.map((p) => p[1])) * 1.15;
  const x = (l: number) => pad.l + ((l - 220) / 130) * (W - pad.l - pad.r);
  const y = (a: number) => pad.t + (1 - a / maxA) * (H - pad.t - pad.b);
  const pts = raw.map(([l, a]) => [x(l), y(a)] as [number, number]);
  const ticks = [0, maxA / 2, maxA];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="#020617" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#1e293b" />
          <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="JetBrains Mono">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {[230, 260, 280].map((l) => (
        <g key={l}>
          <line x1={x(l)} x2={x(l)} y1={pad.t} y2={H - pad.b} stroke={l === 260 ? '#22d3ee' : l === 280 ? '#f59e0b' : '#a78bfa'} strokeDasharray="3 3" opacity="0.7" />
          <text x={x(l)} y={H - pad.b + 11} textAnchor="middle" fontSize="8.5" fill="#94a3b8" fontFamily="JetBrains Mono">
            {l}
          </text>
        </g>
      ))}
      <text x={W - pad.r} y={H - 3} textAnchor="end" fontSize="8" fill="#64748b" fontFamily="Inter">
        wavelength (nm)
      </text>
      <text x="4" y={pad.t + 6} fontSize="8" fill="#64748b" fontFamily="Inter">
        A
      </text>
      <path d={smoothPath(pts)} fill="none" stroke="#22d3ee" strokeWidth="2.2" className="draw-line" />
    </svg>
  );
}

function verdict(r: NanoResult) {
  if (r.r280 < 1.75) return { text: 'Contaminated: protein/phenol', cls: 'text-rose-300' };
  if (r.r280 > 2.02) return { text: 'Possible RNA contamination', cls: 'text-amber-300' };
  return { text: 'Pure DNA ✓', cls: 'text-emerald-300' };
}

export function NanoDropModal() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const free = s.mode === 'free';
  const mode = free ? (s.nano.loaded === 'blank' || !s.nano.blanked ? 'blank' : 'measure') : step.kind === 'pipette' && step.instrument ? step.instrument : null;
  const r = s.nano.result;

  return (
    <Modal title="UV spectrophotometer (micro-volume)" subtitle={free ? 'Optional free-lab practice · simulated readings · saved report unchanged' : 'Nucleic acid · dsDNA · 1 A260 = 50 ng/µL'} icon={<Activity size={18} />} onClose={s.closeModal} width="max-w-3xl">
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-200 p-4 ring-1 ring-white/20">
            <NanoDropSVG loaded={s.nano.loaded} />
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3 text-[12px] leading-relaxed text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Pedestal</span>
              <span className="font-semibold">{s.nano.loaded === 'blank' ? 'Buffer / water blank' : s.nano.loaded === 'sample' ? 'DNA sample loaded' : 'clean'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Baseline</span>
              <span className={s.nano.blanked ? 'font-semibold text-emerald-300' : 'text-slate-500'}>{s.nano.blanked ? 'blanked ✓' : 'not set'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 ring-1 ring-white/10">
          {!mode && !r && (
            <div className="grid h-full min-h-[200px] place-items-center text-center text-[13px] text-slate-400">
              Instrument idle. You will use it in the final quality-control stage.
            </div>
          )}

          {mode === 'blank' && !r && (
            <div className="space-y-4">
              <div className="font-mono text-[12px] text-slate-400">STEP 1 · BLANK MEASUREMENT</div>
              {s.nano.loaded === 'blank' ? (
                <>
                  <p className="text-[13px] text-slate-300">2 µL of TE buffer is on the pedestal. Lower the arm and record the blank.</p>
                  <button onClick={s.nanoBlank} className="w-full rounded-xl bg-cyan-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-cyan-300">
                    Blank
                  </button>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-slate-300">
                  Load <b>2 µL of TE buffer</b> onto the pedestal first. Close this window, take the <b>P20</b>, set 2 µL, attach a tip, draw up TE and click the instrument.
                </p>
              )}
            </div>
          )}

          {mode === 'measure' && !r && (
            <div className="space-y-4">
              <div className="font-mono text-[12px] text-slate-400">STEP 2 · SAMPLE MEASUREMENT</div>
              {s.nano.loaded === 'sample' ? (
                <>
                  <p className="text-[13px] text-slate-300">2 µL of your DNA is on the pedestal. The instrument will scan from 220 to 350 nm.</p>
                  <button onClick={s.nanoMeasure} className="w-full rounded-xl bg-cyan-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-cyan-300">
                    Measure
                  </button>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-slate-300">
                  Load <b>2 µL of your DNA</b> from Tube B using a <b>fresh tip</b> on the P20, then click the instrument.
                </p>
              )}
            </div>
          )}

          {r && (
            <div className="space-y-3">
              <Spectrum r={r} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['ng/µL', r.conc.toFixed(1), 'text-cyan-200'],
                  ['A260', r.a260.toFixed(3), 'text-slate-100'],
                  ['A280', r.a280.toFixed(3), 'text-slate-100'],
                  ['260/280', r.r280.toFixed(2), verdict(r).cls],
                  ['260/230', r.r230.toFixed(2), r.r230 < 1.8 ? 'text-amber-300' : 'text-emerald-300'],
                  ['Status', verdict(r).text, verdict(r).cls],
                ].map(([k, v, c]) => (
                  <div key={k} className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                    <div className={`font-mono text-[14px] font-bold ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] leading-snug text-slate-400">
                Concentration = A260 × 50 ng/µL = {r.a260.toFixed(3)} × 50 = <b className="text-slate-200">{r.conc.toFixed(1)} ng/µL</b>
              </p>
              {mode === 'measure' && (
                <button onClick={s.nanoFinish} className="w-full rounded-xl bg-emerald-400 py-3 text-[14px] font-bold text-slate-950 hover:bg-emerald-300">
                  {free ? 'Return to free lab' : 'Save result & continue'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ReportModal() {
  const live = useLab();
  const saved = live.completedRun;
  const s = {
    ...live,
    flags: saved?.flags ?? live.flags,
    tubes: saved?.tubes ?? live.tubes,
    mistakes: saved?.mistakes ?? live.mistakes,
    nano: { ...live.nano, result: saved ? saved.result : live.nano.result },
    simTime: saved?.simTime ?? live.simTime,
    startedAt: saved?.startedAt ?? live.startedAt,
    finishedAt: saved?.finishedAt ?? live.finishedAt,
  };
  const r = s.nano.result;
  const penalty = s.mistakes.reduce((a, m) => a + m.penalty, 0);
  const score = Math.max(0, 100 - penalty);
  const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Pass' : 'Needs practice';
  const realMin = Math.max(1, Math.round(((s.finishedAt ?? Date.now()) - s.startedAt) / 60000));
  const labMin = Math.round(s.simTime - 540);
  const vol = s.flags.te || s.flags.eluted || 0;
  const notes: string[] = [];
  if (s.flags.interphase) notes.push('Interphase protein was carried into Tube B. This can reduce purity; no real UV reading was taken.');
  if (s.flags.phenol) notes.push('Phenol carry-over was recorded. It can affect downstream enzymes; any optional UV result is simulated.');
  if (s.flags.vortexed) notes.push('Vortexing sheared the genomic DNA; on a gel it would run as a smear instead of a tight high-molecular-weight band.');
  if (s.flags.overdried) notes.push('The pellet was over-dried, so part of it never dissolved and the yield dropped.');
  if (s.flags.airBubbles > 0) notes.push(`You drew air ${s.flags.airBubbles}× during the phase transfer. Follow the surface down more smoothly.`);
  if (s.flags.salt) notes.push('Salt carry-over was recorded in this simulated run.');
  if (s.flags.eluted > 0) notes.push(`Eluted ${s.flags.eluted} µL off the silica membrane.`);
  if (notes.length === 0)
    notes.push(
      live.exp.steps.some((x) => x.kind === 'store')
        ? 'The sequence from your picture is complete. Your DNA was resuspended and stored.'
        : 'The sequence in your latest study pages is complete: separated, precipitated with 100% ethanol, washed with 70% ethanol, and resuspended.',
    );
  const ring = 2 * Math.PI * 42;

  return (
    <Modal
      title="Practical complete — lab report"
      subtitle={`Experiment ${s.exp.n} · ${s.exp.sub}`}
      icon={<Trophy size={18} />}
      width="max-w-4xl"
      onClose={s.enterFreeLab}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.03] p-4">
            <svg viewBox="0 0 100 100" className="w-32">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={score >= 75 ? '#34d399' : score >= 60 ? '#fbbf24' : '#fb7185'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * ring} ${ring}`}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="52" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff" fontFamily="Inter">
                {score}
              </text>
              <text x="50" y="66" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="Inter">
                / 100
              </text>
            </svg>
            <div className="mt-1 text-[15px] font-bold text-white">{grade}</div>
            <div className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-400">
              <Clock size={12} /> {realMin} min real · {Math.floor(labMin / 60)} h {labMin % 60} min lab time
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Final sample', `${vol} µL in Tube B`],
              [
                'Outcome',
                live.exp.steps.some((x) => x.kind === 'store')
                  ? `DNA stored at ${saved?.storageTemperature ?? live.storageTemperature} C`
                  : 'DNA resuspended in 1x TE or water',
              ],
              ['UV measurement', r ? `${r.conc.toFixed(1)} ng/µL` : 'Optional in free lab'],
              ['Purity ratios', r ? `${r.r280.toFixed(2)} / ${r.r230.toFixed(2)}` : 'Not measured'],
              ['Mistakes', `${s.mistakes.length} (−${penalty} points)`],
              ['DNase protection', s.flags.protectionMethod === 'heat' ? 'Heating alternative' : 'Chelating agent (EDTA)'],
              ['RNA / protein treatment', s.flags.rnaRemoved && s.flags.proteinsDigested ? 'RNase + Proteinase K completed' : 'Check notebook'],
              ['70% ethanol wash', s.flags.ethanolWashed ? 'Completed' : 'Not completed'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="text-[10.5px] uppercase tracking-wider text-slate-500">{k}</div>
                <div className="text-[14px] font-semibold text-slate-100">{v}</div>
              </div>
            ))}
          </div>
        </div>
        {!r && <p className="text-[12px] leading-relaxed text-slate-400">The latest pages finish at elution / resuspension. No measured concentration, purity or yield is claimed here. Optional UV readings in free lab are simulated, not experimental measurements.</p>}
        {live.expId === 'exp3' && <p className="border-l-2 border-amber-300/40 pl-3 text-[12px] leading-relaxed text-amber-100/80">Silica recovery was a schematic transition: the source does not specify membrane-release conditions. It was not modelled as DNA eluting from a dry membrane by spinning alone.</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Quality notes</div>
            <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-slate-300">
              {notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
            {s.mistakes.length > 0 && (
              <>
                <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Mistakes to learn from</div>
                <ul className="thin-scroll max-h-44 space-y-2 overflow-y-auto pr-1">
                  {s.mistakes.map((m) => (
                    <li key={m.id} className="rounded-lg bg-rose-500/[0.07] p-2 text-[12px] leading-snug">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                        <TriangleAlert size={12} /> {m.title} <span className="ml-auto font-mono text-[10.5px] text-rose-300">−{m.penalty}</span>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">{m.step}:</span> {m.text}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-200">Key takeaways for your exam</div>
            <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-amber-50/85">
              {s.exp.takeaways.map((k) => (
                <li key={k}>• {k}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl bg-white/[0.03] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-400">
              <Unlock size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">The experiment is finished. The lab stays open.</div>
              <div className="text-[12px] text-slate-400">Use the equipment freely or repeat this method. Your report stays saved. All three methods use the same latest study pages.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if (window.confirm('Start the guided experiment again? This will replace the saved run.')) s.startLab(); }} className="flex items-center gap-1.5 rounded-xl bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-slate-200 hover:bg-white/10">
              <RefreshCcw size={14} /> Restart guided
            </button>
            <button onClick={s.enterFreeLab} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-bold text-slate-950 hover:bg-emerald-300">
              Continue in free lab <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-500">Lab clock at finish: {fmtClock(s.simTime)}</p>
      </div>
    </Modal>
  );
}
