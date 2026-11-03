import type { CSSProperties, ReactNode } from 'react';
import { useLab } from '../store';
import { OBJECT_INFO, REAGENTS, BALANCES } from '../data/reagents';
import { hintFor } from '../engine';
import type { TubeState } from '../types';
import { COLORS, L } from '../lib/tube';
import { TubeSVG } from './svg/Tube';
import { PipetteSVG } from './svg/Pipette';
import {
  BeakerSVG,
  BottleSVG,
  CentrifugeSVG,
  CoatSVG,
  EnzymeTubeSVG,
  FreezerSVG,
  FumeHoodBack,
  FumeHoodSash,
  GloveBoxSVG,
  GogglesSVG,
  HeatBlockSVG,
  IceBucketSVG,
  JerricanSVG,
  NanoDropSVG,
  PipetteStandSVG,
  PlasticWasteSVG,
  RackSVG,
  SpinColumnSVG,
  TipBoxSVG,
  TipWasteSVG,
  WallClockSVG,
} from './svg/Equipment';

/* ---------- layout (x/w in % of scene width, y/h in % of scene height; scene is 16:10) ---------- */
const AR = 1.6;
const TW = 3.3;
const TH = (TW * AR * 200) / 76;
const BENCH_RACK = { x: 37.5, y: 70, w: 14.5, slots: 4 };
const COLSTAND = { x: 52.4, y: 69.5, w: 5.2 };
const HOOD_RACK = { x: 9.6, y: 66.6, w: 9, slots: 3 };
const BAL_RACK = { x: 75.6, y: 89.4, w: 10.5, slots: 3 };
const HEAT = { x: 63, y: 79, w: 11 };
const rackH = (w: number) => w * AR * 0.3;
const slotLeft = (r: { x: number; w: number; slots: number }, i: number, tw = TW) =>
  r.x + (r.w * (i + 0.5)) / r.slots - tw * (30 / 76);
const slotTop = (r: { y: number; w: number }, th = TH) => r.y + rackH(r.w) * 0.8 - 0.975 * th;
const CW = 2.7;

function tubeBox(t: TubeState): { x: number; y: number } | null {
  const slot = t.id === 'A' ? 0 : t.id === 'B' ? 1 : 2;
  if (t.location === 'columnStand') return { x: COLSTAND.x + COLSTAND.w / 2 - CW * (28 / 56), y: COLSTAND.y + 0.5 };
  if (t.location === 'bench' || t.location === 'column') return { x: slotLeft(BENCH_RACK, slot), y: slotTop(BENCH_RACK) };
  if (t.location === 'hood') return { x: slotLeft(HOOD_RACK, slot), y: slotTop(HOOD_RACK) };
  if (t.location === 'heatblock') {
    const holeX = HEAT.x + (HEAT.w * (slot === 0 ? 38 : 54)) / 120;
    return { x: holeX - TW * (30 / 76), y: HEAT.y + 2.05 - 0.6 * TH };
  }
  return null;
}

interface ObjProps {
  id: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  z?: number;
  hint?: string;
  label?: string;
  children?: ReactNode;
  hintBox?: boolean;
  tipBelow?: boolean;
  style?: CSSProperties;
}

function Obj({ id, x, y, w, h, z = 10, hint, label, children, hintBox, tipBelow, style }: ObjProps) {
  const click = useLab((s) => s.click);
  const isHint = hint === id;
  const name = label ?? OBJECT_INFO[id]?.name ?? id;
  return (
    <button
      type="button"
      data-obj={id}
      aria-label={name}
      onClick={(e) => {
        e.stopPropagation();
        click(id);
      }}
      className={`obj absolute block border-0 bg-transparent p-0 outline-none ${isHint && !hintBox ? 'hinted' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: h != null ? `${h}%` : undefined,
        zIndex: z,
        cursor: 'var(--obj-cursor)',
        ...style,
      }}
    >
      {children}
      {hintBox && isHint && (
        <span className="pointer-events-none absolute inset-0 animate-pulse rounded-[0.6cqw] border-2 border-dashed border-cyan-300 bg-cyan-300/15 shadow-[0_0_1.2cqw_rgba(34,211,238,0.7)]" />
      )}
      {isHint && (
        <span
          className="hint-arrow pointer-events-none absolute left-1/2 text-cyan-300"
          style={{ bottom: tipBelow ? undefined : '100%', top: tipBelow ? '100%' : undefined, fontSize: '2.2cqw', lineHeight: 1, filter: 'drop-shadow(0 0 0.5cqw rgba(34,211,238,0.9))' }}
        >
          {tipBelow ? '▲' : '▼'}
        </span>
      )}
      <span
        className="obj-tip pointer-events-none absolute left-1/2 whitespace-nowrap rounded-md bg-slate-900/90 font-semibold text-white shadow-lg ring-1 ring-white/10"
        style={{
          bottom: tipBelow ? undefined : 'calc(100% + 0.4cqw)',
          top: tipBelow ? 'calc(100% + 0.4cqw)' : undefined,
          fontSize: 'max(10px, 1.05cqw)',
          padding: '0.3cqw 0.6cqw',
          zIndex: 60,
        }}
      >
        {name}
      </span>
    </button>
  );
}

// A second shelf keeps the three salt choices and the 70% wash readable.
const bottleGeom = (n: number) => n > 5 ? { span: 22.8, w: 5, columns: 4 } : { span: 24, w: 5.2, columns: n };
const bottleX = (i: number, n: number) => 39 + ((i % bottleGeom(n).columns) * bottleGeom(n).span) / Math.max(1, bottleGeom(n).columns - 1);
const bottleY = (i: number, n: number) => n > 5 ? i >= 4 ? 36 : 18 : 18;

export function LabScene() {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const hint = s.hints ? hintFor(step, s)?.target : undefined;
  const held = s.held;
  const placingTube = held?.kind === 'tube' && !s.tubes[held.id].column;
  const heldPip = held?.kind === 'pipette' ? held.id : null;
  const heatRunning = s.busy && s.modal === 'heat';
  const heatTubeId = (['A', 'B', 'C'] as const).find((id) => s.tubes[id].location === 'heatblock');

  const sceneStyle = {
    aspectRatio: '16 / 10',
    cursor: held?.kind === 'pipette' ? 'none' : held?.kind === 'tube' ? 'grabbing' : 'default',
    '--obj-cursor': held?.kind === 'pipette' ? 'none' : held?.kind === 'tube' ? 'grabbing' : 'pointer',
  } as CSSProperties;

  const renderTube = (t: TubeState, where: 'racks' | 'heat') => {
    if (t.id === 'C' && t.location === 'seated' && where === 'racks') {
      const parent = tubeBox(s.tubes.B);
      if (!parent || (held?.kind === 'tube' && held.id === 'C')) return null;
      return (
        <Obj
          key="C-seated"
          id="tube-C"
          x={parent.x + TW / 2 - CW / 2}
          y={parent.y - TH * 0.56}
          w={CW}
          z={20}
          hint={hint}
          label="Spin column seated in Tube B"
        >
          <SpinColumnSVG
            level={t.layers.length ? Math.min(1, t.layers[0].volume / 750) : 0}
            liquid={t.layers[0]?.color}
            membrane={!t.layers.length}
            seated
            className="block h-auto w-full"
          />
        </Obj>
      );
    }
    if (where === 'racks' && t.location !== 'bench' && t.location !== 'hood' && t.location !== 'columnStand' && t.location !== 'column') return null;
    if (where === 'heat' && t.location !== 'heatblock') return null;
    if (held?.kind === 'tube' && held.id === t.id) return null;
    const pos = tubeBox(t);
    if (!pos) return null;
    if (t.column)
      return (
        <Obj key="C" id="tube-C" x={pos.x} y={pos.y} w={CW} z={14} hint={hint} label="Spin column (Tube C)">
          <SpinColumnSVG level={t.layers.length ? Math.min(1, (t.layers[0].volume || 1) / 750) : 0} liquid={t.layers[0]?.color} membrane={!t.layers.length} className="block h-auto w-full" />
        </Obj>
      );
    return (
      <Obj
        key={t.id}
        id={`tube-${t.id}`}
        x={pos.x}
        y={pos.y}
        w={TW}
        z={t.location === 'heatblock' ? 17 : 14}
        hint={hint}
        label={`Tube ${t.id} — ${t.id === 'A' ? 'sample' : 'DNA'}`}
      >
        <TubeSVG layers={t.layers} pellet={t.pellet} strands={t.strands} lidOpen={t.lidOpen} label={t.id} className="block h-auto w-full" />
        <span
          className="pointer-events-none absolute rounded-[0.3cqw] bg-white/90 font-extrabold leading-none text-blue-900 shadow ring-1 ring-blue-900/20"
          style={{ left: '64%', top: '22%', fontSize: 'max(9px, 0.95cqw)', padding: '0.2cqw 0.3cqw' }}
        >
          {t.id}
        </span>
      </Obj>
    );
  };

  return (
    <div className="scene relative w-full select-none overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60" style={sceneStyle} data-scene>
      {/* room */}
      <div className="scene-wall absolute inset-x-0 top-0" style={{ height: '58%' }} />
      <div className="scene-bench absolute inset-x-0 bottom-0" style={{ top: '58%' }} />
      <div className="absolute inset-x-0" style={{ top: '58%', height: '0.6%', background: 'linear-gradient(180deg,#5b6675,#3a4350)' }} />
      <div className="absolute inset-x-0 bottom-0 border-t border-white/10" style={{ height: '4%', background: 'linear-gradient(180deg,#1f252d,#151a20)' }} />

      {/* wall clock & signs */}
      <div className="absolute" style={{ left: '68.6%', top: '3%', width: '4.6%', zIndex: 5 }}>
        <WallClockSVG minutes={s.simTime} />
      </div>
      <div
        className="absolute flex items-center justify-center rounded-[0.4cqw] border-[0.25cqw] border-slate-900 bg-yellow-300 text-center font-extrabold uppercase leading-tight text-slate-900 shadow-md"
        style={{ left: '71.4%', top: '25%', width: '12.6%', height: '9%', zIndex: 5, fontSize: '1.05cqw', letterSpacing: '0.04em' }}
      >
        ⚠ Always balance
        <br />
        the rotor
      </div>
      <div
        className="absolute rounded-[0.4cqw] bg-white/70 px-[0.5cqw] py-[0.3cqw] font-semibold text-slate-600 shadow-sm"
        style={{ left: '76%', top: '4.2%', width: '12%', zIndex: 5, fontSize: '1cqw' }}
      >
        Z311 · Molecular Biology Lab
      </div>

      {/* ───── fume hood ───── */}
      <div className="pointer-events-none absolute" style={{ left: '0.6%', top: '2%', width: '25%', height: '94%', zIndex: 5 }}>
        <FumeHoodBack />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[0.8cqw]" style={{ height: '7.6%' }}>
          <span className="font-extrabold tracking-wider text-slate-100" style={{ fontSize: '1cqw' }}>
            CHEMICAL FUME HOOD
          </span>
          <span className="flex items-center gap-[0.3cqw] rounded bg-slate-900/70 px-[0.4cqw] py-[0.15cqw] font-mono text-emerald-300" style={{ fontSize: '0.8cqw' }}>
            <span className="inline-block rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" style={{ width: '0.6cqw', height: '0.6cqw' }} />
            0.5 m/s
          </span>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded bg-red-600 px-[0.5cqw] py-[0.15cqw] text-center font-bold text-white"
          style={{ top: '9.2%', fontSize: '0.92cqw', whiteSpace: 'nowrap' }}
        >
          PHENOL / CHLOROFORM — HOOD ONLY
        </div>
      </div>

      <Obj id="reagent-pci" x={2.6} y={52.6} w={6.2} z={12} hint={hint} label="Phenol / chloroform">
        <BottleSVG cap={REAGENTS.pci.cap} label="P:C" sub="organic extraction" liquid={REAGENTS.pci.color} amber hazard level={0.62} />
      </Obj>
      <Obj id="hazwaste" x={19.2} y={55.4} w={6} z={12} hint={hint}>
        <JerricanSVG />
      </Obj>
      <div className="pointer-events-none absolute" style={{ left: `${HOOD_RACK.x}%`, top: `${HOOD_RACK.y}%`, width: `${HOOD_RACK.w}%`, height: `${rackH(HOOD_RACK.w)}%`, zIndex: 11 }}>
        <RackSVG part="back" slots={HOOD_RACK.slots} color="#a78bfa" />
      </div>
      <Obj id="rack-hood" x={HOOD_RACK.x} y={HOOD_RACK.y - 9} w={HOOD_RACK.w} h={rackH(HOOD_RACK.w) + 9} z={placingTube ? 22 : 13} hint={hint} hintBox />
      <div className="pointer-events-none absolute" style={{ left: `${HOOD_RACK.x}%`, top: `${HOOD_RACK.y}%`, width: `${HOOD_RACK.w}%`, height: `${rackH(HOOD_RACK.w)}%`, zIndex: 15 }}>
        <RackSVG part="front" slots={HOOD_RACK.slots} color="#a78bfa" />
      </div>
      <div className="pointer-events-none absolute" style={{ left: '0.6%', top: '2%', width: '25%', height: '94%', zIndex: 18 }}>
        <FumeHoodSash />
      </div>

      {/* ───── PPE station ───── */}
      <div
        className="absolute rounded-[0.6cqw] border border-slate-400/60 shadow-inner"
        style={{
          left: '26.6%',
          top: '2.5%',
          width: '11%',
          height: '36%',
          zIndex: 4,
          background: 'radial-gradient(circle, rgba(100,116,139,0.35) 1px, transparent 1.4px) 0 0 / 0.9cqw 0.9cqw, #e9eef2',
        }}
      >
        <div className="absolute inset-x-0 top-0 rounded-t-[0.6cqw] bg-emerald-700 text-center font-extrabold tracking-wider text-white" style={{ fontSize: '1cqw', padding: '0.2cqw 0' }}>
          PPE STATION
        </div>
      </div>
      <Obj id="ppe-coat" x={27.1} y={6.4} w={5.2} z={10} hint={hint} tipBelow>
        <CoatSVG worn={s.ppe.coat} />
      </Obj>
      <Obj id="ppe-goggles" x={32.6} y={9} w={4.6} z={10} hint={hint} tipBelow>
        <GogglesSVG worn={s.ppe.goggles} />
      </Obj>
      <Obj id="ppe-gloves" x={32.4} y={19} w={4.9} z={10} hint={hint} tipBelow>
        <GloveBoxSVG worn={s.ppe.gloves} />
      </Obj>

      {/* ───── reagent shelf ───── */}
      <div className="absolute rounded-sm shadow-lg" style={{ left: '38.4%', top: '33.4%', width: '30%', height: '1.6%', zIndex: 6, background: 'linear-gradient(180deg,#9aa6b2,#6b7785)' }} />
      <div className="absolute bg-slate-500" style={{ left: '40%', top: '35%', width: '0.5%', height: '3%', zIndex: 5 }} />
      <div className="absolute bg-slate-500" style={{ left: '66.4%', top: '35%', width: '0.5%', height: '3%', zIndex: 5 }} />
      {s.exp.bottles.length > 5 && <div className="absolute rounded-sm shadow-lg" style={{ left: '38.4%', top: '50.9%', width: '30%', height: '1.2%', zIndex: 6, background: 'linear-gradient(180deg,#9aa6b2,#6b7785)' }} />}
      {s.exp.bottles.map((b, i) => (
        <Obj
          key={b.id}
          id={`reagent-${b.id}`}
          x={bottleX(i, s.exp.bottles.length)}
          y={bottleY(i, s.exp.bottles.length)}
          w={bottleGeom(s.exp.bottles.length).w}
          z={10}
          hint={hint}
          label={`${REAGENTS[b.id].name} — ${REAGENTS[b.id].detail}`}
          tipBelow
        >
          <BottleSVG cap={REAGENTS[b.id].cap} label={b.label} sub={b.sub} liquid={REAGENTS[b.id].color} hazard={!!REAGENTS[b.id].hazard} />
        </Obj>
      ))}

      {/* ───── pipette stand ───── */}
      <Obj id="stand" x={26.8} y={42} w={9.4} h={48} z={8} hint={hint}>
        <PipetteStandSVG />
      </Obj>
      {(['P20', 'P200', 'P1000'] as const).map((id, i) =>
        heldPip === id ? null : (
          <Obj key={id} id={`pipette-${id}`} x={27.6 + i * 2.75} y={43.6} w={3.6} z={12} hint={hint}>
            <PipetteSVG id={id} tip={s.pipettes[id].tip} load={s.pipettes[id].load} volume={s.pipettes[id].volume} className="block h-auto w-full" />
          </Obj>
        ),
      )}

      {/* ───── spin column stand ───── */}
      <div
        className="absolute rounded-sm shadow-lg"
        style={{ left: `${COLSTAND.x}%`, top: `${COLSTAND.y + rackH(COLSTAND.w)}%`, width: `${COLSTAND.w}%`, height: '1.1%', zIndex: 9, background: 'linear-gradient(180deg,#9aa6b2,#5b6675)' }}
      />
      <Obj id="columnStand" x={COLSTAND.x} y={COLSTAND.y - 4} w={COLSTAND.w} h={rackH(COLSTAND.w) + 4} z={13} hint={hint} hintBox />

      {/* ───── bench rack + tubes ───── */}
      <div className="pointer-events-none absolute" style={{ left: `${BENCH_RACK.x}%`, top: `${BENCH_RACK.y}%`, width: `${BENCH_RACK.w}%`, height: `${rackH(BENCH_RACK.w)}%`, zIndex: 11 }}>
        <RackSVG part="back" slots={4} />
      </div>
      <Obj id="rack-bench" x={BENCH_RACK.x} y={BENCH_RACK.y - 8} w={BENCH_RACK.w} h={rackH(BENCH_RACK.w) + 8} z={placingTube ? 22 : 13} hint={hint} hintBox />
      {renderTube(s.tubes.A, 'racks')}
      {renderTube(s.tubes.B, 'racks')}
      {renderTube(s.tubes.C, 'racks')}
      <div className="pointer-events-none absolute" style={{ left: `${BENCH_RACK.x}%`, top: `${BENCH_RACK.y}%`, width: `${BENCH_RACK.w}%`, height: `${rackH(BENCH_RACK.w)}%`, zIndex: 15 }}>
        <RackSVG part="front" slots={4} />
      </div>

      {/* ───── tips & waste ───── */}
      <Obj id="tips-T20" x={37.2} y={85.4} w={5.1} z={12} hint={hint}>
        <TipBoxSVG color="#f1f5f9" box="#cbd5e1" label="20 µL" />
      </Obj>
      <Obj id="tips-T200" x={42.5} y={85.4} w={5.1} z={12} hint={hint}>
        <TipBoxSVG color="#facc15" box="#fde68a" label="200 µL" />
      </Obj>
      <Obj id="tips-T1000" x={47.8} y={85.4} w={5.1} z={12} hint={hint}>
        <TipBoxSVG color="#3b82f6" box="#93c5fd" label="1000 µL" />
      </Obj>
      <Obj id="tipwaste" x={53.4} y={84} w={4.2} z={12} hint={hint}>
        <TipWasteSVG />
      </Obj>
      <Obj id="liquidwaste" x={58.1} y={83.6} w={4.4} z={12} hint={hint}>
        <BeakerSVG />
      </Obj>
      <Obj id="plastics" x={86.2} y={82.2} w={4.2} z={12} hint={hint}>
        <PlasticWasteSVG />
      </Obj>

      {/* ───── ice bucket ───── */}
      <Obj id="reagent-rnase" x={54.8} y={50.6} w={2.5} z={8} hint={hint} label="RNase A (10 mg/mL, on ice)">
        <EnzymeTubeSVG label="RNase" cap="#2563eb" />
      </Obj>
      <Obj id="reagent-protk" x={57.4} y={50.6} w={2.5} z={8} hint={hint} label="Proteinase K (20 mg/mL, on ice)">
        <EnzymeTubeSVG />
      </Obj>
      <Obj id="reagent-etoh100" x={60.6} y={48.6} w={4.2} z={8} hint={hint} label="Ice-cold 100% ethanol">
        <BottleSVG cap={REAGENTS.etoh100.cap} label="100%" sub="EtOH · cold" liquid={REAGENTS.etoh100.color} hazard />
      </Obj>
      <div className="pointer-events-none absolute" style={{ left: '55.6%', top: '57.8%', width: '10.6%', zIndex: 9 }}>
        <IceBucketSVG />
      </div>

      {/* ───── heat block ───── */}
      {renderTube(s.tubes.A, 'heat')}
      {renderTube(s.tubes.B, 'heat')}
      <Obj id="heatblock" x={HEAT.x} y={HEAT.y} w={HEAT.w} z={16} hint={hint}>
        <HeatBlockSVG display={heatRunning || heatTubeId ? `${s.heatSet.temp.toFixed(1)}°` : '--.-°'} running={heatRunning} active={!!heatTubeId} />
      </Obj>

      {/* ───── centrifuge ───── */}
      <Obj id="centrifuge" x={67.2} y={51.8} w={16} z={12} hint={hint}>
        <CentrifugeSVG
          running={s.spinState === 'running'}
          line1={s.spinState === 'running' ? `${s.spin.speed.toLocaleString()} g` : s.rotor.some(Boolean) ? 'LOADED' : 'READY'}
          line2={`${s.spin.time} min · ${s.spin.temp}°C`}
        />
      </Obj>

      {/* ───── spectrophotometer ───── */}
      <Obj id="nanodrop" x={83.6} y={63.6} w={6.6} z={12} hint={hint}>
        <NanoDropSVG loaded={s.nano.loaded} />
      </Obj>

      {/* ───── balance tubes ───── */}
      <div className="pointer-events-none absolute" style={{ left: `${BAL_RACK.x}%`, top: `${BAL_RACK.y}%`, width: `${BAL_RACK.w}%`, height: `${rackH(BAL_RACK.w)}%`, zIndex: 11 }}>
        <RackSVG part="back" slots={3} color="#34d399" />
      </div>
      {s.exp.balances.map((bid, i) => (
        <div
          key={bid}
          className="pointer-events-none absolute"
          style={{ left: `${slotLeft({ ...BAL_RACK, slots: s.exp.balances.length }, i, 2.5)}%`, top: `${slotTop(BAL_RACK, (2.5 * AR * 200) / 76)}%`, width: '2.5%', zIndex: 12 }}
        >
          <TubeSVG layers={[L('w', 'Water', BALANCES[bid].volume, COLORS.water, 0.55)]} label={(BALANCES[bid].volume / 1000).toFixed(1).replace(/0$/, '')} capColor="#bbf7d0" className="block h-auto w-full" />
        </div>
      ))}
      <Obj id="balances" x={BAL_RACK.x} y={BAL_RACK.y - 6} w={BAL_RACK.w} h={rackH(BAL_RACK.w) + 6} z={13} hint={hint} />
      <div className="pointer-events-none absolute" style={{ left: `${BAL_RACK.x}%`, top: `${BAL_RACK.y}%`, width: `${BAL_RACK.w}%`, height: `${rackH(BAL_RACK.w)}%`, zIndex: 14 }}>
        <RackSVG part="front" slots={3} color="#34d399" />
      </div>
      <div
        className="pointer-events-none absolute text-center font-extrabold tracking-wider text-emerald-950"
        style={{ left: `${BAL_RACK.x - 4}%`, top: `${BAL_RACK.y + rackH(BAL_RACK.w) * 0.5}%`, width: `${BAL_RACK.w + 8}%`, zIndex: 15, fontSize: '0.72cqw' }}
      >
        BALANCES · plastic counts as ~0.5 mL
      </div>

      {/* ───── freezer ───── */}
      <Obj id="freezer" x={90.6} y={23} w={9.2} z={12} hint={hint}>
        <FreezerSVG temperature={s.storageTemperature} />
      </Obj>

      {/* lighting */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 40, background: 'radial-gradient(ellipse at 50% 35%, transparent 55%, rgba(2,6,23,0.35) 100%)' }} />
    </div>
  );
}
