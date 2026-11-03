import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { Layer, PelletState } from '../../types';
import { TUBE, volToY } from '../../lib/tube';

interface Props {
  layers: Layer[];
  pellet?: PelletState;
  strands?: boolean;
  lidOpen?: boolean;
  label?: string;
  capColor?: string;
  showGrad?: boolean;
  className?: string;
  style?: CSSProperties;
  viewBox?: string;
  onLayerClick?: (key: string) => void;
  highlight?: string | null;
  frost?: boolean;
}

const INTERIOR = 'M14,44 L14,150 L27.6,187.5 Q30,192 32.4,187.5 L46,150 L46,44 Z';
const OUTER = 'M12,40 L12,150.5 L26,190 Q30,197 34,190 L48,150.5 L48,40 Z';

export function layerRects(layers: Layer[]) {
  let cum = 0;
  return layers.map((l) => {
    const yBot = volToY(cum);
    cum += l.volume;
    const yTop = volToY(cum);
    let y = yTop;
    let h = yBot - yTop;
    if (l.thin && h < 3.2) {
      y = yTop - (3.2 - h) / 2;
      h = 3.2;
    }
    return { l, y, h };
  });
}

export function TubeSVG({
  layers,
  pellet,
  strands,
  lidOpen,
  label,
  capColor = '#f8fafc',
  showGrad,
  className,
  style,
  viewBox = '0 0 76 200',
  onLayerClick,
  highlight,
  frost,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clip = `tc${uid}`;
  const emu = `te${uid}`;
  const glass = `tg${uid}`;
  const rects = layerRects(layers.filter((l) => l.volume > 0));
  const ordered = [...rects].sort((a, b) => Number(!!a.l.thin) - Number(!!b.l.thin));
  const liquidTop = rects.length ? rects[rects.length - 1].y : TUBE.tip;

  return (
    <svg viewBox={viewBox} className={className} style={style} overflow="visible">
      <defs>
        <clipPath id={clip}>
          <path d={INTERIOR} />
        </clipPath>
        <pattern id={emu} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.05" fill="#fff" opacity="0.6" />
          <circle cx="4" cy="3.8" r="0.7" fill="#fff" opacity="0.45" />
        </pattern>
        <linearGradient id={glass} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      <path d={OUTER} fill="rgba(241,245,249,0.6)" />

      <g clipPath={`url(#${clip})`}>
        {ordered.map(({ l, y, h }) => (
          <g key={l.key}>
            <rect x="0" y={y} width="76" height={h + 0.3} fill={l.color} opacity={l.opacity} />
            {l.pattern === 'emulsion' && <rect x="0" y={y} width="76" height={h} fill={`url(#${emu})`} />}
            {l.pattern === 'swirl' && (
              <path
                d={`M14,${y + 2.5} q4,-2.5 8,0 t8,0 t8,0 t8,0`}
                stroke="#ffffff"
                strokeOpacity="0.65"
                fill="none"
                strokeWidth="0.9"
              />
            )}
            {l.thin && (
              <g stroke="rgba(120,100,80,0.75)" strokeWidth="0.55">
                <line x1="0" x2="76" y1={y} y2={y} />
                <line x1="0" x2="76" y1={y + h} y2={y + h} />
              </g>
            )}
            {highlight === l.key && <rect x="0" y={y} width="76" height={h} fill="#22d3ee" opacity="0.35" />}
          </g>
        ))}
        {rects.length > 0 && <ellipse cx="30" cy={liquidTop} rx="16" ry="1.1" fill="#fff" opacity="0.4" />}
        {strands && (
          <g className="floaty" stroke="#fff" strokeLinecap="round" fill="none">
            <ellipse cx="30" cy="102" rx="11" ry="16" fill="#fff" opacity="0.16" stroke="none" />
            <path d="M21,90 q4,-6 7,0 t6,2 t5,-4" strokeWidth="1.7" opacity="0.95" />
            <path d="M19,101 q5,4 9,-1 t8,1 t4,-2" strokeWidth="1.4" opacity="0.9" />
            <path d="M24,112 q3,-5 6,-1 t6,-2 t4,3" strokeWidth="1.9" opacity="0.95" />
            <path d="M22,96 q2,6 6,4 t5,2" strokeWidth="1" opacity="0.8" />
            <path d="M27,84 q3,3 1,7" strokeWidth="1.1" opacity="0.8" />
          </g>
        )}
        {pellet && (
          <ellipse
            cx="30"
            cy="184.5"
            rx={pellet === 'overdry' ? 4.2 : 5.6}
            ry={pellet === 'overdry' ? 2.4 : 3.2}
            fill={pellet === 'wet' ? '#ffffff' : pellet === 'dry' ? 'rgba(255,255,255,0.6)' : '#f5f5f4'}
            stroke={pellet === 'overdry' ? '#a8a29e' : pellet === 'dry' ? 'rgba(148,163,184,0.7)' : 'none'}
            strokeWidth="0.6"
          />
        )}
        {frost && <rect x="0" y="0" width="76" height="200" fill="#e0f2fe" opacity="0.35" />}
      </g>

      {/* clickable hit areas for quiz mode (thin layers get padded) */}
      {onLayerClick && (
        <g clipPath={`url(#${clip})`}>
          {ordered.map(({ l, y, h }) => (
            <rect
              key={`hit-${l.key}`}
              data-layer={l.key}
              role="button"
              aria-label={l.label}
              x="0"
              y={l.thin ? y - 2.2 : y}
              width="76"
              height={l.thin ? h + 4.4 : h}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onLayerClick(l.key);
              }}
            />
          ))}
        </g>
      )}

      <path d={OUTER} fill={`url(#${glass})`} stroke="rgba(100,116,139,0.9)" strokeWidth="1.2" pointerEvents="none" />
      <path d="M15.5,46 L15.5,148" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" pointerEvents="none" />

      {showGrad && (
        <g stroke="rgba(71,85,105,0.85)" strokeWidth="0.7" fontSize="5" fill="rgba(51,65,85,0.95)" pointerEvents="none">
          {(
            [
              [100, '0.1'],
              [500, '0.5'],
              [1000, '1.0'],
              [1500, '1.5'],
            ] as [number, string][]
          ).map(([v, t]) => {
            const y = volToY(v);
            return (
              <g key={t}>
                <line x1="12" x2="17.5" y1={y} y2={y} />
                <text x="1" y={y + 1.8} stroke="none" fontFamily="JetBrains Mono, monospace">
                  {t}
                </text>
              </g>
            );
          })}
        </g>
      )}

      <rect x="9" y="34" width="42" height="7" rx="2" fill="rgba(241,245,249,0.92)" stroke="rgba(100,116,139,0.9)" strokeWidth="1" />
      {label && (
        <text
          x="30"
          y="64"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="#1e3a8a"
          opacity="0.78"
          fontFamily="Inter, sans-serif"
          pointerEvents="none"
        >
          {label}
        </text>
      )}

      {lidOpen ? (
        <g>
          <path d="M50,37 q9,-3 10,-11" stroke="rgba(100,116,139,0.95)" strokeWidth="2.6" fill="none" />
          <rect x="56" y="2" width="13" height="27" rx="3" fill={capColor} stroke="rgba(100,116,139,0.9)" strokeWidth="1" />
          <rect x="58.5" y="6" width="8" height="19" rx="2" fill="none" stroke="rgba(100,116,139,0.45)" strokeWidth="0.8" />
        </g>
      ) : (
        <g>
          <rect x="10" y="23" width="40" height="12" rx="3" fill={capColor} stroke="rgba(100,116,139,0.9)" strokeWidth="1" />
          <rect x="16" y="18.5" width="28" height="5.5" rx="2" fill={capColor} stroke="rgba(100,116,139,0.7)" strokeWidth="0.8" />
          <path d="M49,30 q7,2 3,9" stroke="rgba(100,116,139,0.95)" strokeWidth="2.3" fill="none" />
        </g>
      )}
    </svg>
  );
}
