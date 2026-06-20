import { useState, useCallback } from 'react';
import { StylemetricProfile, computeDriftScore100, scoreAgainstProfile, SentenceScore } from '@/lib/stylometry';
import { CompassGauge } from './CompassGauge';
import { demoCompareAI, demoCompareCreator } from '@/lib/demoData';

interface CompareTabProps {
  activeProfile: StylemetricProfile | null;
}

export function CompareTab({ activeProfile }: CompareTabProps) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [sentencesA, setSentencesA] = useState<SentenceScore[]>([]);
  const [sentencesB, setSentencesB] = useState<SentenceScore[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = useCallback(() => {
    if (!activeProfile || (!textA.trim() && !textB.trim())) return;
    setScoreA(textA.trim() ? computeDriftScore100(textA, activeProfile) : 0);
    setScoreB(textB.trim() ? computeDriftScore100(textB, activeProfile) : 0);
    setSentencesA(textA.trim() ? scoreAgainstProfile(textA, activeProfile) : []);
    setSentencesB(textB.trim() ? scoreAgainstProfile(textB, activeProfile) : []);
    setAnalyzed(true);
  }, [textA, textB, activeProfile]);

  const handleLoadDemo = () => {
    setTextA(demoCompareAI);
    setTextB(demoCompareCreator);
    setAnalyzed(false);
    if (activeProfile) {
      setTimeout(() => {
        setScoreA(computeDriftScore100(demoCompareAI, activeProfile));
        setScoreB(computeDriftScore100(demoCompareCreator, activeProfile));
        setSentencesA(scoreAgainstProfile(demoCompareAI, activeProfile));
        setSentencesB(scoreAgainstProfile(demoCompareCreator, activeProfile));
        setAnalyzed(true);
      }, 100);
    }
  };

  const difference = Math.abs(scoreA - scoreB);
  const closerDraft = scoreA < scoreB ? 'A' : scoreA > scoreB ? 'B' : 'tie';

  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-warm-bg flex items-center justify-center">
          <span className="text-2xl">&#9878;</span>
        </div>
        <p className="text-ink-text text-lg font-medium">Create a voice profile to compare drafts</p>
        <p className="text-slate-text text-sm">Head to Voice Profile first</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6 tab-content-enter">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-ink-text">Compare drafts</h2>
          <p className="text-sm text-slate-text mt-1">Paste two versions of the same idea. See which sounds more like you.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleLoadDemo} className="btn-ghost">Load demo</button>
          <button onClick={handleAnalyze} disabled={!textA.trim() && !textB.trim()} className="btn-primary disabled:opacity-50">Analyze both</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-text/60">Draft A — Generic AI</label>
          <textarea value={textA} onChange={(e) => { setTextA(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a generic AI-generated draft..."
            className="w-full h-48 p-4 bg-chart-paper text-ink-text text-sm border border-card-border rounded-xl focus:outline-none focus:border-brass resize-none" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-text/60">Draft B — Your voice</label>
          <textarea value={textB} onChange={(e) => { setTextB(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a draft in your own voice..."
            className="w-full h-48 p-4 bg-chart-paper text-ink-text text-sm border border-card-border rounded-xl focus:outline-none focus:border-brass resize-none" />
        </div>
      </div>

      {analyzed && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="card-panel flex flex-col items-center py-6">
              <span className="text-xs font-medium text-slate-text/60 mb-2">Draft A</span>
              <CompassGauge drift={(scoreA / 100) * 45} size={160} />
              <p className={`text-lg font-bold mt-2 ${scoreA < 30 ? 'text-signal-cyan' : scoreA < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreA} drift
              </p>
            </div>
            <div className="card-panel flex flex-col items-center py-6">
              <span className="text-xs font-medium text-slate-text/60 mb-2">Draft B</span>
              <CompassGauge drift={(scoreB / 100) * 45} size={160} />
              <p className={`text-lg font-bold mt-2 ${scoreB < 30 ? 'text-signal-cyan' : scoreB < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreB} drift
              </p>
            </div>
          </div>

          <div className="card-panel text-center py-6">
            {closerDraft === 'tie' ? (
              <p className="text-lg text-slate-text">Both drafts drift equally from your voice.</p>
            ) : (
              <p className="text-lg text-ink-text">
                <span className="text-signal-cyan font-bold">Draft {closerDraft}</span> is{' '}
                <span className="text-brass font-bold">{difference} points</span> closer to your voice.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <SentenceBreakdown label="Draft A" sentences={sentencesA} />
            <SentenceBreakdown label="Draft B" sentences={sentencesB} />
          </div>
        </div>
      )}
    </div>
  );
}

function SentenceBreakdown({ label, sentences }: { label: string; sentences: SentenceScore[] }) {
  if (sentences.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-text/60">{label}</span>
        <div className="flex gap-3 text-xs">
          {sentences.filter(s => s.status === 'aligned').length > 0 && (
            <span className="text-signal-cyan">{sentences.filter(s => s.status === 'aligned').length} aligned</span>
          )}
          {sentences.filter(s => s.status === 'slight-drift').length > 0 && (
            <span className="text-brass">{sentences.filter(s => s.status === 'slight-drift').length} slight</span>
          )}
          {sentences.filter(s => s.status === 'heavy-drift').length > 0 && (
            <span className="text-alert-coral">{sentences.filter(s => s.status === 'heavy-drift').length} heavy</span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {sentences.map((s, i) => (
          <div key={i} className={`px-3 py-2 rounded-xl text-xs ${
            s.status === 'aligned' ? 'drift-aligned' : s.status === 'slight-drift' ? 'drift-slight' : 'drift-heavy'
          }`}>
            <p className="text-ink-text/80">{s.text}</p>
            {s.reasons.length > 0 && (
              <p className="text-slate-text/50 mt-1 text-[0.65rem]">{s.reasons.map(r => r.label).join(' · ')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
