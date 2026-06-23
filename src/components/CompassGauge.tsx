import { useMemo, useState, useEffect } from 'react';

interface CompassGaugeProps {
  drift: number;
  size?: number;
}

export function CompassGauge({ drift, size = 200 }: CompassGaugeProps) {
  const [animated, setAnimated] = useState(drift);
  const r = size * 0.35;
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    if (Math.abs(drift - animated) < 0.5) { setAnimated(drift); return; }
    const id = setInterval(() => {
      setAnimated(p => { const d = (drift - p) * 0.12; return Math.abs(d) < 0.3 ? drift : p + d; });
    }, 16);
    return () => clearInterval(id);
  }, [drift, animated]);

  const ticks = useMemo(() => {
    const a = [];
    for (let i = -45; i <= 45; i += 5) {
      const ang = i * (Math.PI / 180);
      const major = i % 15 === 0;
      const ir = r - (major ? 8 : 4);
      a.push({
        x1: cx + ir * Math.cos(ang - Math.PI / 2), y1: cy + ir * Math.sin(ang - Math.PI / 2),
        x2: cx + r * Math.cos(ang - Math.PI / 2), y2: cy + r * Math.sin(ang - Math.PI / 2),
        major,
      });
    }
    return a;
  }, [size, r, cx, cy]);

  const ang = animated * (Math.PI / 180);
  const nl = r * 0.65;
  const nx = cx + nl * Math.sin(ang);
  const ny = cy - nl * Math.cos(ang);

  const pct = Math.round((Math.abs(animated) / 45) * 100);
  const col = pct < 30 ? 'rgb(var(--c-signal-cyan))' : pct < 60 ? 'rgb(var(--c-brass))' : 'rgb(var(--c-alert-coral))';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--c-ink-text))" strokeWidth="0.5" opacity="0.08" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgb(var(--c-ink-text))" strokeWidth={t.major ? 1 : 0.5} opacity={t.major ? 0.2 : 0.08} />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth="2" strokeLinecap="round" />
      <circle cx={nx} cy={ny} r="2.5" fill={col} />
      <circle cx={cx} cy={cy} r="3" fill={col} />
      {size > 60 && (
        <text x={cx} y={cy + r * 0.55} textAnchor="middle" fill={col} fontSize={size * 0.065} fontWeight="500" fontFamily="Poppins">
          {pct}
        </text>
      )}
    </svg>
  );
}
