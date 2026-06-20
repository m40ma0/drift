import { useMemo } from 'react';
import { DriftHistoryEntry } from '@/lib/headings';

interface VoyageLogTabProps {
  history: DriftHistoryEntry[];
  activeHeadingName: string;
}

export function VoyageLogTab({ history, activeHeadingName }: VoyageLogTabProps) {
  const svgWidth = 800;
  const svgHeight = 200;
  const padding = 40;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  const pathData = useMemo(() => {
    if (history.length < 2) return '';
    const maxDrift = Math.max(...history.map(h => h.driftScore), 45);
    const points = history.map((entry, idx) => {
      const x = padding + (idx / (history.length - 1)) * graphWidth;
      const y = padding + graphHeight - (entry.driftScore / maxDrift) * graphHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }, [history, graphWidth, graphHeight]);

  const areaPath = useMemo(() => {
    if (!pathData) return '';
    return `${pathData} L ${padding + graphWidth},${padding + graphHeight} L ${padding},${padding + graphHeight} Z`;
  }, [pathData, graphWidth, graphHeight]);

  const trend = useMemo(() => {
    if (history.length < 3) return null;
    const recent = history.slice(-3);
    const avgRecent = recent.reduce((s, h) => s + h.driftScore, 0) / recent.length;
    const older = history.slice(-6, -3);
    if (older.length === 0) {
      if (avgRecent < 15) return { text: 'Your voice is staying consistent.', color: 'text-signal-cyan' };
      if (avgRecent < 30) return { text: 'Slight drift in recent drafts.', color: 'text-brass' };
      return { text: 'Your last few drafts are drifting from your voice.', color: 'text-alert-coral' };
    }
    const avgOlder = older.reduce((s, h) => s + h.driftScore, 0) / older.length;
    const diff = avgRecent - avgOlder;
    if (diff > 5) return { text: 'Your last 3 drafts are becoming more generic.', color: 'text-alert-coral' };
    if (diff < -5) return { text: 'Your voice is getting stronger — recent drafts are closer to your fingerprint.', color: 'text-signal-cyan' };
    return { text: 'Your voice is staying consistent.', color: 'text-signal-cyan' };
  }, [history]);

  const lastDrift = history.length > 0 ? history[history.length - 1].driftScore : 0;
  const lineColor = lastDrift > 22.5 ? '#E2604F' : '#4FD8C4';

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div>
        <h2 className="text-xl font-fraunces font-bold text-slate-text">Voyage Log</h2>
        <p className="text-sm text-slate-text/40 font-mono mt-1">
          {activeHeadingName ? `Drift history for "${activeHeadingName}"` : 'Track how your voice evolves over time'}
        </p>
      </div>

      {/* Chart */}
      <div className="card-panel">
        <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full">
          <defs>
            <linearGradient id="voyageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line key={i} x1={padding} y1={padding + graphHeight * frac}
              x2={padding + graphWidth} y2={padding + graphHeight * frac}
              stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
          ))}

          {/* Y-axis labels */}
          <text x={padding - 8} y={padding + 4} textAnchor="end" fill="currentColor" opacity="0.3" fontSize="10" fontFamily="IBM Plex Mono">High</text>
          <text x={padding - 8} y={padding + graphHeight + 4} textAnchor="end" fill="currentColor" opacity="0.3" fontSize="10" fontFamily="IBM Plex Mono">Low</text>
          <text x={padding - 8} y={padding + graphHeight / 2 + 4} textAnchor="end" fill="currentColor" opacity="0.2" fontSize="9" fontFamily="IBM Plex Mono">drift</text>

          {pathData && (
            <>
              <path d={areaPath} fill="url(#voyageGradient)" />
              <path d={pathData} stroke={lineColor} strokeWidth="2" fill="none" />
            </>
          )}

          {/* Data points */}
          {history.map((entry, idx) => {
            const maxDrift = Math.max(...history.map(h => h.driftScore), 45);
            const x = padding + (idx / Math.max(history.length - 1, 1)) * graphWidth;
            const y = padding + graphHeight - (entry.driftScore / maxDrift) * graphHeight;
            return (
              <circle key={idx} cx={x} cy={y} r="3" fill={lineColor} opacity="0.7" />
            );
          })}

          {history.length < 2 && (
            <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" dominantBaseline="middle"
              fill="currentColor" opacity="0.2" fontSize="14" fontFamily="IBM Plex Mono">
              Analyze drafts in the Editor to build history
            </text>
          )}
        </svg>
      </div>

      {/* Trend */}
      {trend && (
        <div className="card-panel flex items-center gap-3">
          <span className={`text-lg ${trend.color}`}>
            {trend.color.includes('cyan') ? '&#10003;' : trend.color.includes('coral') ? '!' : '~'}
          </span>
          <p className={`font-spectral ${trend.color}`}>{trend.text}</p>
        </div>
      )}

      {/* Recent entries */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-slate-text/40 uppercase tracking-wider">Recent Analyses</h3>
          <div className="space-y-2">
            {history.slice(-10).reverse().map((entry, i) => {
              const driftPercent = Math.round((entry.driftScore / 45) * 100);
              const color = driftPercent < 30 ? 'text-signal-cyan' : driftPercent < 60 ? 'text-brass' : 'text-alert-coral';
              return (
                <div key={i} className="card-panel flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-fraunces font-bold ${color}`}>{driftPercent}</span>
                    <div>
                      <p className="text-xs font-mono text-slate-text/50">
                        {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-mono text-slate-text/30">{entry.textLength} characters</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    driftPercent < 30 ? 'bg-signal-cyan' : driftPercent < 60 ? 'bg-brass' : 'bg-alert-coral'
                  }`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-text/30 py-4 border-t border-slate-text/5">
        <span>&#128274;</span>
        <span>All data stored locally in this browser. Nothing leaves your device.</span>
      </div>
    </div>
  );
}
