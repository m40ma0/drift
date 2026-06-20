import { useState } from 'react';
import { Heading, createHeading, getProfileSummary } from '@/lib/headings';
import { StylemetricProfile, buildProfile } from '@/lib/stylometry';
import { demoPunchydHeading } from '@/lib/demoData';

interface VoiceProfileTabProps {
  activeHeading: Heading | null;
  onProfileCreated: () => void;
  onLoadDemo: () => void;
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
    setSamples([...demoPunchydHeading.samples]);
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

  const profile = activeHeading?.profile;
  const summary = activeHeading ? getProfileSummary(activeHeading.profile) : [];
  const sampleCount = activeHeading?.samples.length || 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 tab-content-enter">
      {profile && activeHeading ? (
        <>
          {/* Active profile header */}
          <div className="flex items-start justify-between animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-ink-text">{activeHeading.name}</h2>
              <p className="text-sm text-slate-text mt-1">{activeHeading.description}</p>
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

          {/* Samples */}
          <div className="border-t border-card-border pt-6">
            <h3 className="text-sm font-semibold text-ink-text mb-3">Writing samples</h3>
            <div className="space-y-3">
              {activeHeading.samples.map((sample, i) => (
                <div key={i} className="card-panel">
                  <p className="text-xs text-slate-text/40 mb-1">Sample {i + 1}</p>
                  <p className="text-sm text-slate-text line-clamp-3">{sample}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 space-y-6 animate-fade-in">
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
          <button onClick={onLoadDemo} className="btn-primary">Try with demo samples</button>
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
            {samples.map((sample, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-slate-text/50">Sample {i + 1}</label>
                <textarea value={sample} onChange={(e) => handleSampleChange(i, e.target.value)}
                  placeholder="Paste your writing here..."
                  className="w-full h-24 mt-1 p-3 bg-chart-paper text-ink-text text-sm border border-card-border rounded-xl focus:outline-none focus:border-brass resize-none" />
              </div>
            ))}
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
            <div className="card-panel space-y-2">
              {getProfileSummary(previewProfile).map((bullet, i) => (
                <p key={i} className="text-sm text-slate-text">
                  <span className="text-brass mr-2">&#9679;</span>{bullet}
                </p>
              ))}
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
