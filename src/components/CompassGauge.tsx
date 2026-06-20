import { useMemo, useState, useEffect } from 'react';

interface CompassGaugeProps {
  drift: number;
  size?: number;
}

export function CompassGauge({ drift, size = 220 }: CompassGaugeProps) {
  const [animatedDrift, setAnimatedDrift] = useState(drift);
  const radius = size * 0.36;
  const centerX = size / 2;
  const centerY = size / 2;

  useEffect(() => {
    const target = drift;
    if (Math.abs(target - animatedDrift) < 0.5) {
      setAnimatedDrift(target);
      return;
    }
    const interval = setInterval(() => {
      setAnimatedDrift((prev) => {
        const delta = (target - prev) * 0.15;
        if (Math.abs(delta) < 0.3) return target;
        return prev + delta;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [drift, animatedDrift]);

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = -45; i <= 45; i += 5) {
      const angle = i * (Math.PI / 180);
      const isMajor = i % 15 === 0;
      const innerR = radius - (isMajor ? 10 : 6);
      arr.push({
        x1: centerX + innerR * Math.cos(angle - Math.PI / 2),
        y1: centerY + innerR * Math.sin(angle - Math.PI / 2),
        x2: centerX + radius * Math.cos(angle - Math.PI / 2),
        y2: centerY + radius * Math.sin(angle - Math.PI / 2),
        angle: i,
        isMajor,
      });
    }
    return arr;
  }, [size, radius, centerX, centerY]);

  const needleAngle = animatedDrift * (Math.PI / 180);
  const needleLength = radius * 0.7;
  const needleX = centerX + needleLength * Math.sin(needleAngle);
  const needleY = centerY - needleLength * Math.cos(needleAngle);

  const trailPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i < 15; i++) {
      const offset = (i / 15) * 12;
      const angle = (animatedDrift - offset) * (Math.PI / 180);
      const trailR = radius - 15;
      points.push({
        x: centerX + trailR * Math.sin(angle),
        y: centerY - trailR * Math.cos(angle),
        opacity: (1 - i / 15) * 0.5,
      });
    }
    return points;
  }, [animatedDrift, radius, centerX, centerY]);

  const driftPercent = Math.round((Math.abs(animatedDrift) / 45) * 100);
  const color = driftPercent < 30 ? 'rgb(var(--c-signal-cyan))' : driftPercent < 60 ? 'rgb(var(--c-brass))' : 'rgb(var(--c-alert-coral))';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgb(var(--c-ink-text))" strokeWidth="0.5" opacity="0.1" />

        {ticks.map((tick, i) => (
          <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
            stroke="rgb(var(--c-ink-text))" strokeWidth={tick.isMajor ? 1.5 : 0.8}
            opacity={tick.isMajor ? 0.3 : 0.12} />
        ))}

        {trailPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="rgb(var(--c-signal-cyan))" opacity={p.opacity} />
        ))}

        <line x1={centerX} y1={centerY} x2={needleX} y2={needleY}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={needleX} cy={needleY} r="3.5" fill={color} />
        <circle cx={centerX} cy={centerY} r="4" fill={color} />

        <text x={centerX} y={centerY + radius * 0.55} textAnchor="middle"
          className="font-mono" fill={color} fontSize={size * 0.07} fontWeight="600">
          {driftPercent}%
        </text>
        <text x={centerX} y={centerY + radius * 0.55 + size * 0.06} textAnchor="middle"
          fill="rgb(var(--c-slate-text))" opacity="0.5" fontSize={size * 0.04} fontFamily="Poppins">
          drift
        </text>
      </svg>
    </div>
  );
}
