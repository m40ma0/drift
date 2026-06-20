import React, { useMemo, useState, useEffect } from 'react';

interface CompassGaugeProps {
  drift: number; // degrees, -45 to +45
}

export function CompassGauge({ drift }: CompassGaugeProps) {
  const [animatedDrift, setAnimatedDrift] = useState(drift);
  const size = 280;
  const radius = 100;
  const centerX = size / 2;
  const centerY = size / 2;

  // Smooth animation: spring-like transition
  useEffect(() => {
    const target = drift;
    const current = animatedDrift;
    const diff = target - current;

    if (Math.abs(diff) < 0.5) {
      setAnimatedDrift(target);
      return;
    }

    const frame = () => {
      setAnimatedDrift((prev) => {
        const delta = (target - prev) * 0.15; // cubic-bezier-like easing
        return prev + delta;
      });
    };

    const interval = setInterval(frame, 16);
    return () => clearInterval(interval);
  }, [drift, animatedDrift]);

  // Generate tick marks for compass face
  const ticks = useMemo(() => {
    const tickArray = [];
    for (let i = -45; i <= 45; i += 5) {
      const angle = i * (Math.PI / 180);
      const x1 = centerX + (radius - 8) * Math.cos(angle - Math.PI / 2);
      const y1 = centerY + (radius - 8) * Math.sin(angle - Math.PI / 2);
      const x2 = centerX + radius * Math.cos(angle - Math.PI / 2);
      const y2 = centerY + radius * Math.sin(angle - Math.PI / 2);
      tickArray.push({ x1, y1, x2, y2, angle: i });
    }
    return tickArray;
  }, []);

  // Needle angle (0° = center/true north, ±45° = max drift)
  const needleAngle = animatedDrift * (Math.PI / 180);
  const needleLength = 70;
  const needleX = centerX + needleLength * Math.sin(needleAngle);
  const needleY = centerY - needleLength * Math.cos(needleAngle);

  // Trail (recent history of needle position) - fade arc
  const trailPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      const offset = (i / 20) * 15; // degrees offset
      const angle = (animatedDrift - offset) * (Math.PI / 180);
      const trailRadius = radius - 15;
      const x = centerX + trailRadius * Math.sin(angle);
      const y = centerY - trailRadius * Math.cos(angle);
      const opacity = (1 - i / 20) * 0.6;
      points.push({ x, y, opacity });
    }
    return points;
  }, [animatedDrift]);

  // Cardinal labels
  const labels = [
    { angle: -45, label: 'High Drift' },
    { angle: 0, label: 'True North' },
    { angle: 45, label: 'High Drift' },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="filter drop-shadow-lg"
    >
      {/* Background circle */}
      <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <g key={`tick-${i}`}>
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="currentColor"
            strokeWidth="1"
            opacity={tick.angle % 15 === 0 ? 0.6 : 0.3}
          />
          {tick.angle % 15 === 0 && tick.angle !== 0 && (
            <text
              x={centerX + (radius + 18) * Math.cos((tick.angle - 90) * (Math.PI / 180))}
              y={centerY + (radius + 18) * Math.sin((tick.angle - 90) * (Math.PI / 180))}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-mono"
              fill="currentColor"
              opacity="0.5"
            >
              {Math.abs(tick.angle)}°
            </text>
          )}
        </g>
      ))}

      {/* Trail arc (seismograph afterimage) */}
      {trailPoints.map((point, i) => (
        <circle
          key={`trail-${i}`}
          cx={point.x}
          cy={point.y}
          r="1.5"
          fill="#4FD8C4"
          opacity={point.opacity}
        />
      ))}

      {/* Needle (compass pointer) */}
      <g>
        {/* Needle line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#C98A3E"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Needle tip */}
        <circle cx={needleX} cy={needleY} r="4" fill="#C98A3E" />

        {/* Center pivot */}
        <circle cx={centerX} cy={centerY} r="5" fill="#C98A3E" />
      </g>

      {/* Center label */}
      <text
        x={centerX}
        y={centerY + 45}
        textAnchor="middle"
        className="text-xs font-mono font-semibold"
        fill="currentColor"
      >
        {animatedDrift.toFixed(1)}°
      </text>
    </svg>
  );
}
