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
    const dA = textA.trim() ? computeDriftScore100(textA, activeProfile) : 0;
    const dB = textB.trim() ? computeDriftScore100(textB, activeProfile) : 0;
    setScoreA(dA);
    setScoreB(dB);
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
        const dA = computeDriftScore100(demoCompareAI, activeProfile);
        const dB = computeDriftScore100(demoCompareCreator, activeProfile);
        setScoreA(dA);
        setScoreB(dB);
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <svg width="64" height="64" viewBox="0 0 64 64" className="text-slate-text/20">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="22" y1="22" x2="22" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="42" y1="22" x2="42" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-slate-text/50 font-spectral text-lg">Create a voice profile to compare drafts</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-fraunces font-bold text-slate-text">Compare Drafts</h2>
          <p className="text-sm text-slate-text/40 font-mono mt-1">
            Paste two versions. See which sounds more like you.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleLoadDemo} className="btn-ghost">Load Demo Compare</button>
          <button onClick={handleAnalyze} disabled={!textA.trim() && !textB.trim()} className="btn-primary disabled:opacity-50">
            Analyze Both
          </button>
        </div>
      </div>

      {/* Side-by-side text areas */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-text/40 uppercase tracking-wider">Draft A — Generic AI</label>
          <textarea
            value={textA}
            onChange={(e) => { setTextA(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a generic AI-generated draft..."
            className="w-full h-48 p-4 bg-ink-navy/50 text-slate-text font-spectral text-sm border border-slate-text/10 rounded focus:outline-none focus:border-brass resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-text/40 uppercase tracking-wider">Draft B — Creator Voice</label>
          <textarea
            value={textB}
            onChange={(e) => { setTextB(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a draft written in your voice..."
            className="w-full h-48 p-4 bg-ink-navy/50 text-slate-text font-spectral text-sm border border-slate-text/10 rounded focus:outline-none focus:border-brass resize-none"
          />
        </div>
      </div>

      {/* Results */}
      {analyzed && (
        <>
          {/* Compass gauges */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card-panel flex flex-col items-center">
              <span className="text-xs font-mono text-slate-text/40 uppercase tracking-wider mb-2">Draft A</span>
              <CompassGauge drift={(scoreA / 100) * 45} size={180} />
              <p className={`text-lg font-fraunces font-bold mt-2 ${scoreA < 30 ? 'text-signal-cyan' : scoreA < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreA} drift
              </p>
            </div>
            <div className="card-panel flex flex-col items-center">
              <span className="text-xs font-mono text-slate-text/40 uppercase tracking-wider mb-2">Draft B</span>
              <CompassGauge drift={(scoreB / 100) * 45} size={180} />
              <p className={`text-lg font-fraunces font-bold mt-2 ${scoreB < 30 ? 'text-signal-cyan' : scoreB < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreB} drift
              </p>
            </div>
          </div>

          {/* Verdict */}
          <div className="card-panel text-center py-6">
            {closerDraft === 'tie' ? (
              <p className="text-lg font-fraunces text-brass">Both drafts drift equally from your voice.</p>
            ) : (
              <p className="text-lg font-fraunces text-slate-text">
                <span className="text-signal-cyan font-bold">Draft {closerDraft}</span> is{' '}
                <span className="text-brass font-bold">{difference} points</span> closer to your voice.
              </p>
            )}
          </div>

          {/* Sentence breakdown */}
          <div className="grid grid-cols-2 gap-6">
            <SentenceBreakdown label="Draft A" sentences={sentencesA} />
            <SentenceBreakdown label="Draft B" sentences={sentencesB} />
          </div>
        </>
      )}
    </div>
  );
}

function SentenceBreakdown({ label, sentences }: { label: string; sentences: SentenceScore[] }) {
  if (sentences.length === 0) return null;
  const heavy = sentences.filter(s => s.status === 'heavy-drift').length;
  const slight = sentences.filter(s => s.status === 'slight-drift').length;
  const aligned = sentences.filter(s => s.status === 'aligned').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-text/40 uppercase">{label} Breakdown</span>
        <div className="flex gap-3 text-xs font-mono">
          {aligned > 0 && <span className="text-signal-cyan">{aligned} aligned</span>}
          {slight > 0 && <span className="text-brass">{slight} slight</span>}
          {heavy > 0 && <span className="text-alert-coral">{heavy} heavy</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {sentences.map((s, i) => (
          <div key={i} className={`px-3 py-2 rounded text-xs font-spectral ${
            s.status === 'aligned' ? 'drift-aligned' :
            s.status === 'slight-drift' ? 'drift-slight' : 'drift-heavy'
          }`}>
            <p className="text-slate-text/80">{s.text}</p>
            {s.reasons.length > 0 && (
              <p className="text-slate-text/40 font-mono mt-1 text-[0.65rem]">
                {s.reasons.map(r => r.label).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
