import { useId } from 'react';
import type { ReactElement } from 'react';

const uidOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/* ───────── Reagent bottle (viewBox 0 0 50 92) ───────── */
export function BottleSVG({
  cap,
  label,
  sub,
  liquid,
  amber,
  hazard,
  level = 0.7,
}: {
  cap: string;
  label: string;
  sub: string;
  liquid: string;
  amber?: boolean;
  hazard?: boolean;
  level?: number;
}) {
  const u = uidOf(useId());
  return (
    <svg viewBox="0 0 50 92" className="block h-auto w-full" overflow="visible">
      <defs>
        <clipPath id={`bc${u}`}>
          <rect x="6" y="22" width="38" height="66" rx="6" />
        </clipPath>
        <linearGradient id={`bg${u}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <ellipse cx="25" cy="89" rx="21" ry="2.6" fill="rgba(0,0,0,0.28)" />
      <rect x="6" y="22" width="38" height="66" rx="6" fill={amber ? 'rgba(120,53,15,0.85)' : 'rgba(226,232,240,0.5)'} />
      <g clipPath={`url(#bc${u})`}>
        <rect x="0" y={22 + 66 * (1 - level)} width="50" height="66" fill={liquid} opacity={amber ? 0.35 : 0.6} />
      </g>
      <rect x="6" y="22" width="38" height="66" rx="6" fill={`url(#bg${u})`} stroke="rgba(51,65,85,0.65)" strokeWidth="1" />
      <rect x="17" y="13.5" width="16" height="9.5" fill={amber ? 'rgba(120,53,15,0.85)' : 'rgba(226,232,240,0.7)'} stroke="rgba(51,65,85,0.55)" strokeWidth="0.8" />
      <rect x="13.5" y="2.5" width="23" height="12" rx="2.5" fill={cap} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      {[17, 21, 25, 29, 33].map((x) => (
        <line key={x} x1={x} x2={x} y1="4" y2="13" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
      ))}
      <rect x="9" y="42" width="32" height="32" rx="2" fill="#fff" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
      <rect x="9" y="42" width="32" height="4.5" rx="1" fill={cap} opacity="0.9" />
      <text x="25" y="57" textAnchor="middle" fontSize={label.length > 5 ? 6.4 : 8} fontWeight="800" fill="#0f172a" fontFamily="Inter, sans-serif">
        {label}
      </text>
      <text x="25" y="64.5" textAnchor="middle" fontSize="4.3" fill="#475569" fontFamily="Inter, sans-serif">
        {sub}
      </text>
      {hazard && (
        <g transform="translate(25,70)">
          <rect x="-2.6" y="-2.6" width="5.2" height="5.2" transform="rotate(45)" fill="#fff" stroke="#dc2626" strokeWidth="0.9" />
          <text y="1.7" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#111827">
            !
          </text>
        </g>
      )}
    </svg>
  );
}

/* ───────── Tip box (viewBox 0 0 60 44) ───────── */
export function TipBoxSVG({ color, label, box }: { color: string; label: string; box: string }) {
  const tips: ReactElement[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 9; c++) {
      const x = 7.5 + c * 5.6 + r * -1.1;
      const y = 15.6 + r * 2.4;
      tips.push(<ellipse key={`${r}-${c}`} cx={x + 1.8} cy={y} rx="1.5" ry="0.85" fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />);
    }
  return (
    <svg viewBox="0 0 60 44" className="block h-auto w-full" overflow="visible">
      <ellipse cx="30" cy="41.5" rx="29" ry="2.3" fill="rgba(0,0,0,0.3)" />
      <path d="M8,13 L52,13 L48,1.5 L12,1.5 Z" fill="rgba(226,232,240,0.35)" stroke="rgba(148,163,184,0.7)" strokeWidth="0.6" />
      <path d="M6,13.5 L54,13.5 L58,22 L2,22 Z" fill="#e2e8f0" stroke="rgba(71,85,105,0.6)" strokeWidth="0.6" />
      {tips}
      <rect x="2" y="22" width="56" height="18" rx="2" fill={box} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      <rect x="2" y="22" width="56" height="3" fill="rgba(255,255,255,0.25)" />
      <text x="30" y="34.5" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="#0f172a" fontFamily="Inter, sans-serif">
        {label}
      </text>
    </svg>
  );
}

/* ───────── Tube rack (viewBox 0 0 100 30) ───────── */
export function RackSVG({ part, slots, color = '#38bdf8' }: { part: 'back' | 'front'; slots: number; color?: string }) {
  const holes = Array.from({ length: slots }, (_, i) => ((i + 0.5) * 100) / slots);
  if (part === 'back')
    return (
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="block h-full w-full">
        <path d="M4,4 L96,4 L99,13 L1,13 Z" fill={color} opacity="0.95" />
        <path d="M4,4 L96,4 L99,13 L1,13 Z" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5" />
        {holes.map((x) => (
          <ellipse key={x} cx={x} cy="8.5" rx={Math.min(5, 26 / slots)} ry="2.2" fill="rgba(15,23,42,0.4)" />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="block h-full w-full">
      <ellipse cx="50" cy="28.5" rx="50" ry="1.6" fill="rgba(0,0,0,0.35)" />
      <rect x="1" y="13" width="98" height="14" rx="1.5" fill={color} fillOpacity="0.5" />
      <rect x="1" y="13" width="98" height="2.2" fill="rgba(255,255,255,0.5)" />
      <rect x="1" y="24.5" width="98" height="2.5" rx="1" fill={color} />
      <rect x="1" y="24.5" width="98" height="2.5" rx="1" fill="rgba(0,0,0,0.2)" />
      {holes.map((x) => (
        <rect key={x} x={x - 3.5} y="16.5" width="7" height="6.5" rx="1.2" fill="none" stroke="rgba(15,23,42,0.25)" strokeWidth="0.6" />
      ))}
    </svg>
  );
}

/* ───────── Ice bucket (viewBox 0 0 100 60) ───────── */
export function IceBucketSVG() {
  return (
    <svg viewBox="0 0 100 60" className="block h-auto w-full" overflow="visible">
      <ellipse cx="50" cy="57" rx="46" ry="3" fill="rgba(0,0,0,0.3)" />
      <path d="M4,14 L96,14 L88,56 L12,56 Z" fill="#1d4ed8" />
      <path d="M4,14 L96,14 L88,56 L12,56 Z" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      <path d="M4,14 L96,14 L95,19 L5,19 Z" fill="#3b82f6" />
      <ellipse cx="50" cy="14" rx="46" ry="5" fill="#e0f2fe" />
      {[
        [14, 11],
        [24, 9],
        [36, 12],
        [48, 9.5],
        [60, 12],
        [72, 9],
        [84, 11.5],
        [30, 15],
        [66, 15.5],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 4.5} y={y - 3} width="9" height="6.5" rx="2" fill="#f8fafc" stroke="#bae6fd" strokeWidth="0.6" transform={`rotate(${(i * 23) % 30 - 15} ${x} ${y})`} />
      ))}
      <text x="50" y="40" textAnchor="middle" fontSize="7" fontWeight="800" fill="#dbeafe" fontFamily="Inter, sans-serif">
        ICE
      </text>
    </svg>
  );
}

/* ───────── Small enzyme tube (viewBox 0 0 30 80) ───────── */
export function EnzymeTubeSVG({ label = 'Prot K', cap = '#dc2626' }: { label?: string; cap?: string }) {
  return (
    <svg viewBox="0 0 30 80" className="block h-auto w-full" overflow="visible">
      <path d="M7,18 L7,55 L13,74 Q15,77 17,74 L23,55 L23,18 Z" fill="rgba(241,245,249,0.75)" stroke="rgba(71,85,105,0.8)" strokeWidth="0.8" />
      <path d="M8,48 L22,48 L22,55 L16.5,72 Q15,74 13.5,72 L8,55 Z" fill="#f1f5f9" opacity="0.9" />
      <rect x="4" y="13" width="22" height="6" rx="1.5" fill="rgba(241,245,249,0.95)" stroke="rgba(71,85,105,0.8)" strokeWidth="0.8" />
      <rect x="5" y="4" width="20" height="9" rx="2.5" fill={cap} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      <rect x="8" y="26" width="14" height="14" rx="1" fill="#fff" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
      <text x="15" y="32" textAnchor="middle" fontSize="4.4" fontWeight="800" fill="#991b1b" fontFamily="Inter, sans-serif">
        {label}
      </text>
    </svg>
  );
}

/* ───────── Tip waste bin (viewBox 0 0 40 56) ───────── */
export function TipWasteSVG() {
  return (
    <svg viewBox="0 0 40 56" className="block h-auto w-full" overflow="visible">
      <ellipse cx="20" cy="53.5" rx="18" ry="2.3" fill="rgba(0,0,0,0.3)" />
      <path d="M8,9 l2,-6 M14,9 l-1,-7 M22,9 l3,-6 M28,9 l-2,-7" stroke="#60a5fa" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11,9 l1,-5 M25,9 l0,-6" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3,9 L37,9 L34,52 L6,52 Z" fill="#f97316" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      <rect x="2" y="7" width="36" height="4" rx="1.2" fill="#fb923c" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      <rect x="8" y="21" width="24" height="15" rx="1.5" fill="#fff" />
      <text x="20" y="28" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#7c2d12" fontFamily="Inter, sans-serif">
        TIP
      </text>
      <text x="20" y="33.5" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#7c2d12" fontFamily="Inter, sans-serif">
        WASTE
      </text>
    </svg>
  );
}

/* ───────── Liquid waste beaker (viewBox 0 0 40 56) ───────── */
export function BeakerSVG({ level = 0.35 }: { level?: number }) {
  const u = uidOf(useId());
  return (
    <svg viewBox="0 0 40 56" className="block h-auto w-full" overflow="visible">
      <defs>
        <clipPath id={`bk${u}`}>
          <path d="M6,8 L34,8 L34,50 Q34,52 32,52 L8,52 Q6,52 6,50 Z" />
        </clipPath>
      </defs>
      <ellipse cx="20" cy="53.5" rx="17" ry="2.2" fill="rgba(0,0,0,0.3)" />
      <g clipPath={`url(#bk${u})`}>
        <rect x="0" y={52 - 44 * level} width="40" height="56" fill="#cbd5e1" opacity="0.55" />
      </g>
      <path d="M6,8 L34,8 L34,50 Q34,52 32,52 L8,52 Q6,52 6,50 Z" fill="rgba(226,232,240,0.25)" stroke="rgba(203,213,225,0.95)" strokeWidth="1" />
      <path d="M3,6 Q5,8 6,8 M34,8 L36,6" stroke="rgba(203,213,225,0.95)" strokeWidth="1" fill="none" />
      {[18, 26, 34, 42].map((y) => (
        <line key={y} x1="7" x2="12" y1={y} y2={y} stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
      ))}
      <rect x="13" y="22" width="18" height="11" rx="1" fill="#fff" opacity="0.95" />
      <text x="22" y="27" textAnchor="middle" fontSize="3.9" fontWeight="800" fill="#334155" fontFamily="Inter, sans-serif">
        LIQUID
      </text>
      <text x="22" y="31.3" textAnchor="middle" fontSize="3.9" fontWeight="800" fill="#334155" fontFamily="Inter, sans-serif">
        WASTE
      </text>
    </svg>
  );
}

/* ───────── Halogenated waste jerrican (viewBox 0 0 50 80) ───────── */
export function JerricanSVG() {
  return (
    <svg viewBox="0 0 50 80" className="block h-auto w-full" overflow="visible">
      <ellipse cx="25" cy="77.5" rx="23" ry="2.4" fill="rgba(0,0,0,0.3)" />
      <path d="M4,18 Q4,12 10,12 L40,12 Q46,12 46,18 L46,74 Q46,76 44,76 L6,76 Q4,76 4,74 Z" fill="#f1f5f9" stroke="rgba(71,85,105,0.7)" strokeWidth="1" />
      <path d="M12,12 L12,5 Q12,3 14,3 L26,3 Q28,3 28,5 L28,12" fill="none" stroke="rgba(71,85,105,0.8)" strokeWidth="2.2" />
      <rect x="32" y="5" width="9" height="8" rx="1.5" fill="#ea580c" />
      <rect x="8" y="26" width="34" height="36" rx="2" fill="#ffedd5" stroke="#ea580c" strokeWidth="1" />
      <rect x="8" y="26" width="34" height="7" rx="1.5" fill="#ea580c" />
      <text x="25" y="31.3" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#fff" fontFamily="Inter, sans-serif">
        HAZARDOUS
      </text>
      <text x="25" y="40" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="#7c2d12" fontFamily="Inter, sans-serif">
        HALOGENATED
      </text>
      <text x="25" y="45" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="#7c2d12" fontFamily="Inter, sans-serif">
        ORGANIC WASTE
      </text>
      {[17, 25, 33].map((x) => (
        <g key={x} transform={`translate(${x},54)`}>
          <rect x="-2.6" y="-2.6" width="5.2" height="5.2" transform="rotate(45)" fill="#fff" stroke="#dc2626" strokeWidth="0.8" />
          <text y="1.6" textAnchor="middle" fontSize="4.2" fontWeight="900" fill="#111827">
            !
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ───────── Contaminated plastics bin (viewBox 0 0 48 60) ───────── */
export function PlasticWasteSVG() {
  return (
    <svg viewBox="0 0 48 60" className="block h-auto w-full" overflow="visible">
      <ellipse cx="24" cy="57.5" rx="22" ry="2.2" fill="rgba(0,0,0,0.3)" />
      <path d="M8,12 L40,12 L37,55 Q37,57 35,57 L13,57 Q11,57 11,55 Z" fill="#facc15" stroke="#713f12" strokeWidth="1" />
      <rect x="5" y="8" width="38" height="6" rx="2" fill="#fde047" stroke="#713f12" strokeWidth="1" />
      <rect x="11" y="23" width="26" height="20" rx="2" fill="#fffbeb" stroke="#a16207" strokeWidth="0.7" />
      <text x="24" y="31" textAnchor="middle" fontSize="5.1" fontWeight="900" fill="#713f12" fontFamily="Inter, sans-serif">
        PLASTIC
      </text>
      <text x="24" y="37.5" textAnchor="middle" fontSize="5.1" fontWeight="900" fill="#713f12" fontFamily="Inter, sans-serif">
        WASTE
      </text>
      <path d="M17,5 L31,5" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ───────── Heat block (viewBox 0 0 120 70) ───────── */
export function HeatBlockSVG({ display, running, active }: { display: string; running?: boolean; active?: boolean }) {
  const u = uidOf(useId());
  return (
    <svg viewBox="0 0 120 70" className="block h-auto w-full" overflow="visible">
      <defs>
        <linearGradient id={`al${u}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="67.5" rx="58" ry="2.6" fill="rgba(0,0,0,0.35)" />
      {running && (
        <g className="heat-shimmer" stroke="#fca5a5" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M30,6 q3,-3 0,-6 q-3,-3 0,-6" />
          <path d="M60,6 q3,-3 0,-6 q-3,-3 0,-6" />
          <path d="M90,6 q3,-3 0,-6 q-3,-3 0,-6" />
        </g>
      )}
      <path d="M14,8 L106,8 L112,20 L8,20 Z" fill={`url(#al${u})`} stroke="rgba(51,65,85,0.6)" strokeWidth="0.7" />
      {[22, 38, 54, 70, 86, 100].map((x, i) => (
        <ellipse key={i} cx={x} cy="14" rx="4.6" ry="2.4" fill="rgba(15,23,42,0.75)" />
      ))}
      <rect x="6" y="20" width="108" height="46" rx="5" fill="#e2e8f0" stroke="rgba(51,65,85,0.6)" strokeWidth="0.8" />
      <rect x="6" y="20" width="108" height="5" fill="rgba(255,255,255,0.5)" />
      <rect x="12" y="31" width="54" height="22" rx="3" fill="#111827" stroke="#334155" strokeWidth="1" />
      <text
        x="39"
        y="47"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill={running ? '#f87171' : active ? '#fca5a5' : '#7f1d1d'}
        fontFamily="JetBrains Mono, monospace"
      >
        {display}
      </text>
      <circle cx="80" cy="37" r="4" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
      <circle cx="95" cy="37" r="4" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
      <circle cx="87.5" cy="50" r="4.4" fill={running ? '#ef4444' : '#16a34a'} stroke="#14532d" strokeWidth="0.6" />
      <text x="60" y="62" textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#64748b" fontFamily="Inter, sans-serif" letterSpacing="0.8">
        DRY BATH · HEAT BLOCK
      </text>
    </svg>
  );
}

/* ───────── Microcentrifuge (viewBox 0 0 140 110) ───────── */
export function CentrifugeSVG({ running, line1, line2 }: { running?: boolean; line1: string; line2: string }) {
  const u = uidOf(useId());
  return (
    <svg viewBox="0 0 140 110" className={`block h-auto w-full ${running ? 'humming' : ''}`} overflow="visible">
      <defs>
        <linearGradient id={`cg${u}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <radialGradient id={`cw${u}`}>
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="106" rx="66" ry="3.4" fill="rgba(0,0,0,0.38)" />
      <path d="M8,44 Q8,34 18,34 L122,34 Q132,34 132,44 L132,98 Q132,104 126,104 L14,104 Q8,104 8,98 Z" fill={`url(#cg${u})`} stroke="rgba(51,65,85,0.7)" strokeWidth="0.9" />
      <path d="M16,40 Q20,10 70,9 Q120,10 124,40 Z" fill="#e2e8f0" stroke="rgba(51,65,85,0.7)" strokeWidth="0.9" />
      <ellipse cx="70" cy="28" rx="34" ry="10" fill={`url(#cw${u})`} stroke="#475569" strokeWidth="1" />
      <g style={{ transformOrigin: '70px 28px', transformBox: 'view-box' }} className={running ? 'rotor-spin' : ''}>
        <ellipse cx="70" cy="28" rx="22" ry="6.5" fill="#64748b" opacity="0.85" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <circle key={a} cx={70 + 17 * Math.cos((a * Math.PI) / 180)} cy={28 + 5 * Math.sin((a * Math.PI) / 180)} r="1.6" fill="#cbd5e1" />
        ))}
      </g>
      <ellipse cx="62" cy="24" rx="14" ry="3" fill="#fff" opacity="0.18" />
      <rect x="18" y="64" width="64" height="28" rx="3" fill="#0b1220" stroke="#334155" strokeWidth="1" />
      <text x="50" y="76" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={running ? '#67e8f9' : '#22d3ee'} fontFamily="JetBrains Mono, monospace">
        {line1}
      </text>
      <text x="50" y="87" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
        {line2}
      </text>
      <circle cx="98" cy="72" r="5" fill="#16a34a" stroke="#14532d" strokeWidth="0.7" />
      <circle cx="114" cy="72" r="5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.7" />
      <rect x="92" y="84" width="28" height="7" rx="2" fill="#94a3b8" />
      <text x="70" y="100" textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#64748b" letterSpacing="0.8" fontFamily="Inter, sans-serif">
        MICROCENTRIFUGE · 21,000 × g
      </text>
    </svg>
  );
}

/* ───────── −20 °C freezer (viewBox 0 0 80 400) ───────── */
export function FreezerSVG({ temperature = -20 }: { temperature?: -20 | -80 }) {
  return (
    <svg viewBox="0 0 80 400" className="block h-auto w-full" overflow="visible">
      <rect x="3" y="2" width="74" height="392" rx="6" fill="#e5e9ee" stroke="rgba(51,65,85,0.6)" strokeWidth="1" />
      <rect x="3" y="2" width="74" height="392" rx="6" fill="none" />
      <rect x="7" y="8" width="66" height="378" rx="4" fill="#f1f5f9" stroke="rgba(100,116,139,0.5)" strokeWidth="0.8" />
      <rect x="11" y="16" width="5" height="120" rx="2.5" fill="#94a3b8" />
      <rect x="22" y="22" width="44" height="24" rx="3" fill="#0b1220" />
      <text x="44" y="39" textAnchor="middle" fontSize="12" fontWeight="700" fill="#38bdf8" fontFamily="JetBrains Mono, monospace">
        {temperature}°C
      </text>
      <g transform="translate(44,90)" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round">
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <line x1="0" y1="-13" x2="0" y2="13" />
            <line x1="-4" y1="-9" x2="0" y2="-5" />
            <line x1="4" y1="-9" x2="0" y2="-5" />
            <line x1="-4" y1="9" x2="0" y2="5" />
            <line x1="4" y1="9" x2="0" y2="5" />
          </g>
        ))}
      </g>
      <text x="44" y="122" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#475569" letterSpacing="1" fontFamily="Inter, sans-serif">
        FREEZER
      </text>
      <line x1="7" y1="250" x2="73" y2="250" stroke="rgba(100,116,139,0.45)" strokeWidth="1" />
      <rect x="11" y="262" width="5" height="60" rx="2.5" fill="#94a3b8" />
      <rect x="10" y="386" width="10" height="8" fill="#475569" />
      <rect x="60" y="386" width="10" height="8" fill="#475569" />
    </svg>
  );
}

/* ───────── UV micro-volume spectrophotometer (viewBox 0 0 100 80) ───────── */
export function NanoDropSVG({ loaded }: { loaded?: 'blank' | 'sample' | null }) {
  return (
    <svg viewBox="0 0 100 80" className="block h-auto w-full" overflow="visible">
      <ellipse cx="50" cy="77" rx="46" ry="2.6" fill="rgba(0,0,0,0.35)" />
      <path d="M10,46 L90,46 L94,74 L6,74 Z" fill="#e2e8f0" stroke="rgba(51,65,85,0.7)" strokeWidth="0.8" />
      <rect x="6" y="66" width="88" height="8" rx="2" fill="#cbd5e1" />
      <ellipse cx="38" cy="50" rx="7" ry="2.4" fill="#94a3b8" stroke="#475569" strokeWidth="0.6" />
      <circle cx="38" cy="49.5" r="1.4" fill="#475569" />
      {loaded && <ellipse cx="38" cy="47.6" rx="2.4" ry="1.8" fill={loaded === 'sample' ? '#bae6fd' : '#e0f2fe'} stroke="#7dd3fc" strokeWidth="0.4" />}
      <path d="M58,46 L60,14 Q60,10 56,10 L34,12 Q30,12.5 30,16 L31,22" fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      <path d="M58,46 L60,14 Q60,10 56,10 L34,12 Q30,12.5 30,16 L31,22" fill="none" stroke="#e2e8f0" strokeWidth="3.6" strokeLinecap="round" />
      <rect x="64" y="52" width="24" height="12" rx="1.5" fill="#0b1220" />
      <text x="76" y="60.5" textAnchor="middle" fontSize="5.6" fontWeight="700" fill="#22d3ee" fontFamily="JetBrains Mono, monospace">
        A260
      </text>
      <text x="22" y="62" textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#64748b" fontFamily="Inter, sans-serif">
        UV-Vis
      </text>
    </svg>
  );
}

/* ───────── Fume hood body (viewBox 0 0 400 940, stretched) ───────── */
export function FumeHoodBack() {
  return (
    <svg viewBox="0 0 400 940" preserveAspectRatio="none" className="block h-full w-full">
      <defs>
        <linearGradient id="hoodInt" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#d4dde5" />
        </linearGradient>
        <linearGradient id="hoodFrame" x1="0" x2="1">
          <stop offset="0" stopColor="#b8c3cd" />
          <stop offset="0.5" stopColor="#dbe2e8" />
          <stop offset="1" stopColor="#b8c3cd" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="940" rx="10" fill="url(#hoodFrame)" stroke="#8a97a3" strokeWidth="3" />
      <rect x="0" y="0" width="400" height="72" rx="10" fill="#334155" />
      <rect x="24" y="72" width="352" height="626" fill="url(#hoodInt)" stroke="#94a3b8" strokeWidth="3" />
      <rect x="40" y="80" width="320" height="14" rx="7" fill="#fff" opacity="0.95" />
      <rect x="40" y="80" width="320" height="60" fill="none" />
      {[200, 260, 320, 380, 440, 500, 560].map((y) => (
        <rect key={y} x="60" y={y} width="280" height="6" rx="3" fill="#cbd5e1" opacity="0.65" />
      ))}
      <rect x="24" y="688" width="352" height="20" fill="#1f2937" />
      <rect x="0" y="708" width="400" height="232" fill="#c3ccd5" />
      <rect x="14" y="724" width="180" height="200" rx="5" fill="#d7dee5" stroke="#9aa6b2" strokeWidth="2" />
      <rect x="206" y="724" width="180" height="200" rx="5" fill="#d7dee5" stroke="#9aa6b2" strokeWidth="2" />
      <rect x="170" y="800" width="10" height="50" rx="4" fill="#64748b" />
      <rect x="220" y="800" width="10" height="50" rx="4" fill="#64748b" />
      <rect x="54" y="760" width="100" height="34" rx="4" fill="#fde68a" stroke="#ca8a04" strokeWidth="2" />
      <rect x="246" y="760" width="100" height="34" rx="4" fill="#fecaca" stroke="#dc2626" strokeWidth="2" />
    </svg>
  );
}

export function FumeHoodSash() {
  return (
    <svg viewBox="0 0 400 940" preserveAspectRatio="none" className="block h-full w-full">
      <rect x="16" y="86" width="368" height="338" fill="rgba(186,230,253,0.22)" stroke="#94a3b8" strokeWidth="6" />
      <path d="M60,100 L150,410 M110,100 L200,410 M290,100 L340,280" stroke="#fff" strokeOpacity="0.4" strokeWidth="10" />
      <rect x="10" y="412" width="380" height="20" rx="6" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
      <rect x="150" y="416" width="100" height="10" rx="4" fill="#475569" />
    </svg>
  );
}

/* ───────── PPE ───────── */
export function CoatSVG({ worn }: { worn?: boolean }) {
  return (
    <svg viewBox="0 0 60 140" className="block h-auto w-full" overflow="visible">
      <path d="M30,4 q4,0 4,4 q0,3 -4,5 L8,24 L52,24 L30,13" fill="none" stroke="#64748b" strokeWidth="1.6" />
      {worn ? (
        <path d="M8,24 L52,24" stroke="#64748b" strokeWidth="2" />
      ) : (
        <g>
          <path
            d="M14,22 L22,20 Q30,30 38,20 L46,22 L56,40 L54,96 L48,96 L47,60 L46,134 L14,134 L13,60 L12,96 L6,96 L4,40 Z"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <path d="M22,20 L30,44 L38,20" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
          <line x1="30" y1="44" x2="30" y2="134" stroke="#cbd5e1" strokeWidth="1" />
          {[60, 80, 100].map((y) => (
            <circle key={y} cx="32.5" cy={y} r="1.3" fill="#94a3b8" />
          ))}
          <rect x="17" y="78" width="9" height="9" rx="1" fill="none" stroke="#cbd5e1" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

export function GogglesSVG({ worn }: { worn?: boolean }) {
  return (
    <svg viewBox="0 0 60 30" className="block h-auto w-full" overflow="visible">
      <path d="M30,2 q2,0 2,2" stroke="#64748b" strokeWidth="1.4" fill="none" />
      {!worn && (
        <g>
          <path d="M2,14 Q2,6 10,6 L50,6 Q58,6 58,14 L58,20 Q58,27 50,27 L38,27 Q34,27 32,22 L28,22 Q26,27 22,27 L10,27 Q2,27 2,20 Z" fill="rgba(125,211,252,0.45)" stroke="#0f766e" strokeWidth="1.6" />
          <path d="M8,10 L20,10" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.8" />
          <path d="M38,10 L50,10" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.8" />
        </g>
      )}
    </svg>
  );
}

export function GloveBoxSVG({ worn }: { worn?: boolean }) {
  return (
    <svg viewBox="0 0 60 42" className="block h-auto w-full" overflow="visible">
      {!worn && <path d="M24,12 q-2,-7 1,-10 q2,-1 3,3 q1,-5 3,-4 q2,1 1,5 q2,-3 4,-2 q1,2 -1,6 z" fill="#3b82f6" stroke="#1e40af" strokeWidth="0.6" />}
      <rect x="2" y="10" width="56" height="30" rx="2.5" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1" />
      <ellipse cx="30" cy="12.5" rx="10" ry="2.5" fill="#0c4a6e" opacity="0.6" />
      <rect x="2" y="30" width="56" height="10" rx="2" fill="#0284c7" />
      <text x="30" y="26" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#0c4a6e" fontFamily="Inter, sans-serif">
        NITRILE
      </text>
      <text x="30" y="37.5" textAnchor="middle" fontSize="5" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">
        GLOVES · M
      </text>
    </svg>
  );
}

/* ───────── Pipette stand (viewBox 0 0 100 300, stretched) ───────── */
export function PipetteStandSVG() {
  return (
    <svg viewBox="0 0 100 300" preserveAspectRatio="none" className="block h-full w-full">
      <ellipse cx="50" cy="292" rx="48" ry="6" fill="rgba(0,0,0,0.35)" />
      <rect x="4" y="276" width="92" height="16" rx="6" fill="#475569" />
      <rect x="4" y="276" width="92" height="4" rx="2" fill="#64748b" />
      <rect x="45" y="14" width="10" height="266" rx="3" fill="#64748b" />
      <rect x="6" y="8" width="88" height="12" rx="4" fill="#475569" />
      {[18, 50, 82].map((x) => (
        <path key={x} d={`M${x - 7},20 L${x + 7},20 L${x + 4},30 L${x - 4},30 Z`} fill="#334155" />
      ))}
    </svg>
  );
}

/* ───────── Wall clock (viewBox 0 0 50 50) ───────── */
export function WallClockSVG({ minutes }: { minutes: number }) {
  const m = minutes % 60;
  const h = (minutes / 60) % 12;
  const ma = (m / 60) * 360;
  const ha = (h / 12) * 360;
  return (
    <svg viewBox="0 0 50 50" className="block h-auto w-full">
      <circle cx="25" cy="25" r="23" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="25"
          y1="5.5"
          x2="25"
          y2={i % 3 === 0 ? 9.5 : 8}
          stroke="#334155"
          strokeWidth={i % 3 === 0 ? 1.8 : 1}
          transform={`rotate(${i * 30} 25 25)`}
        />
      ))}
      <line x1="25" y1="25" x2="25" y2="14" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${ha} 25 25)`} />
      <line x1="25" y1="25" x2="25" y2="9" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${ma} 25 25)`} />
      <circle cx="25" cy="25" r="1.8" fill="#dc2626" />
    </svg>
  );
}

/* ───────── Silica spin column (viewBox 0 0 56 200) ───────── */
export function SpinColumnSVG({
  liquid,
  level = 0,
  membrane,
  seated,
  className = 'block h-auto w-full',
}: {
  liquid?: string;
  level?: number;
  membrane?: boolean;
  seated?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 56 200" className={className} overflow="visible">
      <ellipse cx="28" cy="196" rx="22" ry="2.6" fill="rgba(0,0,0,0.3)" />
      {/* collection tube */}
      <path d="M12,120 L12,182 L23,194 Q28,197 33,194 L44,182 L44,120 Z" fill="rgba(241,245,249,0.45)" stroke="rgba(100,116,139,0.9)" strokeWidth="1.2" />
      <path d="M13,140 L43,140 L43,182 L32.4,192 Q28,194.5 23.6,192 L13,182 Z" fill="#e2e8f0" opacity="0.35" />
      {/* barrel */}
      <path d="M10,44 L46,44 L46,116 Q46,122 40,122 L16,122 Q10,122 10,116 Z" fill="rgba(241,245,249,0.6)" stroke="rgba(100,116,139,0.9)" strokeWidth="1.2" />
      {level > 0 && <rect x="11" y={120 - 72 * level} width="34" height={72 * level} fill={liquid ?? '#cbd5e1'} opacity="0.75" />}
      {membrane && (
        <g>
          <circle cx="28" cy="116" r="17" fill="#f8fafc" stroke="rgba(148,163,184,0.95)" strokeWidth="1.2" />
          <circle cx="28" cy="116" r="10" fill="#eef2f7" stroke="rgba(203,213,225,0.9)" strokeWidth="0.8" />
          <circle cx="28" cy="116" r="4" fill="#cbd5e1" opacity="0.8" />
          <text x="28" y="105" textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#64748b" fontFamily="Inter, sans-serif">
            silica
          </text>
        </g>
      )}
      <path d="M13,50 L13,114" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" pointerEvents="none" />
      <rect x="6" y="30" width="44" height="9" rx="2" fill="rgba(241,245,249,0.95)" stroke="rgba(100,116,139,0.9)" strokeWidth="1" />
      <text x="28" y="37" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#0f172a" fontFamily="Inter, sans-serif">
        C
      </text>
      {seated ? (
        <rect x="12" y="18" width="32" height="13" rx="2.5" fill="#f97316" stroke="rgba(120,53,15,0.5)" strokeWidth="1" />
      ) : (
        <g>
          <rect x="13" y="19" width="30" height="12" rx="3" fill="#f97316" stroke="rgba(120,53,15,0.5)" strokeWidth="1" />
          <rect x="19" y="14.5" width="18" height="5" rx="2" fill="#f97316" stroke="rgba(120,53,15,0.4)" strokeWidth="0.8" />
        </g>
      )}
      {!seated && <rect x="4" y="42" width="48" height="3" rx="1.5" fill="rgba(148,163,184,0.85)" />}
    </svg>
  );
}

/* ───────── Glass rod for spooling DNA fibres (viewBox 0 0 16 260) ───────── */
export function GlassRodSVG({ fibers = 0, twirl = false, className = 'block h-auto w-full' }: { fibers?: number; twirl?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 260" className={className} overflow="visible">
      <defs>
        <linearGradient id="rodG" x1="0" x2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.35" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect x="5" y="14" width="6" height="244" rx="3" fill="url(#rodG)" stroke="rgba(71,85,105,0.7)" strokeWidth="0.7" />
      <circle cx="8" cy="8" r="6" fill="#f1f5f9" stroke="rgba(71,85,105,0.7)" strokeWidth="0.8" />
      {fibers > 0 && (
        <g className={twirl ? 'rotor-spinup' : ''} style={{ transformOrigin: '8px 240px' }}>
          {Array.from({ length: Math.min(fibers, 8) }, (_, i) => (
            <ellipse key={i} cx="8" cy={244 - i * 3.4} rx={4 + i * 0.35} ry="2.6" fill="none" stroke="#fff" strokeWidth="1.5" opacity={0.85 + i * 0.02} />
          ))}
          <ellipse cx="8" cy={242} rx="6" ry="4" fill="#fff" opacity="0.28" />
        </g>
      )}
    </svg>
  );
}
