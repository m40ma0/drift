import React, { useMemo } from 'react';
import { DriftHistoryEntry } from '@/lib/headings';

interface VoyageLogProps {
  history: DriftHistoryEntry[];
}

export function VoyageLog({ history }: VoyageLogProps) {
  const svgWidth = 280;
  const svgHeight = 100;
  const padding = 20;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  // Generate SVG path for the drift history line
  const pathData = useMemo(() => {
    if (history.length < 2) return '';

    const maxDrift = Math.max(...history.map(h => h.driftScore), 45);
    const minDrift = 0;
    const driftRange = maxDrift - minDrift || 1;

    const points = history.map((entry, idx) => {
      const x = padding + (idx / (history.length - 1)) * graphWidth;
      const y = padding + graphHeight - ((entry.driftScore - minDrift) / driftRange) * graphHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [history]);

  // Gradient definition for the fill under the line
  const lastDrift = history.length > 0 ? history[history.length - 1].driftScore : 0;
  const isDrifting = lastDrift > 22.5; // More than half of 45 degrees

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
    >
      <defs>
        <linearGradient id="driftGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4FD8C4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4FD8C4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      <line x1={padding} y1={padding + graphHeight / 2} x2={svgWidth - padding} y2={padding + graphHeight / 2} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />

      {/* Path line */}
      {pathData && (
        <>
          <path d={pathData} stroke={isDrifting ? '#E2604F' : '#4FD8C4'} strokeWidth="2" fill="none" />
          {/* Area under curve */}
          <path
            d={`${pathData} L ${svgWidth - padding},${padding + graphHeight} L ${padding},${padding + graphHeight} Z`}
            fill="url(#driftGradient)"
          />
        </>
      )}

      {/* No data state */}
      {history.length < 2 && (
        <text
          x={svgWidth / 2}
          y={svgHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs"
          fill="currentColor"
          opacity="0.3"
        >
          Start drafting to see history
        </text>
      )}
    </svg>
  );
}
