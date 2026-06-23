import { useMemo } from 'react';
import { DriftHistoryEntry } from '@/lib/headings';

interface VoyageLogTabProps {
  history: DriftHistoryEntry[];
  activeHeadingName: string;
  onClearHistory?: () => void;
}

export function VoyageLogTab({ history, activeHeadingName, onClearHistory }: VoyageLogTabProps) {
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

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const scores = history.map(h => Math.round((h.driftScore / 45) * 100));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const latest = scores[scores.length - 1];
    const recentSlice = scores.slice(-5);
    const olderSlice = scores.slice(-10, -5);
    let trendPct = 0;
    if (olderSlice.length > 0) {
      const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
      const olderAvg = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
      trendPct = Math.round(recentAvg - olderAvg);
    }
    const highDriftCount = scores.filter(s => s > 60).length;
    return { avg, latest, trendPct, total: history.length, highDriftCount, recentSlice };
  }, [history]);

  const narrative = useMemo(() => {
    if (!stats || history.length < 2) return null;
    const lines: { text: string; type: 'good' | 'warn' | 'bad' }[] = [];

    if (stats.trendPct > 10) {
      lines.push({
        text: `Your last ${Math.min(5, stats.recentSlice.length)} drafts became ${Math.abs(stats.trendPct)}% more generic after AI assistance.`,
        type: 'bad',
      });
    } else if (stats.trendPct < -10) {
      lines.push({
        text: `Your voice is getting stronger — recent drafts are ${Math.abs(stats.trendPct)}% closer to your fingerprint.`,
        type: 'good',
      });
    } else if (stats.avg < 30) {
      lines.push({ text: 'Your voice is staying consistent across drafts.', type: 'good' });
    } else {
      lines.push({ text: 'Your drift levels are moderate — there\'s room to push closer to your voice.', type: 'warn' });
    }

    if (stats.highDriftCount > 0 && stats.total > 2) {
      const pct = Math.round((stats.highDriftCount / stats.total) * 100);
      lines.push({
        text: `${pct}% of your analyzed drafts had heavy drift — those are the ones where AI flattened your voice the most.`,
        type: stats.highDriftCount > stats.total / 2 ? 'bad' : 'warn',
      });
    }

    if (stats.total >= 5 && stats.avg > 50) {
      lines.push({
        text: 'This is the pattern Drift was built to catch: the slow, invisible flattening of a creator\'s voice over time.',
        type: 'bad',
      });
    }

    return lines;
  }, [stats, history.length]);

  const lastDrift = history.length > 0 ? history[history.length - 1].driftScore : 0;
  const lineColor = lastDrift > 22.5 ? 'rgb(var(--c-alert-coral))' : 'rgb(var(--c-signal-cyan))';

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 tab-content-enter">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold text-ink-text">Voyage Log</h2>
        <p className="text-sm text-slate-text mt-1">
          {activeHeadingName
            ? `Tracking voice drift for "${activeHeadingName}" over time`
            : 'See whether your voice is holding steady or slowly flattening'}
        </p>
      </div>

      {/* Headline stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <div className="card-panel text-center">
            <p className={`text-2xl font-bold ${stats.avg < 30 ? 'text-signal-cyan' : stats.avg < 60 ? 'text-brass' : 'text-alert-coral'}`}>
              {stats.avg}
            </p>
            <p className="text-xs text-slate-text">Avg drift</p>
          </div>
          <div className="card-panel text-center">
            <p className={`text-2xl font-bold ${stats.latest < 30 ? 'text-signal-cyan' : stats.latest < 60 ? 'text-brass' : 'text-alert-coral'}`}>
              {stats.latest}
            </p>
            <p className="text-xs text-slate-text">Latest</p>
          </div>
          <div className="card-panel text-center">
            <p className="text-2xl font-bold text-ink-text">{stats.total}</p>
            <p className="text-xs text-slate-text">Drafts analyzed</p>
          </div>
          <div className="card-panel text-center">
            <p className={`text-2xl font-bold ${stats.trendPct > 5 ? 'text-alert-coral' : stats.trendPct < -5 ? 'text-signal-cyan' : 'text-brass'}`}>
              {stats.trendPct > 0 ? '+' : ''}{stats.trendPct}%
            </p>
            <p className="text-xs text-slate-text">Trend</p>
          </div>
        </div>
      )}

      {/* Narrative insights */}
      {narrative && narrative.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {narrative.map((line, i) => (
            <div key={i} className={`card-panel flex items-start gap-3 ${
              line.type === 'good' ? 'border-signal-cyan/30' : line.type === 'bad' ? 'border-alert-coral/30' : 'border-brass/30'
            }`}>
              <span className={`text-lg mt-0.5 ${
                line.type === 'good' ? 'text-signal-cyan' : line.type === 'bad' ? 'text-alert-coral' : 'text-brass'
              }`}>
                {line.type === 'good' ? '✓' : line.type === 'bad' ? '!' : '∼'}
              </span>
              <p className={`text-sm leading-relaxed ${
                line.type === 'good' ? 'text-signal-cyan' : line.type === 'bad' ? 'text-alert-coral' : 'text-brass'
              }`}>
                {line.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="card-panel animate-fade-in">
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

      {/* Recent entries */}
      {history.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-text">Recent analyses</h3>
            {onClearHistory && history.length > 0 && (
              <button onClick={onClearHistory} className="text-xs text-slate-text/50 hover:text-alert-coral transition-colors">
                Clear history
              </button>
            )}
          </div>
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

      {/* Empty state */}
      {history.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-lg bg-warm-bg flex items-center justify-center mb-4">
            <span className="text-2xl">{'\u{1F4C8}'}</span>
          </div>
          <p className="text-ink-text font-medium mb-1">No drift history yet</p>
          <p className="text-sm text-slate-text">Analyze drafts in the Editor and your drift scores will appear here over time.</p>
        </div>
      )}

      {/* Social value callout */}
      {history.length >= 3 && (
        <div className="card-panel text-center py-6 animate-fade-in">
          <p className="text-sm text-slate-text italic leading-relaxed max-w-lg mx-auto">
            "As creators use AI more, their personal style can slowly flatten without them noticing.
            The Voyage Log makes that invisible drift visible — so you can catch it before your voice disappears."
          </p>
        </div>
      )}

      {/* Privacy */}
      <div className="flex items-center gap-2 text-xs text-slate-text/40 py-4 border-t border-card-border">
        <span>{'\u{1F512}'}</span>
        <span>All data stored locally in this browser. Nothing leaves your device.</span>
      </div>
    </div>
  );
}
