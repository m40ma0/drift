import { useState } from 'react';
import { Heading, createHeading, getProfileSummary, saveHeading } from '@/lib/headings';
import { StylemetricProfile, buildProfile, runVoiceCalibration, CalibrationResult, computeVoiceArchetype } from '@/lib/stylometry';
import { demoCasualHeading, ALL_DEMO_HEADINGS } from '@/lib/demoData';

interface VoiceProfileTabProps {
  activeHeading: Heading | null;
  onProfileCreated: () => void;
  onLoadDemo: () => void;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ConfidenceMeter({ sampleCount }: { sampleCount: number }) {
  const level = sampleCount >= 5 ? 'high' : sampleCount >= 3 ? 'moderate' : 'low';
  const percentage = sampleCount >= 5 ? 90 : sampleCount >= 3 ? 60 : 30;
  const colorClass = level === 'high' ? 'bg-signal-cyan' : level === 'moderate' ? 'bg-brass' : 'bg-alert-coral';
  const label = level === 'high'
    ? 'High confidence'
    : level === 'moderate'
      ? 'Moderate confidence'
      : 'Low confidence';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-text/60">Profile confidence</span>
        <span className="text-xs font-medium text-slate-text">{label}</span>
      </div>
      <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-text/40">
        {sampleCount < 3
          ? 'Add more samples for a usable profile'
          : sampleCount < 5
            ? 'Good start — 5+ samples will sharpen the read'
            : `${sampleCount} samples — strong foundation`}
      </p>
    </div>
  );
}

function CalibrationPanel({ samples }: { samples: string[] }) {
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setResult(null);
    // Small timeout so the UI shows the running state
    setTimeout(() => {
      const r = runVoiceCalibration(samples);
      setResult(r);
      setRunning(false);
    }, 600);
  };

  return (
    <div className="card-panel space-y-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-ink-text">Voice Calibration</h4>
          <p className="text-xs text-slate-text/60 mt-0.5">
            Hold back one sample as a blind test — can the fingerprint recognize it?
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running || samples.length < 3}
          className="btn-secondary text-xs disabled:opacity-50"
        >
          {running ? 'Testing...' : result ? 'Run Again' : 'Run Calibration'}
        </button>
      </div>

      {running && (
        <div className="flex items-center gap-2 py-3 animate-fade-in">
          <div className="w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-text">Holding back a sample and testing the fingerprint...</span>
        </div>
      )}

      {result && !running && (
        <div className="space-y-3 animate-fade-in">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
            result.recognized
              ? 'bg-signal-cyan/10 border border-signal-cyan/20'
              : 'bg-alert-coral/10 border border-alert-coral/20'
          }`}>
            <span className="text-lg">{result.recognized ? '✓' : '✗'}</span>
            <div>
              <p className={`text-sm font-medium ${result.recognized ? 'text-signal-cyan' : 'text-alert-coral'}`}>
                {result.recognized ? 'Recognized' : 'Not Recognized'}
              </p>
              <p className="text-xs text-slate-text/60">
                Drift held back one of your samples as a blind test. Drift score: {result.score}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-text">{result.explanation}</p>
          <div className="border-t border-card-border pt-2">
            <p className="text-xs text-slate-text/40 mb-1">Held-back sample</p>
            <p className="text-xs text-slate-text/60 line-clamp-2 italic">"{result.heldBackSample}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoProfilePicker({ onSelect }: { onSelect: (heading: Heading) => void }) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleSelect = async (heading: Heading) => {
    setSaving(heading.id);
    try {
      await saveHeading(heading);
      onSelect(heading);
    } catch {
      // silent — parent handles refresh
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink-text">Or start from a demo voice</h3>
        <p className="text-xs text-slate-text/60 mt-0.5">Pick one to see how Drift works before building your own.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_DEMO_HEADINGS.map((heading) => (
          <button
            key={heading.id}
            onClick={() => handleSelect(heading)}
            disabled={saving !== null}
            className="card-panel text-left hover:border-brass/40 transition-colors group disabled:opacity-50"
          >
            <h4 className="text-sm font-semibold text-ink-text group-hover:text-brass transition-colors">
              {heading.name}
            </h4>
            <p className="text-xs text-slate-text/60 mt-1 line-clamp-2">{heading.description}</p>
            <p className="text-xs text-slate-text/40 mt-2">
              {heading.samples.length} sample{heading.samples.length !== 1 ? 's' : ''}
            </p>
            {saving === heading.id && (
              <span className="text-xs text-brass mt-1 block">Loading...</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VoiceProfileTab({ activeHeading, onProfileCreated, onLoadDemo }: VoiceProfileTabProps) {
  const [samples, setSamples] = useState<string[]>(['', '', '']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [previewProfile, setPreviewProfile] = useState<StylemetricProfile | null>(null);
  const [step, setStep] = useState<'samples' | 'preview' | 'name'>('samples');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSampleChange = (index: number, value: string) => {
    const newSamples = [...samples];
    newSamples[index] = value;
    setSamples(newSamples);
  };

  const handleLoadDemoSamples = () => {
    setSamples([...demoCasualHeading.samples]);
    setName('Casual Posts');
    setDescription('Short, punchy social writing');
  };

  const handleBuildFingerprint = async () => {
    setError('');
    const nonEmpty = samples.filter(s => s.trim().length > 0);
    if (nonEmpty.length < 3) { setError('Paste at least 3 writing samples'); return; }
    setLoading(true);
    try {
      const profile = buildProfile(nonEmpty);
      setPreviewProfile(profile);
      setStep('preview');
    } catch { setError('Error analyzing samples. Try again.'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Give this profile a name'); return; }
    if (!description.trim()) { setError('Describe what this voice is for'); return; }
    setLoading(true);
    try {
      const nonEmpty = samples.filter(s => s.trim().length > 0);
      await createHeading(name, description, nonEmpty);
      onProfileCreated();
      setSamples(['', '', '']); setName(''); setDescription(''); setPreviewProfile(null); setStep('samples');
    } catch { setError('Error saving. Try again.'); } finally { setLoading(false); }
  };

  const handleDemoSelect = () => {
    onProfileCreated();
  };

  const profile = activeHeading?.profile;
  const summary = activeHeading ? getProfileSummary(activeHeading.profile) : [];
  const sampleCount = activeHeading?.samples.length || 0;
  const archetype = profile ? computeVoiceArchetype(profile, sampleCount) : null;

  // Preview archetype for the build flow
  const nonEmptySamples = samples.filter(s => s.trim().length > 0);
  const previewArchetype = previewProfile ? computeVoiceArchetype(previewProfile, nonEmptySamples.length) : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 tab-content-enter">
      {profile && activeHeading ? (
        <>
          {/* Active profile header */}
          <div className="flex items-start justify-between animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-ink-text">{activeHeading.name}</h2>
              <p className="text-sm text-slate-text mt-1">{activeHeading.description}</p>
              {archetype && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-brass">{archetype.name}</span>
                  <span className="text-xs text-slate-text/40">&mdash;</span>
                  <span className="text-xs text-slate-text/60">{archetype.description}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-signal-cyan/10 rounded-xl">
              <span className="text-xs text-signal-cyan font-medium">
                Based on {sampleCount} sample{sampleCount !== 1 ? 's' : ''}
              </span>
              {sampleCount < 5 && (
                <span className="text-xs text-slate-text/50"> — add more for a sharper read</span>
              )}
            </div>
          </div>

          {/* Confidence meter */}
          <div className="card-panel animate-fade-in" style={{ animationDelay: '0.03s' }}>
            <ConfidenceMeter sampleCount={sampleCount} />
          </div>

          {/* Voice summary */}
          <div className="card-panel animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <h3 className="text-sm font-semibold text-ink-text mb-3">Your voice, in a nutshell</h3>
            <div className="space-y-2.5">
              {summary.map((bullet, i) => (
                <p key={i} className="text-sm text-slate-text flex items-start gap-2.5">
                  <span className="text-brass mt-0.5 text-xs">&#9679;</span> {bullet}
                </p>
              ))}
            </div>
          </div>

          {/* Do Not Flatten */}
          {archetype && archetype.doNotFlatten.length > 0 && (
            <div className="card-panel animate-fade-in border-brass/20" style={{ animationDelay: '0.08s' }}>
              <h3 className="text-sm font-semibold text-ink-text mb-1">Do not flatten</h3>
              <p className="text-xs text-slate-text/50 mb-3">
                These traits define your voice. AI rewrites tend to erase them.
              </p>
              <div className="space-y-2">
                {archetype.doNotFlatten.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-alert-coral text-xs mt-0.5">&#9632;</span>
                    <p className="text-sm text-slate-text">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fingerprint cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Sentence Rhythm', stats: [
                { label: 'Average length', value: `${Math.round(profile.sentenceLength.mean)} words` },
                { label: 'Variation', value: profile.sentenceLength.stdDev > 8 ? 'Wide swings' : profile.sentenceLength.stdDev < 3 ? 'Very consistent' : 'Natural' },
              ]},
              { title: 'Punctuation', stats: [
                { label: 'Em-dashes', value: `${profile.punctuation.emDashes.toFixed(1)} per 100 words` },
                { label: 'Exclamations', value: `${profile.punctuation.exclamationPoints.toFixed(1)} per 100 words` },
                { label: 'Questions', value: `${profile.punctuation.questionMarks.toFixed(1)} per 100 words` },
              ]},
              { title: 'Vocabulary', stats: [
                { label: 'Diversity', value: `${Math.round(profile.lexicalDiversity.mean * 100)}%` },
                { label: 'Contractions', value: `${Math.round(profile.contractionRate * 100)}% of the time` },
              ]},
              { title: 'Common Phrases', stats: (profile.topPhrases || []).slice(0, 4).map(p => ({ label: '', value: `"${p}"` })) },
              { title: 'Filler Words', stats: [
                { label: 'Frequency', value: `${profile.fillerWords.frequency.toFixed(1)} per 100 words` },
                { label: 'Style', value: profile.fillerWords.frequency > 5 ? 'Frequent — part of your voice' : profile.fillerWords.frequency > 2 ? 'Moderate' : 'Minimal' },
              ]},
              { title: 'Paragraph Rhythm', stats: [
                { label: 'Average length', value: `${Math.round(profile.paragraphLength.mean)} words` },
                { label: 'AI cliches found', value: `${profile.aiClicheCount || 0}` },
              ]},
            ].map((card, i) => (
              <div key={i} className="card-panel animate-fade-in" style={{ animationDelay: `${0.05 * (i + 1)}s`, animationFillMode: 'both' }}>
                <h4 className="text-xs font-semibold text-ink-text/70 mb-3">{card.title}</h4>
                <div className="space-y-2">
                  {card.stats.map((stat, j) => (
                    <div key={j} className="flex items-center justify-between">
                      {stat.label && <span className="text-xs text-slate-text/60">{stat.label}</span>}
                      <span className={`text-sm text-ink-text ${!stat.label ? 'w-full' : ''}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Voice calibration */}
          <CalibrationPanel samples={activeHeading.samples} />

          {/* Samples */}
          <div className="border-t border-card-border pt-6">
            <h3 className="text-sm font-semibold text-ink-text mb-3">Writing samples</h3>
            <div className="space-y-3">
              {activeHeading.samples.map((sample, i) => (
                <div key={i} className="card-panel">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-text/40">Sample {i + 1}</p>
                    <p className="text-xs text-slate-text/30">{wordCount(sample)} words</p>
                  </div>
                  <p className="text-sm text-slate-text line-clamp-3">{sample}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-warm-bg flex items-center justify-center">
              <span className="text-3xl">&#128172;</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-text mb-2">No voice profile yet</h2>
              <p className="text-sm text-slate-text max-w-md mx-auto">
                A voice profile is your writing fingerprint — built from samples of your real writing.
                Drift uses it to spot where AI drafts don't sound like you.
              </p>
            </div>
          </div>

          {/* Demo profile picker grid */}
          <DemoProfilePicker onSelect={handleDemoSelect} />
        </div>
      )}

      {/* Create new profile */}
      <div className="border-t border-card-border pt-8">
        <h3 className="text-lg font-bold text-ink-text mb-4">
          {activeHeading ? 'Create another profile' : 'Build your voice profile'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-alert-coral/5 border border-alert-coral/20 text-alert-coral text-sm rounded-xl animate-fade-in">
            {error}
          </div>
        )}

        {step === 'samples' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-text">Paste 3 or more examples of your real writing.</p>
              <button onClick={handleLoadDemoSamples} className="btn-ghost text-xs">Load demo samples</button>
            </div>

            {/* Confidence meter for in-progress creation */}
            <ConfidenceMeter sampleCount={nonEmptySamples.length} />

            {samples.map((sample, i) => {
              const chars = sample.trim().length;
              const words = wordCount(sample);
              const tooShort = chars > 0 && chars < 50;
              return (
                <div key={i}>
                  <label className="text-xs font-medium text-slate-text/50">Sample {i + 1}</label>
                  <textarea value={sample} onChange={(e) => handleSampleChange(i, e.target.value)}
                    placeholder="Paste your writing here..."
                    className={`w-full h-24 mt-1 p-3 bg-chart-paper text-ink-text text-sm border rounded-xl focus:outline-none focus:border-brass resize-none ${
                      tooShort ? 'border-brass/50' : 'border-card-border'
                    }`} />
                  <div className="flex items-center justify-between mt-1">
                    {tooShort ? (
                      <p className="text-xs text-brass">
                        This sample is quite short — longer samples give better results
                      </p>
                    ) : (
                      <span />
                    )}
                    {chars > 0 && (
                      <p className="text-xs text-slate-text/30">{words} word{words !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3">
              {samples.length < 10 && (
                <button onClick={() => setSamples([...samples, ''])} className="btn-ghost text-xs">+ Add another</button>
              )}
              {samples.length > 3 && (
                <button onClick={() => setSamples(samples.slice(0, -1))} className="text-xs text-alert-coral/60 hover:text-alert-coral">- Remove last</button>
              )}
            </div>
            <button onClick={handleBuildFingerprint} disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Build voice fingerprint'}
            </button>
          </div>
        )}

        {step === 'preview' && previewProfile && (
          <div className="space-y-4 animate-fade-in">
            {/* Voice archetype */}
            {previewArchetype && (
              <div className="card-panel border-brass/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg text-brass font-bold">{previewArchetype.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-brass/10 text-brass rounded-full">
                    {previewArchetype.formalityLevel}
                  </span>
                </div>
                <p className="text-sm text-slate-text mb-3">{previewArchetype.description}</p>
                {previewArchetype.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previewArchetype.traits.map((trait, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-warm-bg text-slate-text rounded-lg">
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile summary bullets */}
            <div className="card-panel space-y-2">
              <h4 className="text-xs font-semibold text-ink-text/70 mb-2">Fingerprint summary</h4>
              {getProfileSummary(previewProfile).map((bullet, i) => (
                <p key={i} className="text-sm text-slate-text">
                  <span className="text-brass mr-2">&#9679;</span>{bullet}
                </p>
              ))}
            </div>

            {/* Do not flatten preview */}
            {previewArchetype && previewArchetype.doNotFlatten.length > 0 && (
              <div className="card-panel border-alert-coral/10">
                <h4 className="text-xs font-semibold text-ink-text/70 mb-2">Traits AI will try to erase</h4>
                <div className="space-y-1.5">
                  {previewArchetype.doNotFlatten.map((item, i) => (
                    <p key={i} className="text-xs text-slate-text flex items-start gap-2">
                      <span className="text-alert-coral mt-0.5">&#9632;</span> {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            <div className="card-panel">
              <ConfidenceMeter sampleCount={nonEmptySamples.length} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('samples')} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep('name')} className="btn-primary flex-1">Looks right</button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-xs font-medium text-slate-text/50">Profile name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Casual Posts, YouTube Scripts"
                className="w-full mt-1 px-3 py-2 bg-chart-paper text-ink-text border border-card-border rounded-xl focus:outline-none focus:border-brass" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-text/50">What's this voice for?</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Short social media posts"
                className="w-full mt-1 px-3 py-2 bg-chart-paper text-ink-text border border-card-border rounded-xl focus:outline-none focus:border-brass" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('preview')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save this voice'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
