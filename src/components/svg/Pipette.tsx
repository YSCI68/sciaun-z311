import type { CSSProperties } from 'react';
import type { Load, PipetteId } from '../../types';
import { PIPETTES, TIPS } from '../../data/reagents';

interface Props {
  id: PipetteId;
  tip: null | 'fresh' | 'used';
  load: Load | null;
  volume: number;
  className?: string;
  style?: CSSProperties;
}

/** Air-displacement micropipette, viewBox 0 0 40 230. The tip end sits at (20, 227). */
export function PipetteSVG({ id, tip, load, volume, className, style }: Props) {
  const info = PIPETTES[id];
  const tipInfo = TIPS[info.tip];
  const digits = String(Math.round(volume)).padStart(id === 'P1000' ? 4 : 3, '0').split('');
  return (
    <svg viewBox="0 0 40 230" className={className} style={style} overflow="visible">
      <defs>
        <linearGradient id={`pb-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.35" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#b6c2d1" />
        </linearGradient>
      </defs>
      {/* plunger */}
      <rect x="13.5" y="1.5" width="13" height="10" rx="3.5" fill={info.color} stroke="#334155" strokeWidth="0.8" />
      <rect x="17.5" y="11" width="5" height="11" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" />
      {/* finger hook */}
      <path d="M10,34 q-7,1 -6.5,9 q0.5,5 6.5,4" fill="#d5dde7" stroke="#64748b" strokeWidth="0.8" />
      {/* body */}
      <path
        d="M11,22 h18 a3,3 0 0 1 3,3 v86 q0,8 -6,12 h-12 q-6,-4 -6,-12 v-86 a3,3 0 0 1 3,-3 z"
        fill={`url(#pb-${id})`}
        stroke="#64748b"
        strokeWidth="0.9"
      />
      <rect x="9" y="26" width="22" height="5" fill={info.color} opacity="0.95" />
      {/* volume window */}
      <rect x="13" y="50" width="14" height={digits.length * 6.6 + 3} rx="2" fill="#0f172a" />
      {digits.map((d, i) => (
        <text
          key={i}
          x="20"
          y={57 + i * 6.6}
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          fill="#e2e8f0"
          fontFamily="JetBrains Mono, monospace"
        >
          {d}
        </text>
      ))}
      <text x="20" y="98" textAnchor="middle" fontSize="5.6" fontWeight="800" fill="#334155" fontFamily="Inter, sans-serif">
        {id}
      </text>
      {/* tip ejector */}
      <path d="M27.5,112 h4.5 v30 h-3.2 z" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.6" />
      {/* shaft */}
      <path d="M13,123 h14 l-4,59 h-6 z" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
      {/* tip */}
      {tip && (
        <path
          d="M16.6,180 h6.8 l-3,47 h-0.8 z"
          fill={tipInfo.fill}
          stroke={id === 'P20' ? '#94a3b8' : tipInfo.color}
          strokeWidth="0.6"
        />
      )}
      {tip && load && <path d="M18,202 h4 l-1.6,25 h-0.8 z" fill={load.color} opacity="0.95" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />}
      {tip === 'used' && !load && <circle cx="20" cy="225" r="0.9" fill="rgba(148,163,184,0.8)" />}
    </svg>
  );
}
