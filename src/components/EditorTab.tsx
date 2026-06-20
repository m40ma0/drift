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
    if (immediate) { analyze(newText); } else { debounceRef.current = setTimeout(() => analyze(newText), 400); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const newText = text + pasted;
    setText(newText);
    analyze(newText);
  };

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const handleSentenceClick = (idx: number) => {
    if (!activeProfile) return;
    const score = sentenceScores[idx];
    if (score.status === 'aligned') return;
    setSelectedSentenceIdx(idx);
    setRewrites(generateMockRewrites(score.text, activeProfile));
  };

  const handleApplyRewrite = (suggestion: RewriteSuggestion) => {
    const beforeScore = driftScore;
    let newText = text.replace(suggestion.original, suggestion.rewritten);
    setText(newText);
    if (voiceLock && activeProfile) {
      const newDrift = computeDriftScore100(suggestion.rewritten, activeProfile);
      if (newDrift > 70) { setVoiceLockWarning('This rewrite may drift too far from your voice.'); setTimeout(() => setVoiceLockWarning(''), 4000); }
    }
    analyze(newText);
    if (activeProfile) {
      const afterScore = computeDriftScore100(newText, activeProfile);
      setReceipt({ changes: suggestion.changes, before: beforeScore, after: afterScore });
      recordDriftHistory(activeHeadingId, (afterScore / 100) * 45, newText.length).catch(() => {});
    }
    setSelectedSentenceIdx(null);
    setRewrites([]);
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const highDriftCount = sentenceScores.filter(s => s.status === 'heavy-drift').length;
  const slightDriftCount = sentenceScores.filter(s => s.status === 'slight-drift').length;
  const alignedCount = sentenceScores.filter(s => s.status === 'aligned').length;

  const statusColor = driftScore < 30 ? 'text-signal-cyan' : driftScore < 60 ? 'text-brass' : 'text-alert-coral';
  const statusBg = driftScore < 30 ? 'bg-signal-cyan/10' : driftScore < 60 ? 'bg-brass/10' : 'bg-alert-coral/10';

  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-warm-bg flex items-center justify-center">
          <span className="text-2xl">&#9998;</span>
        </div>
        <p className="text-ink-text text-lg font-medium">Create a voice profile first</p>
        <p className="text-slate-text text-sm">Head to Voice Profile to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full tab-content-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${statusBg}`}>
            <span className={`text-2xl font-bold ${statusColor}`}>{driftScore}</span>
            <span className="text-xs text-slate-text">Drift<br/>Score</span>
          </div>
          {sentenceScores.length > 0 && (
            <div className="flex gap-4 text-xs text-slate-text">
              {highDriftCount > 0 && <span className="text-alert-coral font-medium">{highDriftCount} heavy</span>}
              {slightDriftCount > 0 && <span className="text-brass font-medium">{slightDriftCount} slight</span>}
              {alignedCount > 0 && <span className="text-signal-cyan font-medium">{alignedCount} aligned</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-text">Voice Lock</span>
          <div className="relative group/tip">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warm-bg text-slate-text text-[10px] cursor-help border border-card-border">?</span>
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2.5 bg-chart-paper border border-card-border rounded-xl text-xs text-slate-text w-60 opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-20 shadow-lg leading-relaxed">
              Warns you when a rewrite drifts too far from your voice, preventing over-polishing.
            </div>
          </div>
          <button onClick={() => setVoiceLock(!voiceLock)}
            className={`w-10 h-5 rounded-full transition-colors relative ${voiceLock ? 'bg-signal-cyan' : 'bg-slate-text/20'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-chart-paper shadow-sm transition-transform ${voiceLock ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {voiceLockWarning && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-alert-coral/5 border border-alert-coral/20 rounded-xl text-alert-coral text-xs animate-fade-in">
          {voiceLockWarning}
        </div>
      )}

      {/* Editor panels */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 flex flex-col border-r border-card-border">
          <div className="px-6 py-3 border-b border-card-border/50">
            <span className="text-xs font-medium text-slate-text/50">Your draft</span>
          </div>
          <textarea ref={textareaRef} value={text} onChange={handleTextChange} onPaste={handlePaste}
            placeholder="Paste an AI draft here, or start writing..."
            className="flex-1 w-full bg-transparent text-ink-text placeholder-slate-text/40 text-base leading-relaxed resize-none focus:outline-none p-6" />
        </div>

        <div className="w-1/2 flex flex-col overflow-y-auto bg-warm-bg/50">
          <div className="px-6 py-3 border-b border-card-border/50">
            <span className="text-xs font-medium text-slate-text/50">Drift analysis</span>
          </div>
          <div className="flex-1 p-6 space-y-2">
            {sentenceScores.length === 0 ? (
              <p className="text-slate-text/40 italic">Paste or write to see drift analysis</p>
            ) : (
              sentenceScores.map((score, idx) => (
                <div key={idx} onClick={() => handleSentenceClick(idx)}
                  className={`px-4 py-3 rounded-xl cursor-pointer transition-all hover:shadow-sm ${
                    score.status === 'aligned' ? 'drift-aligned' : score.status === 'slight-drift' ? 'drift-slight' : 'drift-heavy'
                  } ${selectedSentenceIdx === idx ? 'ring-2 ring-brass/30' : ''}`}>
                  <p className="text-ink-text text-sm leading-relaxed">{score.text}</p>
                  {score.reasons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {score.reasons.map((reason, rIdx) => (
                        <p key={rIdx} className="text-xs text-slate-text flex items-center gap-2">
                          <span className={reason.type === 'cliche' ? 'text-alert-coral' : reason.type === 'rhythm' ? 'text-brass' : 'text-signal-cyan'}>
                            {reason.type === 'cliche' ? '!' : reason.type === 'rhythm' ? '~' : '#'}
                          </span>
                          {reason.label}
                        </p>
                      ))}
                    </div>
                  )}
                  {score.status !== 'aligned' && (
                    <button onClick={(e) => { e.stopPropagation(); handleSentenceClick(idx); }}
                      className="mt-2 text-xs text-brass hover:text-brass/70 font-medium transition-colors">
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
        <div className="border-t border-card-border px-6 py-4 bg-warm-bg max-h-64 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-brass">Rewrite suggestions</span>
            <button onClick={() => { setSelectedSentenceIdx(null); setRewrites([]); }}
              className="text-xs text-slate-text/40 hover:text-ink-text">Close</button>
          </div>
          <div className="space-y-3">
            {rewrites.map((rw, i) => (
              <div key={i} className="card-panel">
                <p className="text-sm text-ink-text mb-2">"{rw.rewritten}"</p>
                <p className="text-xs text-signal-cyan mb-2">{rw.explanation}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rw.changes.map((c, ci) => (
                    <span key={ci} className="text-xs px-2 py-0.5 bg-warm-bg rounded-lg text-slate-text">{c}</span>
                  ))}
                </div>
                <button onClick={() => handleApplyRewrite(rw)} className="btn-primary text-xs py-1.5">Apply this rewrite</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Receipt */}
      {receipt && (
        <div className="border-t border-signal-cyan/20 px-6 py-4 bg-signal-cyan/5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-signal-cyan">Voice receipt</span>
            <button onClick={() => setReceipt(null)} className="text-xs text-slate-text/40 hover:text-ink-text">Dismiss</button>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-lg font-bold text-alert-coral">{receipt.before}</span>
            <span className="text-slate-text/30 text-xs">&rarr;</span>
            <span className="text-lg font-bold text-signal-cyan">{receipt.after}</span>
            <span className="text-xs text-signal-cyan font-medium">
              ({receipt.before - receipt.after > 0 ? '-' : '+'}{Math.abs(receipt.before - receipt.after)} drift)
            </span>
          </div>
          <div className="space-y-1">
            {receipt.changes.map((c, i) => (
              <p key={i} className="text-xs text-slate-text flex items-center gap-2">
                <span className="text-signal-cyan">+</span> {c}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-card-border text-xs text-slate-text/50 flex items-center gap-4">
        <span>{text.length} chars</span>
        <span>{wordCount} words</span>
        <span>{sentenceScores.length} sentences</span>
      </div>
    </div>
  );
}
