import { useState, useRef, useEffect, useCallback } from 'react';
import { StylemetricProfile, SentenceScore, computeDriftScore100, scoreAgainstProfile } from '@/lib/stylometry';
import { generateMockRewrites, RewriteSuggestion } from '@/lib/rewrite';
import { recordDriftHistory } from '@/lib/headings';

interface EditorTabProps {
  activeProfile: StylemetricProfile | null;
  activeHeadingId: string;
  onDriftChange: (drift: number) => void;
}

export function EditorTab({ activeProfile, activeHeadingId, onDriftChange }: EditorTabProps) {
  const [text, setText] = useState('');
  const [sentenceScores, setSentenceScores] = useState<SentenceScore[]>([]);
  const [driftScore, setDriftScore] = useState(0);
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState<number | null>(null);
  const [rewrites, setRewrites] = useState<RewriteSuggestion[]>([]);
  const [voiceLock, setVoiceLock] = useState(false);
  const [voiceLockWarning, setVoiceLockWarning] = useState('');
  const [receipt, setReceipt] = useState<{ changes: string[]; before: number; after: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analyze = useCallback((input: string) => {
    if (!activeProfile || !input.trim()) {
      setSentenceScores([]);
      setDriftScore(0);
      onDriftChange(0);
      return;
    }
    const scores = scoreAgainstProfile(input, activeProfile);
    const drift100 = computeDriftScore100(input, activeProfile);
    setSentenceScores(scores);
    setDriftScore(drift100);
    onDriftChange((drift100 / 100) * 45);
  }, [activeProfile, onDriftChange]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setSelectedSentenceIdx(null);
    setRewrites([]);
    setReceipt(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const lastChar = newText[newText.length - 1];
    const immediate = lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === '\n';

    if (immediate) {
      analyze(newText);
    } else {
      debounceRef.current = setTimeout(() => analyze(newText), 400);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const newText = text + pasted;
    setText(newText);
    analyze(newText);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSentenceClick = (idx: number) => {
    if (!activeProfile) return;
    const score = sentenceScores[idx];
    if (score.status === 'aligned') return;
    setSelectedSentenceIdx(idx);
    const suggestions = generateMockRewrites(score.text, activeProfile);
    setRewrites(suggestions);
  };

  const handleApplyRewrite = (suggestion: RewriteSuggestion) => {
    const beforeScore = driftScore;
    let newText = text;
    newText = newText.replace(suggestion.original, suggestion.rewritten);
    setText(newText);

    if (voiceLock && activeProfile) {
      const newDrift = computeDriftScore100(suggestion.rewritten, activeProfile);
      if (newDrift > 70) {
        setVoiceLockWarning('Warning: This rewrite may drift too far from your voice.');
        setTimeout(() => setVoiceLockWarning(''), 4000);
      }
    }

    analyze(newText);

    if (activeProfile) {
      const afterScore = computeDriftScore100(newText, activeProfile);
      setReceipt({
        changes: suggestion.changes,
        before: beforeScore,
        after: afterScore,
      });

      recordDriftHistory(activeHeadingId, (afterScore / 100) * 45, newText.length).catch(() => {});
    }

    setSelectedSentenceIdx(null);
    setRewrites([]);
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const highDriftCount = sentenceScores.filter(s => s.status === 'heavy-drift').length;
  const slightDriftCount = sentenceScores.filter(s => s.status === 'slight-drift').length;

  const statusColor = driftScore < 30 ? 'text-signal-cyan' : driftScore < 60 ? 'text-brass' : 'text-alert-coral';
  const statusBg = driftScore < 30 ? 'bg-signal-cyan/10' : driftScore < 60 ? 'bg-brass/10' : 'bg-alert-coral/10';

  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <svg width="64" height="64" viewBox="0 0 64 64" className="text-slate-text/20">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="32" y1="32" x2="32" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
        <p className="text-slate-text/50 font-spectral text-lg">Create a voice profile first</p>
        <p className="text-slate-text/30 font-mono text-xs">Go to the Voice Profile tab to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-text/10">
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${statusBg}`}>
            <span className={`text-2xl font-fraunces font-bold ${statusColor}`}>{driftScore}</span>
            <span className="text-xs font-mono text-slate-text/60 uppercase">Drift<br/>Score</span>
          </div>
          {sentenceScores.length > 0 && (
            <div className="flex gap-4 text-xs font-mono text-slate-text/50">
              {highDriftCount > 0 && (
                <span className="text-alert-coral">{highDriftCount} heavy drift</span>
              )}
              {slightDriftCount > 0 && (
                <span className="text-brass">{slightDriftCount} slight drift</span>
              )}
              <span className="text-signal-cyan">
                {sentenceScores.filter(s => s.status === 'aligned').length} aligned
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-mono text-slate-text/60 uppercase">Voice Lock</span>
            <button
              onClick={() => setVoiceLock(!voiceLock)}
              className={`w-10 h-5 rounded-full transition-colors relative ${voiceLock ? 'bg-signal-cyan' : 'bg-slate-text/20'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${voiceLock ? 'left-5' : 'left-0.5'}`} />
            </button>
          </label>
        </div>
      </div>

      {voiceLockWarning && (
        <div className="mx-6 mt-2 px-4 py-2 bg-alert-coral/10 border border-alert-coral/30 rounded text-alert-coral text-xs font-mono">
          {voiceLockWarning}
        </div>
      )}

      {/* Two-panel editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input */}
        <div className="w-1/2 flex flex-col border-r border-slate-text/10">
          <div className="px-6 py-3 border-b border-slate-text/5">
            <span className="text-xs font-mono text-slate-text/40 uppercase tracking-wider">Your Draft</span>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onPaste={handlePaste}
            placeholder="Paste an AI draft here, or start writing..."
            className="flex-1 w-full bg-transparent text-slate-text placeholder-slate-text/30 font-spectral text-base leading-relaxed resize-none focus:outline-none p-6"
          />
        </div>

        {/* Analysis */}
        <div className="w-1/2 flex flex-col overflow-y-auto">
          <div className="px-6 py-3 border-b border-slate-text/5">
            <span className="text-xs font-mono text-slate-text/40 uppercase tracking-wider">Drift Analysis</span>
          </div>
          <div className="flex-1 p-6 space-y-2">
            {sentenceScores.length === 0 ? (
              <p className="text-slate-text/30 italic font-spectral">Paste or write to see drift analysis</p>
            ) : (
              sentenceScores.map((score, idx) => (
                <div key={idx}
                  onClick={() => handleSentenceClick(idx)}
                  className={`px-4 py-3 rounded cursor-pointer transition-colors ${
                    score.status === 'aligned' ? 'drift-aligned' :
                    score.status === 'slight-drift' ? 'drift-slight' : 'drift-heavy'
                  } ${selectedSentenceIdx === idx ? 'ring-1 ring-brass' : ''}`}
                >
                  <p className="text-slate-text font-spectral text-sm leading-relaxed">{score.text}</p>
                  {score.reasons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {score.reasons.map((reason, rIdx) => (
                        <p key={rIdx} className="text-xs font-mono text-slate-text/50 flex items-center gap-2">
                          <span className={
                            reason.type === 'cliche' ? 'text-alert-coral' :
                            reason.type === 'rhythm' ? 'text-brass' :
                            reason.type === 'punctuation' ? 'text-signal-cyan' : 'text-brass'
                          }>
                            {reason.type === 'cliche' ? '!' :
                             reason.type === 'rhythm' ? '~' :
                             reason.type === 'punctuation' ? '.' : '#'}
                          </span>
                          {reason.label}
                        </p>
                      ))}
                    </div>
                  )}
                  {score.status !== 'aligned' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSentenceClick(idx); }}
                      className="mt-2 text-xs font-mono text-brass hover:text-brass/80 transition-colors"
                    >
                      Restore my voice
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rewrite panel */}
      {selectedSentenceIdx !== null && rewrites.length > 0 && (
        <div className="border-t border-slate-text/10 px-6 py-4 bg-ink-navy/80 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-brass uppercase tracking-wider">Rewrite Suggestions</span>
            <button onClick={() => { setSelectedSentenceIdx(null); setRewrites([]); }}
              className="text-xs text-slate-text/40 hover:text-slate-text font-mono">Close</button>
          </div>
          <div className="space-y-3">
            {rewrites.map((rw, i) => (
              <div key={i} className="card-panel">
                <p className="text-sm text-slate-text font-spectral mb-2">"{rw.rewritten}"</p>
                <p className="text-xs text-signal-cyan font-mono mb-2">{rw.explanation}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rw.changes.map((c, ci) => (
                    <span key={ci} className="text-xs px-2 py-0.5 bg-slate-text/5 rounded text-slate-text/50 font-mono">{c}</span>
                  ))}
                </div>
                <button onClick={() => handleApplyRewrite(rw)} className="btn-primary text-xs py-1.5">
                  Apply this rewrite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Receipt */}
      {receipt && (
        <div className="border-t border-signal-cyan/20 px-6 py-4 bg-signal-cyan/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-signal-cyan uppercase tracking-wider">Voice Receipt</span>
            <button onClick={() => setReceipt(null)}
              className="text-xs text-slate-text/40 hover:text-slate-text font-mono">Dismiss</button>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-lg font-fraunces text-alert-coral">{receipt.before}</span>
            <span className="text-slate-text/30 font-mono text-xs">→</span>
            <span className="text-lg font-fraunces text-signal-cyan">{receipt.after}</span>
            <span className="text-xs font-mono text-signal-cyan">
              ({receipt.before - receipt.after > 0 ? '-' : '+'}{Math.abs(receipt.before - receipt.after)} drift)
            </span>
          </div>
          <div className="space-y-1">
            {receipt.changes.map((c, i) => (
              <p key={i} className="text-xs font-mono text-slate-text/60 flex items-center gap-2">
                <span className="text-signal-cyan">+</span> {c}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div className="px-6 py-3 border-t border-slate-text/10 text-xs text-slate-text/40 font-mono flex items-center gap-4">
        <span>{text.length} chars</span>
        <span>{wordCount} words</span>
        <span>{sentenceScores.length} sentences</span>
      </div>
    </div>
  );
}
