import React, { useState, useRef, useEffect } from 'react';
import { StylemetricProfile } from '@/lib/stylometry';
import { useScoring } from '@/lib/useScoring';

interface VoiceEditorProps {
  onDriftChange: (drift: number) => void;
  activeProfile: StylemetricProfile | null;
}

interface SentenceWithScore {
  text: string;
  driftScore: number;
}

export function VoiceEditor({ onDriftChange, activeProfile }: VoiceEditorProps) {
  const [text, setText] = useState('');
  const [sentenceScores, setSentenceScores] = useState<SentenceWithScore[]>([]);
  const [hoveredSentenceIdx, setHoveredSentenceIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { result, score } = useScoring(activeProfile);

  useEffect(() => {
    setSentenceScores(result.sentenceScores);
  }, [result.sentenceScores]);

  useEffect(() => {
    onDriftChange(result.drift);
  }, [result.drift, onDriftChange]);

  const detectSentenceCompletion = (text: string, lastChar: string): boolean => {
    return lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === '\n';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const lastChar = newText[newText.length - 1];
    const wasSentenceComplete = detectSentenceCompletion(newText, lastChar);

    setText(newText);
    score(newText, wasSentenceComplete);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newText = text + pastedText;
    setText(newText);
    score(newText, false);
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const getDriftExplanation = (score: number): string => {
    if (score < 0.3) return 'On voice — matches your baseline';
    if (score < 0.6) return 'Slightly off — minor differences from your pattern';
    return 'High drift — notably different from your voice';
  };

  const renderHighlightedText = () => {
    if (sentenceScores.length === 0) {
      return <span className="text-ink-text/50 italic">Paste or write to see drift analysis</span>;
    }

    return (
      <div className="space-y-2">
        {sentenceScores.map((scoreObj, idx) => {
          const isDrift = scoreObj.driftScore > 0.5;
          const isHovered = hoveredSentenceIdx === idx;

          return (
            <div
              key={idx}
              className="relative group"
              onMouseEnter={() => setHoveredSentenceIdx(idx)}
              onMouseLeave={() => setHoveredSentenceIdx(null)}
            >
              <span
                className={`transition-colors cursor-help ${
                  isDrift
                    ? 'underline decoration-alert-coral decoration-2 underline-offset-2'
                    : ''
                }`}
              >
                {scoreObj.text}{' '}
              </span>

              {isHovered && isDrift && (
                <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-alert-coral text-slate-text text-xs rounded whitespace-nowrap pointer-events-none z-10 font-mono">
                  {getDriftExplanation(scoreObj.driftScore)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const subtitle = activeProfile
    ? 'Paste or write. Measure drift against your voice.'
    : 'Create a heading first to start measuring drift.';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-ink-text/10">
        <h1 className="text-2xl font-fraunces font-bold text-ink-text">Your draft</h1>
        <p className="text-xs text-ink-text/60 mt-1">{subtitle}</p>
      </div>

      {/* Two-panel editor */}
      <div className="flex-1 flex overflow-hidden gap-6 px-8 py-6">
        {/* Input textarea (left) */}
        <div className="w-1/2 flex flex-col">
          <label className="text-xs font-mono text-ink-text/60 uppercase mb-2">Input</label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onPaste={handlePaste}
            placeholder="Paste an AI draft here, or start writing..."
            disabled={!activeProfile}
            className="flex-1 w-full bg-transparent text-ink-text placeholder-ink-text/40 font-spectral text-base leading-relaxed resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border-r border-ink-text/10 pr-4"
          />
        </div>

        {/* Analysis output (right) */}
        <div className="w-1/2 flex flex-col overflow-y-auto pl-4 border-l border-ink-text/10">
          <label className="text-xs font-mono text-ink-text/60 uppercase mb-2">Drift analysis</label>
          <div className="flex-1 text-ink-text font-spectral text-base leading-relaxed">
            {renderHighlightedText()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-ink-text/10 text-xs text-ink-text/60 font-mono space-y-1">
        <p>{text.length} characters · {wordCount} words</p>
        {sentenceScores.length > 0 && (
          <p>
            Drift: {result.drift.toFixed(1)}° ·
            {sentenceScores.filter((s) => s.driftScore > 0.5).length} high-drift sentences
          </p>
        )}
      </div>
    </div>
  );
}
