import { useState, useRef, useEffect, useCallback } from 'react';
import { StylemetricProfile, SentenceScore, computeDriftScore100, scoreAgainstProfile, computeContractionRate, computeAIClicheCount, computeFillerWords, computePunctuation, getSentenceLengths } from '@/lib/stylometry';
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

const MODES: { key: PlatformMode; label: string }[] = [
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
  const [scores, setScores] = useState<SentenceScore[]>([]);
  const [drift, setDrift] = useState(0);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [rewrites, setRewrites] = useState<RewriteSuggestion[]>([]);
  const [voiceLock, setVoiceLock] = useState(false);
  const [lockWarn, setLockWarn] = useState('');
  const [receipt, setReceipt] = useState<{ changes: string[]; before: number; after: number; count: number; ts: number } | null>(null);
  const [mode, setMode] = useState<PlatformMode>('general');
  const [demoStep, setDemoStep] = useState(0);
  const [typed, setTyped] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };
  const taRef = useRef<HTMLTextAreaElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analyze = useCallback((input: string) => {
    if (!activeProfile || !input.trim()) { setScores([]); setDrift(0); onDriftChange(0); return; }
    const s = scoreAgainstProfile(input, activeProfile);
    const d = computeDriftScore100(input, activeProfile);
    setScores(s); setDrift(d); onDriftChange((d / 100) * 45);
  }, [activeProfile, onDriftChange]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v); setSelIdx(null); setRewrites([]); setReceipt(null);
    if (!typed && v.length > 0) { setTyped(true); setDemoStep(0); }
    if (debRef.current) clearTimeout(debRef.current);
    const last = v[v.length - 1];
    if (last === '.' || last === '!' || last === '?' || last === '\n') analyze(v);
    else debRef.current = setTimeout(() => analyze(v), 400);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const v = text + e.clipboardData.getData('text');
    setText(v); analyze(v);
  };

  useEffect(() => () => { if (debRef.current) clearTimeout(debRef.current); if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const clickSentence = async (idx: number) => {
    if (!activeProfile) return;
    const s = scores[idx];
    if (s.status === 'aligned') return;
    setSelIdx(idx);
    const mock = generateMockRewrites(s.text, activeProfile);
    setLlmLoading(true); setRewrites(mock);
    try {
      const llm = await generateLLMRewrite(s.text, activeProfile, mode);
      if (llm) setRewrites([llm, ...mock]);
    } catch { /* keep mock */ } finally { setLlmLoading(false); }
  };

  const applyRewrite = (rw: RewriteSuggestion) => {
    const before = drift;
    const next = text.replace(rw.original, rw.rewritten);
    setText(next);
    if (voiceLock && activeProfile) {
      if (computeDriftScore100(rw.rewritten, activeProfile) > 70) {
        setLockWarn('This rewrite may move too far from your voice.');
        setTimeout(() => setLockWarn(''), 4000);
      }
    }
    analyze(next);
    if (activeProfile) {
      const after = computeDriftScore100(next, activeProfile);
      setReceipt({ changes: rw.changes, before, after, count: scores.filter(s => s.status !== 'aligned').length, ts: Date.now() });
      recordDriftHistory(activeHeadingId, (after / 100) * 45, next.length).catch(() => {});
    }
    setSelIdx(null); setRewrites([]);
  };

  const copyReceipt = () => {
    if (!receipt) return;
    navigator.clipboard.writeText([
      `Drift Voice Receipt — ${activeProfileName}`,
      `${new Date(receipt.ts).toLocaleString()}`,
      `Score: ${receipt.before} → ${receipt.after} (${receipt.before > receipt.after ? '-' : '+'}${Math.abs(receipt.before - receipt.after)} drift)`,
      '', ...receipt.changes.map(c => `  ${c}`),
    ].join('\n')).catch(() => {});
  };

  // Demo handlers
  const demo1 = async () => { await loadDemoData(); onLoadDemo(); setDemoStep(2); showToast('5 demo voice profiles loaded'); };
  const demo2 = () => { setText(demoAIDraft); setTyped(false); setDemoStep(3); showToast('Generic AI draft loaded — ready to analyze'); };
  const demo3 = () => {
    const draft = text || demoAIDraft;
    if (!draft.trim()) { showToast('Load an AI draft first (step 2)'); return; }
    analyze(draft);
    setDemoStep(4);
    showToast('Drift analysis complete — click a flagged sentence or use step 4');
  };
  const demo4 = async () => {
    const i = scores.findIndex(s => s.status !== 'aligned');
    if (i >= 0) {
      await clickSentence(i);
      showToast('Rewrite suggestions ready — pick one to apply');
    } else {
      showToast('No drifted sentences found — try a different draft');
    }
    setDemoStep(0);
  };

  const wc = text.split(/\s+/).filter(Boolean).length;
  const heavy = scores.filter(s => s.status === 'heavy-drift').length;
  const slight = scores.filter(s => s.status === 'slight-drift').length;
  const aligned = scores.filter(s => s.status === 'aligned').length;

  const dColor = drift < 30 ? 'text-signal-cyan' : drift < 60 ? 'text-brass' : 'text-alert-coral';
  const showDemo = demoStep > 0 || (!typed && text.length === 0 && !!activeProfile);

  if (!activeProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20 tab-content-enter">
        <p className="text-ink-text text-lg font-medium">No voice profile loaded</p>
        <p className="text-slate-text text-sm max-w-sm text-center leading-relaxed">
          Drift needs writing samples to build your voice fingerprint. Load a demo to try it, or create your own in Voice Profile.
        </p>
        <button onClick={async () => { await loadDemoData(); onLoadDemo(); setDemoStep(2); showToast('5 demo voice profiles loaded'); }} className="btn-primary">Load demo voice</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full tab-content-enter relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-ink-text text-chart-paper text-sm rounded-lg shadow-md animate-fade-in">
          {toast}
        </div>
      )}

      {/* Demo strip */}
      {showDemo && (
        <div className="px-4 sm:px-5 py-3 border-b border-card-border bg-warm-bg/50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-ink-text font-medium">Try Drift in 30 seconds</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { n: 1, label: 'Load voice', fn: demo1, ready: demoStep === 0, done: demoStep >= 2 },
                { n: 2, label: 'Load AI draft', fn: demo2, ready: demoStep === 2, done: demoStep >= 3 },
                { n: 3, label: 'Analyze', fn: demo3, ready: demoStep === 3, done: demoStep >= 4 },
                { n: 4, label: 'Restore voice', fn: demo4, ready: demoStep === 4, done: false },
              ].map(s => (
                <button key={s.n} onClick={s.fn} disabled={!s.ready && !s.done}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    s.ready ? 'bg-brass text-white' : s.done ? 'text-signal-cyan bg-signal-cyan/5' : 'text-slate-text/30 bg-warm-bg'
                  }`}>
                  {s.n}. {s.label}
                </button>
              ))}
              <button onClick={() => setDemoStep(0)} className="text-xs text-slate-text/30 hover:text-ink-text ml-1">
                dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-card-border text-sm">
        <div className="flex items-center gap-4">
          {/* Score + Why */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-semibold tabular-nums ${dColor}`}>{drift}</span>
            <span className="text-xs text-slate-text/50">drift</span>
            {scores.length > 0 && (
              <button onClick={() => setShowScoreInfo(v => !v)}
                className="text-[11px] text-slate-text/40 hover:text-brass ml-1 transition-colors">
                {showScoreInfo ? 'hide' : 'why?'}
              </button>
            )}
          </div>
          {/* Counts */}
          {scores.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-text/60">
              {heavy > 0 && <span className="text-alert-coral">{heavy} off-voice</span>}
              {slight > 0 && <span className="text-brass">{slight} drifting</span>}
              {aligned > 0 && <span className="text-signal-cyan">{aligned} on-voice</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mode */}
          <select value={mode} onChange={e => setMode(e.target.value as PlatformMode)} aria-label="Writing mode"
            className="bg-transparent text-xs text-slate-text border border-card-border rounded-md px-2 py-1 focus:outline-none focus:border-brass cursor-pointer">
            {MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          {/* Voice Lock */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-text/60">
            <span className="hidden sm:inline">Voice Lock</span>
            <button onClick={() => setVoiceLock(!voiceLock)} aria-label={voiceLock ? 'Disable voice lock' : 'Enable voice lock'}
              className={`w-8 h-4 rounded-full transition-colors relative ${voiceLock ? 'bg-signal-cyan' : 'bg-slate-text/15'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-chart-paper transition-transform ${voiceLock ? 'left-4' : 'left-0.5'}`} />
            </button>
          </label>
        </div>
      </div>

      {/* Score explanation panel */}
      {showScoreInfo && text.trim() && activeProfile && (
        <div className="px-4 sm:px-5 py-3 border-b border-card-border bg-warm-bg/40 text-xs space-y-2">
          <p className="text-ink-text font-medium text-sm mb-1">How this score was calculated</p>
          <p className="text-slate-text/70 leading-relaxed">
            Drift compares your draft against your voice fingerprint using measurable traits.
            Each trait is scored by how far it deviates from your baseline. No AI is used for scoring — it's deterministic.
          </p>
          {(() => {
            const lens = getSentenceLengths(text);
            const avgLen = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0;
            const profileLen = Math.round(activeProfile.sentenceLength.mean);
            const contr = Math.round(computeContractionRate(text) * 100);
            const profileContr = Math.round(activeProfile.contractionRate * 100);
            const cliches = computeAIClicheCount(text);
            const fillers = computeFillerWords(text);
            const profileFillers = activeProfile.fillerWords.frequency;
            const punct = computePunctuation(text);

            const traits = [
              { name: 'Sentence rhythm', you: `~${profileLen} words`, draft: `~${avgLen} words`, off: Math.abs(avgLen - profileLen) > 5 },
              { name: 'Contractions', you: `${profileContr}%`, draft: `${contr}%`, off: Math.abs(contr - profileContr) > 20 },
              { name: 'AI cliches', you: '0', draft: String(cliches), off: cliches > 0 },
              { name: 'Filler words', you: `${profileFillers.toFixed(1)}/100w`, draft: `${fillers.toFixed(1)}/100w`, off: Math.abs(fillers - profileFillers) > 3 },
              { name: 'Em-dashes', you: `${activeProfile.punctuation.emDashes.toFixed(1)}/100w`, draft: `${punct.emDashes.toFixed(1)}/100w`, off: Math.abs(punct.emDashes - activeProfile.punctuation.emDashes) > 3 },
            ];

            return (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-text/40">
                    <th className="py-1 font-medium">Trait</th>
                    <th className="py-1 font-medium">Your voice</th>
                    <th className="py-1 font-medium">This draft</th>
                    <th className="py-1 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {traits.map(t => (
                    <tr key={t.name} className="border-t border-card-border/50">
                      <td className="py-1 text-slate-text">{t.name}</td>
                      <td className="py-1 text-slate-text/70">{t.you}</td>
                      <td className="py-1 text-slate-text/70">{t.draft}</td>
                      <td className="py-1 text-center">{t.off ? <span className="text-alert-coral">*</span> : <span className="text-signal-cyan">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
          <p className="text-slate-text/40 pt-1">* = notable deviation from your baseline. Scoring is weighted: cliches and contractions matter most.</p>
        </div>
      )}

      {lockWarn && (
        <div className="mx-4 sm:mx-5 mt-2 px-3 py-2 bg-alert-coral/5 border border-alert-coral/15 rounded-md text-alert-coral text-xs">
          {lockWarn}
        </div>
      )}

      {/* Panels */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Writing pane */}
        <div className="sm:w-1/2 flex flex-col border-b sm:border-b-0 sm:border-r border-card-border min-h-[180px]">
          <textarea ref={taRef} value={text} onChange={onChange} onPaste={onPaste}
            placeholder="Paste a draft here, or start writing..."
            aria-label="Draft text input"
            className="flex-1 w-full bg-transparent text-ink-text placeholder-slate-text/30 text-[15px] leading-[1.75] resize-none focus:outline-none px-5 py-4" />
          <div className="px-5 py-2 border-t border-card-border/50 text-xs text-slate-text/40 flex gap-4">
            <span>{wc} words</span><span>{scores.length} sentences</span>
          </div>
        </div>

        {/* Analysis pane */}
        <div className="sm:w-1/2 flex flex-col overflow-y-auto bg-warm-bg/30 min-h-[180px]">
          <div className="flex-1 px-5 py-4 space-y-1.5">
            {scores.length === 0 ? (
              <p className="text-slate-text/30 text-sm italic pt-1">Write or paste text to see analysis</p>
            ) : (
              scores.map((s, i) => (
                <div key={i} onClick={() => clickSentence(i)}
                  className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                    s.status === 'aligned' ? 'drift-aligned' : s.status === 'slight-drift' ? 'drift-slight' : 'drift-heavy'
                  } ${selIdx === i ? 'ring-1 ring-brass/30' : ''}`}>
                  <p className="text-ink-text text-sm leading-relaxed">{s.text}</p>
                  {s.reasons.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {s.reasons.map((r, ri) => (
                        <p key={ri} className="text-xs text-slate-text/60 leading-snug">{r.label}</p>
                      ))}
                    </div>
                  )}
                  {s.status !== 'aligned' && (
                    <button onClick={(e) => { e.stopPropagation(); clickSentence(i); }}
                      className="mt-1.5 text-xs text-brass hover:text-brass/70 transition-colors">
                      Restore my voice
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rewrites */}
      {selIdx !== null && rewrites.length > 0 && (
        <div className="border-t border-card-border px-4 sm:px-5 py-3 bg-warm-bg/50 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-text font-medium">
              Suggestions {llmLoading && <span className="text-slate-text/40 font-normal ml-2">generating...</span>}
            </span>
            <button onClick={() => { setSelIdx(null); setRewrites([]); }} className="text-xs text-slate-text/40 hover:text-ink-text">close</button>
          </div>
          <div className="space-y-2">
            {rewrites.map((rw, i) => (
              <div key={i} className="card-panel py-3">
                <p className="text-sm text-ink-text leading-relaxed mb-1.5">"{rw.rewritten}"</p>
                <p className="text-xs text-slate-text mb-2">{rw.explanation}</p>
                <button onClick={() => applyRewrite(rw)} className="text-xs text-brass hover:text-brass/70 font-medium transition-colors">
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt */}
      {receipt && (
        <div className="border-t border-card-border px-4 sm:px-5 py-3 bg-signal-cyan/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-text font-medium">Voice receipt</span>
            <div className="flex gap-2">
              <button onClick={copyReceipt} className="text-xs text-brass hover:text-brass/70">Copy</button>
              <button onClick={() => setReceipt(null)} className="text-xs text-slate-text/40 hover:text-ink-text">dismiss</button>
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-alert-coral font-medium">{receipt.before}</span>
            <span className="text-slate-text/30 text-xs">&rarr;</span>
            <span className="text-signal-cyan font-medium">{receipt.after}</span>
            <span className="text-xs text-slate-text/50">
              ({receipt.before > receipt.after ? '-' : '+'}{Math.abs(receipt.before - receipt.after)} drift, {receipt.count} sentence{receipt.count !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="space-y-0.5">
            {receipt.changes.map((c, i) => (
              <p key={i} className="text-xs text-slate-text/60">{c}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
