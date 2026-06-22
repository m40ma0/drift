import { useState, useRef, useEffect, useCallback } from 'react';
import { StylemetricProfile, SentenceScore, computeDriftScore100, scoreAgainstProfile } from '@/lib/stylometry';
import { generateMockRewrites, generateLLMRewrite, RewriteSuggestion, PlatformMode } from '@/lib/rewrite';
import { recordDriftHistory } from '@/lib/headings';
import { demoAIDraft, loadDemoData } from '@/lib/demoData';

interface EditorTabProps {
  activeProfile: StylemetricProfile | null;
  activeHeadingId: string;
  activeProfileName: string;
  onDriftChange: (drift: number) => void;
  onLoadDemo: () => void;
}

const PLATFORM_MODES: { key: PlatformMode; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'social', label: 'Social' },
  { key: 'essay', label: 'Essay' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'blog', label: 'Blog' },
  { key: 'application', label: 'Application' },
  { key: 'founder', label: 'Founder' },
];

export function EditorTab({ activeProfile, activeHeadingId, activeProfileName, onDriftChange, onLoadDemo }: EditorTabProps) {
  const [text, setText] = useState('');
  const [sentenceScores, setSentenceScores] = useState<SentenceScore[]>([]);
  const [driftScore, setDriftScore] = useState(0);
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState<number | null>(null);
  const [rewrites, setRewrites] = useState<RewriteSuggestion[]>([]);
  const [voiceLock, setVoiceLock] = useState(false);
  const [voiceLockWarning, setVoiceLockWarning] = useState('');
  const [receipt, setReceipt] = useState<{ changes: string[]; before: number; after: number; sentencesChanged: number; timestamp: number } | null>(null);
  const [platformMode, setPlatformMode] = useState<PlatformMode>('general');
  const [demoStep, setDemoStep] = useState(0); // 0 = not started, 1-4 = steps
  const [userHasTyped, setUserHasTyped] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
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

    // Auto-dismiss guided demo if user types their own text
    if (!userHasTyped && newText.length > 0) {
      setUserHasTyped(true);
      setDemoStep(0);
    }

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

  const handleSentenceClick = async (idx: number) => {
    if (!activeProfile) return;
    const score = sentenceScores[idx];
    if (score.status === 'aligned') return;
    setSelectedSentenceIdx(idx);

    // Generate mock rewrites first
    const mockRewrites = generateMockRewrites(score.text, activeProfile);

    // Try LLM rewrite
    setLlmLoading(true);
    setRewrites(mockRewrites);
    try {
      const llmResult = await generateLLMRewrite(score.text, activeProfile, platformMode);
      if (llmResult) {
        setRewrites([{ ...llmResult, explanation: llmResult.explanation }, ...mockRewrites]);
      }
    } catch {
      // LLM failed, keep mock rewrites
    } finally {
      setLlmLoading(false);
    }
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
      const changedCount = sentenceScores.filter(s => s.status !== 'aligned').length;
      setReceipt({ changes: suggestion.changes, before: beforeScore, after: afterScore, sentencesChanged: changedCount, timestamp: Date.now() });
      recordDriftHistory(activeHeadingId, (afterScore / 100) * 45, newText.length).catch(() => {});
    }
    setSelectedSentenceIdx(null);
    setRewrites([]);
  };

  // --- Guided demo handlers ---
  const handleDemoStep1 = async () => {
    await loadDemoData();
    onLoadDemo();
    setDemoStep(2);
  };

  const handleDemoStep2 = () => {
    setText(demoAIDraft);
    setUserHasTyped(false);
    setDemoStep(3);
  };

  const handleDemoStep3 = () => {
    analyze(demoAIDraft);
    setDemoStep(4);
  };

  const handleDemoStep4 = () => {
    // Auto-select the first drifted sentence and trigger rewrites
    const firstDrifted = sentenceScores.findIndex(s => s.status !== 'aligned');
    if (firstDrifted >= 0) {
      handleSentenceClick(firstDrifted);
    }
    setDemoStep(0);
  };

  const handleCopyReceipt = () => {
    if (!receipt) return;
    const lines = [
      `Drift Voice Receipt`,
      `Profile: ${activeProfileName}`,
      `Time: ${new Date(receipt.timestamp).toLocaleString()}`,
      `Score: ${receipt.before} -> ${receipt.after} (${receipt.before - receipt.after > 0 ? '-' : '+'}${Math.abs(receipt.before - receipt.after)} drift)`,
      `Sentences changed: ${receipt.sentencesChanged}`,
      `---`,
      ...receipt.changes.map(c => `+ ${c}`),
    ];
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const highDriftCount = sentenceScores.filter(s => s.status === 'heavy-drift').length;
  const slightDriftCount = sentenceScores.filter(s => s.status === 'slight-drift').length;
  const alignedCount = sentenceScores.filter(s => s.status === 'aligned').length;

  const statusColor = driftScore < 30 ? 'text-signal-cyan' : driftScore < 60 ? 'text-brass' : 'text-alert-coral';
  const statusBg = driftScore < 30 ? 'bg-signal-cyan/10' : driftScore < 60 ? 'bg-brass/10' : 'bg-alert-coral/10';

  const showDemoStrip = !userHasTyped && text.length === 0 && activeProfile !== null;

  // --- No profile state ---
  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-warm-bg flex items-center justify-center border border-card-border">
          <span className="text-3xl">&#9998;</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-ink-text text-xl font-semibold">Welcome to the Drift Editor</p>
          <p className="text-slate-text text-sm max-w-md leading-relaxed">
            To check if writing sounds like you, Drift needs a voice profile first.
            Load a demo to try it instantly, or create your own from your writing samples.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onLoadDemo}
            className="btn-primary text-sm py-2.5 px-6">
            Load Demo Voice
          </button>
          <span className="text-slate-text/40 text-sm self-center">or</span>
          <span className="text-slate-text text-sm self-center">
            Head to Voice Profile to create your own
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full tab-content-enter">
      {/* Guided Demo Strip */}
      {showDemoStrip && (
        <div className="px-6 py-4 bg-brass/5 border-b border-brass/20 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-semibold text-brass">Try Drift in 30 seconds</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Step 1 */}
              <button
                onClick={handleDemoStep1}
                disabled={demoStep > 1}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  demoStep === 0
                    ? 'bg-brass text-chart-paper hover:bg-brass/90'
                    : demoStep >= 2
                      ? 'bg-signal-cyan/10 text-signal-cyan'
                      : 'bg-warm-bg text-slate-text/40'
                }`}
              >
                1. Load Demo Voice
              </button>

              {/* Step 2 */}
              <button
                onClick={handleDemoStep2}
                disabled={demoStep < 2 || demoStep > 2}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  demoStep === 2
                    ? 'bg-brass text-chart-paper hover:bg-brass/90'
                    : demoStep > 2
                      ? 'bg-signal-cyan/10 text-signal-cyan'
                      : 'bg-warm-bg text-slate-text/40'
                }`}
              >
                2. Load AI Draft
              </button>

              {/* Step 3 */}
              <button
                onClick={handleDemoStep3}
                disabled={demoStep < 3 || demoStep > 3}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  demoStep === 3
                    ? 'bg-brass text-chart-paper hover:bg-brass/90'
                    : demoStep > 3
                      ? 'bg-signal-cyan/10 text-signal-cyan'
                      : 'bg-warm-bg text-slate-text/40'
                }`}
              >
                3. Run Drift
              </button>

              {/* Step 4 */}
              <button
                onClick={handleDemoStep4}
                disabled={demoStep < 4}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  demoStep === 4
                    ? 'bg-brass text-chart-paper hover:bg-brass/90'
                    : 'bg-warm-bg text-slate-text/40'
                }`}
              >
                4. Restore My Voice
              </button>

              <button
                onClick={() => setDemoStep(0)}
                className="text-xs text-slate-text/40 hover:text-ink-text ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Platform Mode Selector */}
      <div className="px-6 py-2.5 border-b border-card-border/50 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-slate-text/50 mr-1 flex-shrink-0">Mode:</span>
        {PLATFORM_MODES.map(mode => (
          <button
            key={mode.key}
            onClick={() => setPlatformMode(mode.key)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all flex-shrink-0 ${
              platformMode === mode.key
                ? 'bg-brass/15 text-brass border border-brass/30'
                : 'text-slate-text/50 hover:text-ink-text hover:bg-warm-bg border border-transparent'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {voiceLockWarning && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-alert-coral/5 border border-alert-coral/20 rounded-xl text-alert-coral text-xs animate-fade-in">
          {voiceLockWarning}
        </div>
      )}

      {/* Editor panels */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        <div className="sm:w-1/2 flex flex-col border-b sm:border-b-0 sm:border-r border-card-border min-h-[200px]">
          <div className="px-6 py-3 border-b border-card-border/50">
            <span className="text-xs font-medium text-slate-text/50">Your draft</span>
          </div>
          <textarea ref={textareaRef} value={text} onChange={handleTextChange} onPaste={handlePaste}
            placeholder="Paste an AI draft here, or start writing..."
            className="flex-1 w-full bg-transparent text-ink-text placeholder-slate-text/40 text-base leading-relaxed resize-none focus:outline-none p-6" />
        </div>

        <div className="sm:w-1/2 flex flex-col overflow-y-auto bg-warm-bg/50 min-h-[200px]">
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
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-brass">Rewrite suggestions</span>
              {llmLoading && (
                <span className="text-xs text-slate-text/50 animate-pulse">Generating AI rewrite...</span>
              )}
            </div>
            <button onClick={() => { setSelectedSentenceIdx(null); setRewrites([]); }}
              className="text-xs text-slate-text/40 hover:text-ink-text">Close</button>
          </div>
          <div className="space-y-3">
            {rewrites.map((rw, i) => {
              const isLLM = rw.changes.includes('Rewritten by AI to match your voice fingerprint');
              return (
                <div key={i} className="card-panel">
                  {isLLM && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-signal-cyan bg-signal-cyan/10 px-2 py-0.5 rounded mb-2">
                      AI-powered
                    </span>
                  )}
                  <p className="text-sm text-ink-text mb-2">"{rw.rewritten}"</p>
                  <p className="text-xs text-signal-cyan mb-2">{rw.explanation}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rw.changes.map((c, ci) => (
                      <span key={ci} className="text-xs px-2 py-0.5 bg-warm-bg rounded-lg text-slate-text">{c}</span>
                    ))}
                  </div>
                  <button onClick={() => handleApplyRewrite(rw)} className="btn-primary text-xs py-1.5">Apply this rewrite</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice Receipt */}
      {receipt && (
        <div className="border-t border-signal-cyan/20 px-6 py-4 bg-signal-cyan/5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-signal-cyan uppercase tracking-wider">Voice Receipt</span>
              <span className="text-[10px] text-slate-text/40">{activeProfileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyReceipt}
                className="text-xs text-signal-cyan hover:text-signal-cyan/70 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-signal-cyan/10">
                Copy receipt
              </button>
              <button onClick={() => setReceipt(null)} className="text-xs text-slate-text/40 hover:text-ink-text">Dismiss</button>
            </div>
          </div>

          {/* Score bars */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-text w-12 text-right">Before</span>
              <div className="flex-1 h-2 bg-warm-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-alert-coral/70 rounded-full transition-all"
                  style={{ width: `${Math.min(receipt.before, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-alert-coral w-8">{receipt.before}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-text w-12 text-right">After</span>
              <div className="flex-1 h-2 bg-warm-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-signal-cyan/70 rounded-full transition-all"
                  style={{ width: `${Math.min(receipt.after, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-signal-cyan w-8">{receipt.after}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3 text-xs text-slate-text">
            <span>{receipt.sentencesChanged} sentence{receipt.sentencesChanged !== 1 ? 's' : ''} changed</span>
            <span className="text-slate-text/30">|</span>
            <span className="text-signal-cyan font-medium">
              {receipt.before - receipt.after > 0 ? '-' : '+'}{Math.abs(receipt.before - receipt.after)} drift
            </span>
            <span className="text-slate-text/30">|</span>
            <span className="text-slate-text/50">{new Date(receipt.timestamp).toLocaleTimeString()}</span>
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
