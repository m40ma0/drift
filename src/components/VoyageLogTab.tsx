import { useMemo } from 'react';
import { DriftHistoryEntry } from '@/lib/headings';

interface VoyageLogTabProps {
  history: DriftHistoryEntry[];
  activeHeadingName: string;
}

export function VoyageLogTab({ history, activeHeadingName }: VoyageLogTabProps) {
  const svgWidth = 700;
  const svgHeight = 180;
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
      if (avgRecent < 15) return { text: 'Your voice is staying consistent.', type: 'good' as const };
      if (avgRecent < 30) return { text: 'Slight drift in recent drafts.', type: 'warn' as const };
      return { text: 'Your last few drafts are drifting from your voice.', type: 'bad' as const };
    }
    const avgOlder = older.reduce((s, h) => s + h.driftScore, 0) / older.length;
    const diff = avgRecent - avgOlder;
    if (diff > 5) return { text: 'Your recent drafts are becoming more generic.', type: 'bad' as const };
    if (diff < -5) return { text: 'Your voice is getting stronger — recent drafts are closer to your fingerprint.', type: 'good' as const };
    return { text: 'Your voice is staying consistent.', type: 'good' as const };
  }, [history]);

  const lastDrift = history.length > 0 ? history[history.length - 1].driftScore : 0;
  const lineColor = lastDrift > 22.5 ? 'rgb(var(--c-alert-coral))' : 'rgb(var(--c-signal-cyan))';

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 tab-content-enter">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-ink-text">Voyage Log</h2>
        <p className="text-sm text-slate-text mt-1">
          {activeHeadingName ? `How your voice has been trending for "${activeHeadingName}"` : 'Track how your voice evolves over time'}
        </p>
      </div>

      <div className="card-panel animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <defs>
            <linearGradient id="voyageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line key={i} x1={padding} y1={padding + graphHeight * frac}
              x2={padding + graphWidth} y2={padding + graphHeight * frac}
              stroke="rgb(var(--c-ink-text))" strokeWidth="0.5" opacity="0.06" />
          ))}
          <text x={padding - 8} y={padding + 4} textAnchor="end" fill="rgb(var(--c-slate-text))" opacity="0.4" fontSize="10" fontFamily="Poppins">High</text>
          <text x={padding - 8} y={padding + graphHeight + 4} textAnchor="end" fill="rgb(var(--c-slate-text))" opacity="0.4" fontSize="10" fontFamily="Poppins">Low</text>

          {pathData && (
            <>
              <path d={areaPath} fill="url(#voyageGrad)" />
              <path d={pathData} stroke={lineColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          {history.map((entry, idx) => {
            const maxDrift = Math.max(...history.map(h => h.driftScore), 45);
            const x = padding + (idx / Math.max(history.length - 1, 1)) * graphWidth;
            const y = padding + graphHeight - (entry.driftScore / maxDrift) * graphHeight;
            return <circle key={idx} cx={x} cy={y} r="3" fill={lineColor} opacity="0.8" />;
          })}
          {history.length < 2 && (
            <text x={svgWidth / 2} y={svgHeight / 2} textAnchor="middle" dominantBaseline="middle"
              fill="rgb(var(--c-slate-text))" opacity="0.3" fontSize="14" fontFamily="Poppins">
              Analyze drafts in the Editor to build history
            </text>
          )}
        </svg>
      </div>

      {trend && (
        <div className={`card-panel flex items-center gap-3 animate-fade-in ${
          trend.type === 'good' ? 'border-signal-cyan/30' : trend.type === 'bad' ? 'border-alert-coral/30' : 'border-brass/30'
        }`} style={{ animationDelay: '0.1s' }}>
          <span className={`text-lg ${trend.type === 'good' ? 'text-signal-cyan' : trend.type === 'bad' ? 'text-alert-coral' : 'text-brass'}`}>
            {trend.type === 'good' ? '&#10003;' : '!'}
          </span>
          <p className={trend.type === 'good' ? 'text-signal-cyan' : trend.type === 'bad' ? 'text-alert-coral' : 'text-brass'}>
            {trend.text}
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h3 className="text-sm font-semibold text-ink-text">Recent analyses</h3>
          <div className="space-y-2">
            {history.slice(-10).reverse().map((entry, i) => {
              const driftPercent = Math.round((entry.driftScore / 45) * 100);
              const color = driftPercent < 30 ? 'text-signal-cyan' : driftPercent < 60 ? 'text-brass' : 'text-alert-coral';
              const dot = driftPercent < 30 ? 'bg-signal-cyan' : driftPercent < 60 ? 'bg-brass' : 'bg-alert-coral';
              return (
                <div key={i} className="card-panel flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${color}`}>{driftPercent}</span>
                    <div>
                      <p className="text-xs text-slate-text">
                        {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-text/50">{entry.textLength} characters</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-text/40 py-4 border-t border-card-border">
        <span>&#128274;</span>
        <span>All data stored locally in this browser. Nothing leaves your device.</span>
      </div>
    </div>
  );
}
