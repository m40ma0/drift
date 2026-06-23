import { useRef, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { Heading, getProfileSummary } from '@/lib/headings';
import { computeVoiceArchetype, VoiceArchetype } from '@/lib/stylometry';

interface VoiceDNATabProps {
  activeHeading: Heading | null;
}

/* ------------------------------------------------------------------ */
/*  Small helper components                                           */
/* ------------------------------------------------------------------ */

function FormalityBar({ level }: { level: string }) {
  const levels = ['Very casual', 'Casual', 'Semi-formal', 'Formal'];
  const idx = levels.indexOf(level);
  const position = idx === -1 ? 50 : (idx / (levels.length - 1)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-slate-text/60">
        <span>Casual</span>
        <span>Formal</span>
      </div>
      <div className="relative h-2 rounded-full bg-warm-bg overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(position, 8)}%`,
            background: `linear-gradient(90deg, var(--hex-cyan), var(--hex-brass))`,
          }}
        />
        {/* marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
          style={{
            left: `${position}%`,
            transform: `translate(-50%, -50%)`,
            backgroundColor: 'var(--hex-card)',
            borderColor: 'var(--hex-brass)',
          }}
        />
      </div>
      <p className="text-xs font-medium text-brass text-center">{level}</p>
    </div>
  );
}

function ConfidenceMeter({ confidence, sampleCount }: { confidence: number; sampleCount: number }) {
  const color =
    confidence >= 85 ? 'var(--hex-cyan)' :
    confidence >= 60 ? 'var(--hex-brass)' :
    'var(--hex-coral)';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--hex-border)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${confidence} ${100 - confidence}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {confidence}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-text">
          {confidence >= 85 ? 'High' : confidence >= 60 ? 'Moderate' : 'Low'} confidence
        </p>
        <p className="text-xs text-slate-text">
          Based on {sampleCount} sample{sampleCount !== 1 ? 's' : ''}.{' '}
          {sampleCount < 5 && 'Add more for a sharper read.'}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function VoiceDNATab({ activeHeading }: VoiceDNATabProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const archetype: VoiceArchetype | null = useMemo(() => {
    if (!activeHeading) return null;
    return computeVoiceArchetype(activeHeading.profile, activeHeading.samples.length);
  }, [activeHeading]);

  if (!activeHeading || !archetype) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
        <div className="w-20 h-20 rounded-lg bg-warm-bg flex items-center justify-center">
          <span className="text-3xl">&#127912;</span>
        </div>
        <p className="text-ink-text text-lg font-medium">Create a voice profile to see your DNA</p>
        <p className="text-slate-text text-sm">Your unique writing fingerprint, visualized</p>
      </div>
    );
  }

  const profile = activeHeading.profile;
  const summary = getProfileSummary(profile);
  const sampleCount = activeHeading.samples.length;

  /* ------ export handlers ------ */

  const handleExport = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { width: 640, height: 520, pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `drift-dna-${activeHeading.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleCopy = async () => {
    const text = [
      `Voice DNA: ${activeHeading.name}`,
      `Archetype: ${archetype.name} — ${archetype.description}`,
      '',
      `Rhythm: ${archetype.rhythmSignature}`,
      `Punctuation: ${archetype.punctuationSignature}`,
      `Vocabulary: ${archetype.vocabularySignature}`,
      `Formality: ${archetype.formalityLevel}`,
      '',
      ...summary.map((s) => `- ${s}`),
      '',
      ...(archetype.doNotFlatten.length > 0
        ? ['Do NOT flatten:', ...archetype.doNotFlatten.map((d) => `  * ${d}`), '']
        : []),
      `Confidence: ${archetype.confidence}% (${sampleCount} samples)`,
      '',
      'Generated by Drift — your voice, unflattened',
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  /* ------ helpers for the shareable card ------ */

  const confidenceLabel =
    archetype.confidence >= 85 ? 'High' :
    archetype.confidence >= 60 ? 'Moderate' :
    'Low';

  const confidenceCardColor =
    archetype.confidence >= 85 ? '#4FD8C4' :
    archetype.confidence >= 60 ? '#B8863A' :
    '#C4574A';

  /* ------ punctuation stats ------ */

  const punctStats = [
    { label: 'Em-dashes', value: profile.punctuation.emDashes },
    { label: 'Commas', value: profile.punctuation.commas },
    { label: 'Exclamations', value: profile.punctuation.exclamationPoints },
    { label: 'Questions', value: profile.punctuation.questionMarks },
    { label: 'Semicolons', value: profile.punctuation.semicolons },
    { label: 'Ellipses', value: profile.punctuation.ellipses },
  ].filter((s) => s.value > 0);

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-8 tab-content-enter">

      {/* ============================================================ */}
      {/*  1. Voice Archetype                                          */}
      {/* ============================================================ */}
      <section className="text-center animate-fade-in">
        <p className="text-xs font-medium tracking-widest text-signal-cyan mb-2">
          Voice Archetype
        </p>
        <h2 className="text-3xl font-bold text-brass">{archetype.name}</h2>
        <p className="text-sm text-slate-text mt-2 max-w-md mx-auto leading-relaxed">
          {archetype.description}
        </p>
      </section>

      {/* ============================================================ */}
      {/*  2. Signature sections                                       */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">

        {/* --- Rhythm Signature --- */}
        <div className="card-panel space-y-3">
          <h3 className="text-xs font-semibold text-brass">Rhythm Signature</h3>
          <p className="text-sm text-slate-text leading-relaxed">{archetype.rhythmSignature}</p>
          <div className="flex items-end gap-1 h-8">
            {/* mini bar chart: sentence length visualisation */}
            {Array.from({ length: 12 }).map((_, i) => {
              const base = profile.sentenceLength.mean;
              const wave = Math.sin(i * 0.8) * profile.sentenceLength.stdDev;
              const h = Math.max(4, Math.min(32, ((base + wave) / 30) * 32));
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}px`,
                    backgroundColor: 'var(--hex-cyan)',
                    opacity: 0.3 + (h / 32) * 0.7,
                  }}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-text/60">
            Avg {Math.round(profile.sentenceLength.mean)} words/sentence
            {' '}&middot;{' '}
            &sigma; {profile.sentenceLength.stdDev.toFixed(1)}
          </p>
        </div>

        {/* --- Punctuation Signature --- */}
        <div className="card-panel space-y-3">
          <h3 className="text-xs font-semibold text-brass">Punctuation Signature</h3>
          <p className="text-sm text-slate-text leading-relaxed">{archetype.punctuationSignature}</p>
          <div className="space-y-1.5">
            {punctStats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-text/60 w-20 text-right">{stat.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-warm-bg overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(stat.value * 5, 100)}%`,
                      backgroundColor: 'var(--hex-brass)',
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-text/50 w-8">{stat.value.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-text/40">per 100 words</p>
        </div>

        {/* --- Vocabulary Signature --- */}
        <div className="card-panel space-y-3">
          <h3 className="text-xs font-semibold text-brass">Vocabulary Signature</h3>
          <p className="text-sm text-slate-text leading-relaxed">{archetype.vocabularySignature}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-bold text-signal-cyan">
                {Math.round(profile.contractionRate * 100)}%
              </p>
              <p className="text-[10px] text-slate-text/60">Contraction rate</p>
            </div>
            <div>
              <p className="text-lg font-bold text-signal-cyan">
                {Math.round(profile.lexicalDiversity.mean * 100)}%
              </p>
              <p className="text-[10px] text-slate-text/60">Vocabulary diversity</p>
            </div>
          </div>
        </div>

        {/* --- Formality Level --- */}
        <div className="card-panel space-y-3">
          <h3 className="text-xs font-semibold text-brass">Formality Level</h3>
          <FormalityBar level={archetype.formalityLevel} />
          <p className="text-xs text-slate-text/60 leading-relaxed">
            {archetype.formalityLevel === 'Very casual'
              ? 'You write the way you talk. Loose, direct, human.'
              : archetype.formalityLevel === 'Casual'
              ? 'Relaxed but structured. Contractions welcome.'
              : archetype.formalityLevel === 'Formal'
              ? 'Deliberate, precise, no shortcuts.'
              : 'A natural blend of polish and personality.'}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  3. Do Not Flatten                                           */}
      {/* ============================================================ */}
      {archetype.doNotFlatten.length > 0 && (
        <section
          className="animate-fade-in rounded-md border-2 p-5 space-y-3"
          style={{
            animationDelay: '0.1s',
            borderColor: 'var(--hex-coral)',
            backgroundColor: 'color-mix(in srgb, var(--hex-coral) 4%, var(--hex-card))',
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hex-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h3 className="text-sm font-bold text-alert-coral">
              Do Not Flatten
            </h3>
          </div>
          <p className="text-xs text-slate-text/70">
            These are the traits that make your voice yours. AI tools will try to sand them down. Don't let them.
          </p>
          <ul className="space-y-2">
            {archetype.doNotFlatten.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--hex-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                <span className="text-sm text-ink-text leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============================================================ */}
      {/*  4. Confidence                                               */}
      {/* ============================================================ */}
      <section className="card-panel animate-fade-in">
        <ConfidenceMeter confidence={archetype.confidence} sampleCount={sampleCount} />
      </section>

      {/* ============================================================ */}
      {/*  5. Signature Phrases                                        */}
      {/* ============================================================ */}
      {profile.topPhrases && profile.topPhrases.length > 0 && (
        <section className="card-panel animate-fade-in space-y-3">
          <h3 className="text-xs font-semibold text-brass">
            Signature Phrases
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.topPhrases.slice(0, 8).map((phrase, i) => (
              <span
                key={i}
                className="inline-block px-3 py-1 rounded-full text-sm border"
                style={{
                  borderColor: 'var(--hex-border)',
                  backgroundColor: 'var(--hex-card)',
                  color: 'var(--hex-ink-text)',
                }}
              >
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  8. Profile Traits (getProfileSummary)                       */}
      {/* ============================================================ */}
      <section className="animate-fade-in space-y-3">
        <h3 className="text-xs font-semibold text-brass text-center">
          Voice Traits
        </h3>
        <div className="space-y-2">
          {summary.map((bullet, i) => (
            <div key={i} className="card-panel flex items-start gap-3">
              <span className="text-brass mt-0.5 text-xs">&#9679;</span>
              <p className="text-sm text-slate-text leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. Raw Stats Grid                                           */}
      {/* ============================================================ */}
      <section className="animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Sentences', value: String(profile.sentenceCount || '--') },
            { label: 'Paragraphs', value: String(profile.paragraphCount || '--') },
            { label: 'AI Cliches', value: String(profile.aiClicheCount || 0) },
            { label: 'Samples', value: String(sampleCount) },
          ].map((stat, i) => (
            <div key={i} className="card-panel text-center">
              <p className="text-lg font-bold text-brass">{stat.value}</p>
              <p className="text-xs text-slate-text/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. Shareable DNA Card                                       */}
      {/* ============================================================ */}
      <section className="animate-fade-in">
        <div
          ref={cardRef}
          className="w-full rounded-lg p-8 flex flex-col gap-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #141820 50%, #1a1f2e 100%)' }}
        >
          {/* decorative bg element */}
          <div className="absolute top-4 right-4 opacity-10">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#B8863A" strokeWidth="1" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#2D9F83" strokeWidth="0.5" />
              <polygon points="50,10 47,50 50,48 53,50" fill="#B8863A" opacity="0.5" />
              <polygon points="50,90 47,50 50,52 53,50" fill="#2D9F83" opacity="0.5" />
              <circle cx="50" cy="50" r="3" fill="#F9F7F4" />
            </svg>
          </div>

          {/* header: archetype + name */}
          <div>
            <p className="text-[10px] font-medium text-[#4FD8C4]/60 tracking-widest mb-1">
              Voice DNA
            </p>
            <h3 className="text-2xl font-bold text-[#B8863A] mb-0.5">{activeHeading.name}</h3>
            <p className="text-sm font-medium text-[#C9D3DC]/80">{archetype.name}</p>
            <p className="text-xs text-[#C9D3DC]/40 mt-1">{archetype.description}</p>
          </div>

          {/* signatures row */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] text-[#C9D3DC]/40">Rhythm</p>
              <p className="text-xs text-[#C9D3DC]/80 leading-snug mt-0.5">
                {Math.round(profile.sentenceLength.mean)} words avg &middot; &sigma;{profile.sentenceLength.stdDev.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#C9D3DC]/40">Punctuation</p>
              <p className="text-xs text-[#C9D3DC]/80 leading-snug mt-0.5">
                {profile.punctuation.emDashes > 3
                  ? `${profile.punctuation.emDashes.toFixed(1)} em-dashes/100w`
                  : profile.punctuation.exclamationPoints > 5
                  ? `${profile.punctuation.exclamationPoints.toFixed(1)} !/100w`
                  : 'Standard'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#C9D3DC]/40">Vocabulary</p>
              <p className="text-xs text-[#C9D3DC]/80 leading-snug mt-0.5">
                {Math.round(profile.contractionRate * 100)}% contractions &middot; {Math.round(profile.lexicalDiversity.mean * 100)}% diverse
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#C9D3DC]/40">Formality</p>
              <p className="text-xs text-[#C9D3DC]/80 leading-snug mt-0.5">{archetype.formalityLevel}</p>
            </div>
          </div>

          {/* top phrases */}
          {profile.topPhrases && profile.topPhrases.length > 0 && (
            <div>
              <p className="text-[10px] text-[#C9D3DC]/30 mb-1">Signature phrases</p>
              <p className="text-xs text-[#B8863A]/80">
                {profile.topPhrases.slice(0, 4).map((p) => `“${p}”`).join('  ·  ')}
              </p>
            </div>
          )}

          {/* do not flatten on card */}
          {archetype.doNotFlatten.length > 0 && (
            <div>
              <p className="text-[10px] text-[#C4574A]/70 mb-1">
                &#9888; Do not flatten
              </p>
              <p className="text-xs text-[#C9D3DC]/50 leading-relaxed">
                {archetype.doNotFlatten.slice(0, 2).join(' · ')}
              </p>
            </div>
          )}

          {/* footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#C9D3DC]/10">
            <p className="text-[10px] text-[#C9D3DC]/30">drift — your voice, unflattened</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: confidenceCardColor }}>
                {confidenceLabel} confidence ({archetype.confidence}%)
              </span>
              <span className="text-[10px] text-[#C9D3DC]/20">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-4">
          <button onClick={handleExport} className="btn-primary">Export as PNG</button>
          <button onClick={handleCopy} className="btn-secondary">Copy as text</button>
        </div>
      </section>
    </div>
  );
}
