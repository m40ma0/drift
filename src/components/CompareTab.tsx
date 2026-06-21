import { useState, useCallback, useMemo } from 'react';
import {
  StylemetricProfile,
  computeDriftScore100,
  scoreAgainstProfile,
  SentenceScore,
  computeVoiceArchetype,
  computeContractionRate,
  computeAIClicheCount,
  computeFillerWords,
  computePunctuation,
  getSentenceLengths,
} from '@/lib/stylometry';
import { CompassGauge } from './CompassGauge';
import { demoCompareAI, demoCompareCreator } from '@/lib/demoData';

interface CompareTabProps {
  activeProfile: StylemetricProfile | null;
  sampleCount?: number;
}

/* ── Trait analysis for both drafts against the profile ── */

interface TraitComparison {
  label: string;
  profileValue: string;
  draftAValue: string;
  draftBValue: string;
  draftAMatch: number; // 0-1
  draftBMatch: number; // 0-1
}

interface VoiceInsight {
  text: string;
  severity: 'good' | 'warn' | 'bad';
}

function computeTraitComparisons(
  textA: string,
  textB: string,
  profile: StylemetricProfile,
): TraitComparison[] {
  const traits: TraitComparison[] = [];

  // Sentence rhythm
  const avgLenA = getSentenceLengths(textA);
  const avgLenB = getSentenceLengths(textB);
  const meanA = avgLenA.length ? avgLenA.reduce((a, b) => a + b, 0) / avgLenA.length : 0;
  const meanB = avgLenB.length ? avgLenB.reduce((a, b) => a + b, 0) / avgLenB.length : 0;
  const profileMean = profile.sentenceLength.mean;
  const rhythmMatchA = 1 - Math.min(Math.abs(meanA - profileMean) / Math.max(profileMean, 1), 1);
  const rhythmMatchB = 1 - Math.min(Math.abs(meanB - profileMean) / Math.max(profileMean, 1), 1);
  traits.push({
    label: 'Sentence rhythm',
    profileValue: `~${Math.round(profileMean)} words/sentence`,
    draftAValue: `~${Math.round(meanA)} words/sentence`,
    draftBValue: `~${Math.round(meanB)} words/sentence`,
    draftAMatch: rhythmMatchA,
    draftBMatch: rhythmMatchB,
  });

  // Contractions
  const contrA = computeContractionRate(textA);
  const contrB = computeContractionRate(textB);
  const profileContr = profile.contractionRate;
  traits.push({
    label: 'Contractions',
    profileValue: `${Math.round(profileContr * 100)}% rate`,
    draftAValue: `${Math.round(contrA * 100)}% rate`,
    draftBValue: `${Math.round(contrB * 100)}% rate`,
    draftAMatch: 1 - Math.abs(contrA - profileContr),
    draftBMatch: 1 - Math.abs(contrB - profileContr),
  });

  // AI cliches
  const clicheA = computeAIClicheCount(textA);
  const clicheB = computeAIClicheCount(textB);
  const profileCliche = profile.aiClicheCount;
  traits.push({
    label: 'AI cliches',
    profileValue: `${profileCliche} found`,
    draftAValue: `${clicheA} found`,
    draftBValue: `${clicheB} found`,
    draftAMatch: Math.max(1 - clicheA * 0.2, 0),
    draftBMatch: Math.max(1 - clicheB * 0.2, 0),
  });

  // Punctuation style
  const punctA = computePunctuation(textA);
  const punctB = computePunctuation(textB);
  const profilePunct = profile.punctuation;
  const punctDiffA = Math.abs(punctA.emDashes - profilePunct.emDashes) +
    Math.abs(punctA.exclamationPoints - profilePunct.exclamationPoints) +
    Math.abs(punctA.questionMarks - profilePunct.questionMarks);
  const punctDiffB = Math.abs(punctB.emDashes - profilePunct.emDashes) +
    Math.abs(punctB.exclamationPoints - profilePunct.exclamationPoints) +
    Math.abs(punctB.questionMarks - profilePunct.questionMarks);
  const maxPunctDiff = Math.max(punctDiffA, punctDiffB, 1);
  traits.push({
    label: 'Punctuation style',
    profileValue: profilePunct.emDashes > 3 ? 'Em-dash heavy' : profilePunct.questionMarks > 3 ? 'Question-driven' : 'Standard',
    draftAValue: punctA.emDashes > 3 ? 'Em-dashes used' : 'Standard',
    draftBValue: punctB.emDashes > 3 ? 'Em-dashes used' : 'Standard',
    draftAMatch: 1 - punctDiffA / maxPunctDiff,
    draftBMatch: 1 - punctDiffB / maxPunctDiff,
  });

  // Filler words
  const fillerA = computeFillerWords(textA);
  const fillerB = computeFillerWords(textB);
  const profileFiller = profile.fillerWords.frequency;
  const maxFillerDiff = Math.max(
    Math.abs(fillerA - profileFiller),
    Math.abs(fillerB - profileFiller),
    1,
  );
  traits.push({
    label: 'Filler words',
    profileValue: `${profileFiller.toFixed(1)}% frequency`,
    draftAValue: `${fillerA.toFixed(1)}% frequency`,
    draftBValue: `${fillerB.toFixed(1)}% frequency`,
    draftAMatch: 1 - Math.abs(fillerA - profileFiller) / maxFillerDiff,
    draftBMatch: 1 - Math.abs(fillerB - profileFiller) / maxFillerDiff,
  });

  return traits;
}

function computeVoiceInsights(
  textA: string,
  textB: string,
  profile: StylemetricProfile,
): VoiceInsight[] {
  const insights: VoiceInsight[] = [];

  // Contraction analysis
  const contrA = computeContractionRate(textA);
  const contrB = computeContractionRate(textB);
  const profileContr = profile.contractionRate;

  if (Math.abs(contrA - profileContr) > 0.3 && Math.abs(contrB - profileContr) < 0.2) {
    insights.push({
      text: `Draft A uses ${contrA < 0.2 ? 'no' : 'few'} contractions. Draft B matches your ${Math.round(profileContr * 100)}% contraction rate.`,
      severity: 'bad',
    });
  } else if (Math.abs(contrA - profileContr) > 0.3) {
    insights.push({
      text: `Draft A's contraction rate (${Math.round(contrA * 100)}%) diverges sharply from your ${Math.round(profileContr * 100)}%.`,
      severity: 'bad',
    });
  }

  // AI cliche analysis
  const clicheA = computeAIClicheCount(textA);
  const clicheB = computeAIClicheCount(textB);
  if (clicheA > 0 || clicheB > 0) {
    insights.push({
      text: `Draft A has ${clicheA} AI-cliche phrase${clicheA !== 1 ? 's' : ''}. Draft B has ${clicheB}.`,
      severity: clicheA > 2 ? 'bad' : clicheA > 0 ? 'warn' : 'good',
    });
  }

  // Sentence length analysis
  const avgLenA = getSentenceLengths(textA);
  const avgLenB = getSentenceLengths(textB);
  const meanA = avgLenA.length ? Math.round(avgLenA.reduce((a, b) => a + b, 0) / avgLenA.length) : 0;
  const meanB = avgLenB.length ? Math.round(avgLenB.reduce((a, b) => a + b, 0) / avgLenB.length) : 0;
  const profileMean = Math.round(profile.sentenceLength.mean);

  if (Math.abs(meanA - profileMean) > 8) {
    insights.push({
      text: `Draft A averages ${meanA} words per sentence. Your profile averages ${profileMean}.`,
      severity: 'bad',
    });
  }
  if (Math.abs(meanB - profileMean) <= 4 && Math.abs(meanA - profileMean) > 6) {
    insights.push({
      text: `Draft B nails your sentence rhythm at ~${meanB} words. Draft A runs ${meanA > profileMean ? 'long' : 'short'} at ${meanA}.`,
      severity: 'good',
    });
  }

  // Filler words
  const fillerA = computeFillerWords(textA);
  const fillerB = computeFillerWords(textB);
  if (profile.fillerWords.frequency > 3 && fillerA < 1 && fillerB > 2) {
    insights.push({
      text: `Draft A is scrubbed clean of filler words. Draft B has them naturally, like your writing does.`,
      severity: 'warn',
    });
  }

  // Punctuation — em-dashes
  const punctA = computePunctuation(textA);
  const punctB = computePunctuation(textB);
  if (profile.punctuation.emDashes > 3 && punctA.emDashes < 1 && punctB.emDashes > 1) {
    insights.push({
      text: `Draft A avoids em-dashes. Draft B uses them naturally, matching your style.`,
      severity: 'warn',
    });
  }

  return insights;
}

function computeRestorationPlan(
  textA: string,
  profile: StylemetricProfile,
  sampleCount: number,
): string[] {
  const plan: string[] = [];
  const archetype = computeVoiceArchetype(profile, sampleCount);

  const contrA = computeContractionRate(textA);
  if (profile.contractionRate > 0.4 && contrA < 0.2) {
    plan.push(`Add contractions — you write "don't" not "do not", "it's" not "it is"`);
  }

  const avgLenA = getSentenceLengths(textA);
  const meanA = avgLenA.length ? avgLenA.reduce((a, b) => a + b, 0) / avgLenA.length : 0;
  if (meanA > profile.sentenceLength.mean + 8) {
    plan.push(`Break up long sentences to match your ~${Math.round(profile.sentenceLength.mean)} word rhythm`);
  } else if (meanA < profile.sentenceLength.mean - 5) {
    plan.push(`Combine some short sentences — your natural cadence averages ~${Math.round(profile.sentenceLength.mean)} words`);
  }

  const clicheA = computeAIClicheCount(textA);
  if (clicheA > 0) {
    plan.push(`Remove ${clicheA} AI-cliche phrase${clicheA !== 1 ? 's' : ''} — replace "leverage" with "use", "innovative" with "new"`);
  }

  if (profile.punctuation.emDashes > 3 && !textA.includes('—')) {
    plan.push(`Add em-dashes for asides — they're a signature part of your voice`);
  }

  if (profile.fillerWords.frequency > 3 && computeFillerWords(textA) < 1) {
    plan.push(`Sprinkle in natural filler words like "honestly", "actually" — they make your writing feel real`);
  }

  if (archetype.doNotFlatten.length > 0 && plan.length < 4) {
    for (const trait of archetype.doNotFlatten) {
      if (plan.length >= 4) break;
      const alreadyCovered = plan.some(p =>
        (trait.toLowerCase().includes('contraction') && p.toLowerCase().includes('contraction')) ||
        (trait.toLowerCase().includes('em-dash') && p.toLowerCase().includes('em-dash')) ||
        (trait.toLowerCase().includes('filler') && p.toLowerCase().includes('filler'))
      );
      if (!alreadyCovered) {
        plan.push(`Preserve: ${trait}`);
      }
    }
  }

  return plan.slice(0, 4);
}

/* ── Main component ── */

export function CompareTab({ activeProfile, sampleCount = 3 }: CompareTabProps) {
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
  const isEmpty = !textA.trim() && !textB.trim();

  const traitComparisons = useMemo(() => {
    if (!analyzed || !activeProfile || !textA.trim() || !textB.trim()) return [];
    return computeTraitComparisons(textA, textB, activeProfile);
  }, [analyzed, textA, textB, activeProfile]);

  const voiceInsights = useMemo(() => {
    if (!analyzed || !activeProfile || !textA.trim() || !textB.trim()) return [];
    return computeVoiceInsights(textA, textB, activeProfile);
  }, [analyzed, textA, textB, activeProfile]);

  const restorationPlan = useMemo(() => {
    if (!analyzed || !activeProfile || !textA.trim()) return [];
    return computeRestorationPlan(textA, activeProfile, sampleCount);
  }, [analyzed, textA, activeProfile, sampleCount]);

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

  const maxRows = Math.max(sentencesA.length, sentencesB.length);

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6 tab-content-enter">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-ink-text">Compare drafts</h2>
          <p className="text-sm text-slate-text mt-1">
            Paste two versions of the same idea. See which sounds more like you.
          </p>
        </div>
        <div className="flex gap-3">
          {!isEmpty && (
            <button onClick={handleLoadDemo} className="btn-ghost">
              Load demo
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!textA.trim() && !textB.trim()}
            className="btn-primary disabled:opacity-50"
          >
            Analyze both
          </button>
        </div>
      </div>

      {/* Text inputs with prominent demo CTA when empty */}
      <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-text/60">Draft A &mdash; Generic AI</label>
          <textarea
            value={textA}
            onChange={(e) => { setTextA(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a generic AI-generated draft..."
            className="w-full h-48 p-4 bg-chart-paper text-ink-text text-sm border border-card-border rounded-xl focus:outline-none focus:border-brass resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-text/60">Draft B &mdash; Your voice</label>
          <textarea
            value={textB}
            onChange={(e) => { setTextB(e.target.value); setAnalyzed(false); }}
            placeholder="Paste a draft in your own voice..."
            className="w-full h-48 p-4 bg-chart-paper text-ink-text text-sm border border-card-border rounded-xl focus:outline-none focus:border-brass resize-none"
          />
        </div>
      </div>

      {/* Prominent demo button when both text areas are empty */}
      {isEmpty && (
        <div className="animate-fade-in flex flex-col items-center py-8 gap-3">
          <p className="text-slate-text text-sm">Not sure what to paste? Try our side-by-side demo.</p>
          <button
            onClick={handleLoadDemo}
            className="px-6 py-3 bg-brass/10 border-2 border-dashed border-brass/40 text-brass font-semibold rounded-xl hover:bg-brass/20 hover:border-brass/60 transition-all text-sm"
          >
            Load Demo Compare &mdash; AI vs. Creator
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {analyzed && (
        <div className="space-y-8">

          {/* 1. Hero verdict */}
          <div className="animate-fade-in card-panel text-center py-8" style={{ animationDelay: '0.05s' }}>
            {closerDraft === 'tie' ? (
              <>
                <p className="text-2xl font-bold text-slate-text">Both drafts drift equally from your voice.</p>
                <p className="text-sm text-slate-text/60 mt-2">Try editing one to see the difference.</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-ink-text leading-snug">
                  <span className="text-signal-cyan">Draft {closerDraft}</span> is{' '}
                  <span className="text-brass">{difference} points</span> closer to your voice.
                </p>
                <p className="text-sm text-slate-text/60 mt-3">
                  {closerDraft === 'B'
                    ? 'Your natural writing wins. Here’s exactly why.'
                    : 'Surprisingly, the AI draft is closer. Let’s break down what happened.'}
                </p>
              </>
            )}
          </div>

          {/* 2. Compass gauges side by side */}
          <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.10s' }}>
            <div className="card-panel flex flex-col items-center py-6">
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-text/50 mb-2">Draft A</span>
              <CompassGauge drift={(scoreA / 100) * 45} size={160} />
              <p className={`text-lg font-bold mt-2 ${scoreA < 30 ? 'text-signal-cyan' : scoreA < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreA} drift
              </p>
            </div>
            <div className="card-panel flex flex-col items-center py-6">
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-text/50 mb-2">Draft B</span>
              <CompassGauge drift={(scoreB / 100) * 45} size={160} />
              <p className={`text-lg font-bold mt-2 ${scoreB < 30 ? 'text-signal-cyan' : scoreB < 60 ? 'text-brass' : 'text-alert-coral'}`}>
                {scoreB} drift
              </p>
            </div>
          </div>

          {/* 3. Trait match breakdown */}
          {traitComparisons.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <h3 className="text-sm font-bold text-ink-text mb-4 uppercase tracking-wide">Trait match breakdown</h3>
              <div className="card-panel space-y-4">
                {traitComparisons.map((trait, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-text">{trait.label}</span>
                      <span className="text-[0.65rem] text-slate-text/50">Profile: {trait.profileValue}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TraitBar label="A" value={trait.draftAMatch} detail={trait.draftAValue} />
                      <TraitBar label="B" value={trait.draftBMatch} detail={trait.draftBValue} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. "Where the voice disappeared" */}
          {voiceInsights.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.20s' }}>
              <h3 className="text-sm font-bold text-ink-text mb-4 uppercase tracking-wide">Where the voice disappeared</h3>
              <div className="card-panel space-y-3">
                {voiceInsights.map((insight, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
                      insight.severity === 'bad'
                        ? 'bg-alert-coral/[0.06] border-l-2 border-alert-coral/50'
                        : insight.severity === 'warn'
                          ? 'bg-brass/[0.06] border-l-2 border-brass/50'
                          : 'bg-signal-cyan/[0.06] border-l-2 border-signal-cyan/50'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {insight.severity === 'bad' ? '✖' : insight.severity === 'warn' ? '⚠' : '✔'}
                    </span>
                    <p className="text-ink-text/80">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Sentence-level alignment */}
          {sentencesA.length > 0 && sentencesB.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <h3 className="text-sm font-bold text-ink-text mb-4 uppercase tracking-wide">Sentence-level alignment</h3>
              <div className="card-panel overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-2 gap-0 border-b border-card-border">
                  <div className="px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-text/50">
                    Draft A
                  </div>
                  <div className="px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-text/50 border-l border-card-border">
                    Draft B
                  </div>
                </div>
                {/* Sentence rows */}
                {Array.from({ length: maxRows }).map((_, i) => {
                  const sA = sentencesA[i];
                  const sB = sentencesB[i];
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-2 gap-0 ${i < maxRows - 1 ? 'border-b border-card-border/50' : ''}`}
                    >
                      <SentenceCell sentence={sA} />
                      <SentenceCell sentence={sB} borderLeft />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Individual sentence breakdowns (details) */}
          <div className="grid grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.30s' }}>
            <SentenceBreakdown label="Draft A details" sentences={sentencesA} />
            <SentenceBreakdown label="Draft B details" sentences={sentencesB} />
          </div>

          {/* 7. Restoration plan */}
          {restorationPlan.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <h3 className="text-sm font-bold text-ink-text mb-4 uppercase tracking-wide">
                Suggested restoration plan
              </h3>
              <div className="card-panel bg-signal-cyan/[0.03]">
                <p className="text-xs text-slate-text/60 mb-3">
                  To bring Draft {scoreA >= scoreB ? 'A' : 'B'} closer to your voice:
                </p>
                <ul className="space-y-2.5">
                  {restorationPlan.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ink-text/80">
                      <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-signal-cyan/20 text-signal-cyan flex items-center justify-center text-[0.6rem] font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function TraitBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  const pct = Math.round(Math.max(Math.min(value, 1), 0) * 100);
  const color =
    pct >= 70 ? 'bg-signal-cyan' : pct >= 40 ? 'bg-brass' : 'bg-alert-coral';
  const textColor =
    pct >= 70 ? 'text-signal-cyan' : pct >= 40 ? 'text-brass' : 'text-alert-coral';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.6rem] font-bold text-slate-text/40 w-3 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-ink-text/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[0.6rem] font-semibold ${textColor} w-8 text-right shrink-0`}>{pct}%</span>
      <span className="text-[0.55rem] text-slate-text/40 truncate hidden sm:inline">{detail}</span>
    </div>
  );
}

function SentenceCell({ sentence, borderLeft }: { sentence?: SentenceScore; borderLeft?: boolean }) {
  if (!sentence) {
    return (
      <div className={`px-4 py-3 ${borderLeft ? 'border-l border-card-border' : ''}`}>
        <span className="text-xs text-slate-text/30 italic">&mdash;</span>
      </div>
    );
  }

  const bg =
    sentence.status === 'aligned'
      ? 'bg-signal-cyan/[0.04]'
      : sentence.status === 'slight-drift'
        ? 'bg-brass/[0.04]'
        : 'bg-alert-coral/[0.04]';

  const dot =
    sentence.status === 'aligned'
      ? 'bg-signal-cyan'
      : sentence.status === 'slight-drift'
        ? 'bg-brass'
        : 'bg-alert-coral';

  return (
    <div className={`px-4 py-3 ${bg} ${borderLeft ? 'border-l border-card-border' : ''}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full ${dot} shrink-0`} />
        <div className="min-w-0">
          <p className="text-xs text-ink-text/80 leading-relaxed">{sentence.text}</p>
          {sentence.reasons.length > 0 && (
            <p className="text-[0.6rem] text-slate-text/40 mt-1">
              {sentence.reasons.map((r) => r.label).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SentenceBreakdown({ label, sentences }: { label: string; sentences: SentenceScore[] }) {
  if (sentences.length === 0) return null;

  const aligned = sentences.filter((s) => s.status === 'aligned').length;
  const slight = sentences.filter((s) => s.status === 'slight-drift').length;
  const heavy = sentences.filter((s) => s.status === 'heavy-drift').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-text/60">{label}</span>
        <div className="flex gap-3 text-xs">
          {aligned > 0 && <span className="text-signal-cyan">{aligned} aligned</span>}
          {slight > 0 && <span className="text-brass">{slight} slight</span>}
          {heavy > 0 && <span className="text-alert-coral">{heavy} heavy</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {sentences.map((s, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-xl text-xs ${
              s.status === 'aligned'
                ? 'drift-aligned'
                : s.status === 'slight-drift'
                  ? 'drift-slight'
                  : 'drift-heavy'
            }`}
          >
            <p className="text-ink-text/80">{s.text}</p>
            {s.reasons.length > 0 && (
              <p className="text-slate-text/50 mt-1 text-[0.65rem]">
                {s.reasons.map((r) => r.label).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
