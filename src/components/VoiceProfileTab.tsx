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
    setName('Twitter');
    setDescription('Short-form social posts');
  };

  const handleBuildFingerprint = async () => {
    setError('');
    const nonEmpty = samples.filter(s => s.trim().length > 0);
    if (nonEmpty.length < 3) {
      setError('Paste at least 3 writing samples');
      return;
    }
    setLoading(true);
    try {
      const profile = buildProfile(nonEmpty);
      setPreviewProfile(profile);
      setStep('preview');
    } catch {
      setError('Error analyzing samples. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Give this profile a name'); return; }
    if (!description.trim()) { setError('Describe what this voice is for'); return; }
    setLoading(true);
    try {
      const nonEmpty = samples.filter(s => s.trim().length > 0);
      await createHeading(name, description, nonEmpty);
      onProfileCreated();
      setSamples(['', '', '']);
      setName('');
      setDescription('');
      setPreviewProfile(null);
      setStep('samples');
    } catch {
      setError('Error saving profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const profile = activeHeading?.profile;
  const summary = activeHeading ? getProfileSummary(activeHeading.profile) : [];
  const sampleCount = activeHeading?.samples.length || 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-8">
      {/* Active profile display */}
      {profile && activeHeading ? (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-fraunces font-bold text-slate-text">{activeHeading.name}</h2>
              <p className="text-sm text-slate-text/50 font-mono mt-1">{activeHeading.description}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-signal-cyan/10 border border-signal-cyan/20 rounded">
              <span className="text-xs font-mono text-signal-cyan">
                Based on {sampleCount} sample{sampleCount !== 1 ? 's' : ''}
              </span>
              {sampleCount < 5 && (
                <span className="text-xs font-mono text-slate-text/40">
                  — add more for a sharper read
                </span>
              )}
            </div>
          </div>

          {/* Voice summary */}
          <div className="card-panel">
            <h3 className="text-xs font-mono text-slate-text/50 uppercase tracking-wider mb-3">Voice Summary</h3>
            <div className="space-y-2">
              {summary.map((bullet, i) => (
                <p key={i} className="text-sm text-slate-text/80 font-spectral flex items-start gap-2">
                  <span className="text-brass mt-0.5">&#9670;</span> {bullet}
                </p>
              ))}
            </div>
          </div>

          {/* Fingerprint cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FingerprintCard
              title="Sentence Rhythm"
              icon="~"
              stats={[
                { label: 'Avg length', value: `${Math.round(profile.sentenceLength.mean)} words` },
                { label: 'Variation', value: profile.sentenceLength.stdDev > 8 ? 'Wide swings' : profile.sentenceLength.stdDev < 3 ? 'Very consistent' : 'Natural' },
                { label: 'Total counted', value: `${profile.sentenceCount} sentences` },
              ]}
            />
            <FingerprintCard
              title="Punctuation Habits"
              icon="."
              stats={[
                { label: 'Em-dashes', value: `${profile.punctuation.emDashes.toFixed(1)} / 100w` },
                { label: 'Exclamations', value: `${profile.punctuation.exclamationPoints.toFixed(1)} / 100w` },
                { label: 'Questions', value: `${profile.punctuation.questionMarks.toFixed(1)} / 100w` },
                { label: 'Commas', value: `${(profile.punctuation.commas || 0).toFixed(1)} / 100w` },
              ]}
            />
            <FingerprintCard
              title="Vocabulary"
              icon="#"
              stats={[
                { label: 'Lexical diversity', value: `${Math.round(profile.lexicalDiversity.mean * 100)}%` },
                { label: 'Uniqueness', value: `${Math.round((profile.lexicalUniqueness || 0) * 100)}%` },
                { label: 'Contraction rate', value: `${Math.round(profile.contractionRate * 100)}%` },
              ]}
            />
            <FingerprintCard
              title="Common Phrases"
              icon="&ldquo;"
              stats={(profile.topPhrases || []).slice(0, 4).map(p => ({ label: '', value: `"${p}"` }))}
            />
            <FingerprintCard
              title="Filler Words"
              icon="..."
              stats={[
                { label: 'Frequency', value: `${profile.fillerWords.frequency.toFixed(1)} / 100w` },
                { label: 'Detected', value: profile.fillerWords.frequency > 5 ? 'Frequent filler usage' : profile.fillerWords.frequency > 2 ? 'Moderate usage' : 'Minimal fillers' },
              ]}
            />
            <FingerprintCard
              title="Paragraph Rhythm"
              icon="&para;"
              stats={[
                { label: 'Avg length', value: `${Math.round(profile.paragraphLength.mean)} words` },
                { label: 'Paragraphs', value: `${profile.paragraphCount || '—'}` },
                { label: 'AI cliches', value: `${profile.aiClicheCount || 0} found` },
              ]}
            />
          </div>

          <div className="border-t border-slate-text/10 pt-6">
            <h3 className="text-xs font-mono text-slate-text/50 uppercase tracking-wider mb-3">Writing Samples</h3>
            <div className="space-y-3">
              {activeHeading.samples.map((sample, i) => (
                <div key={i} className="card-panel">
                  <p className="text-xs font-mono text-slate-text/40 mb-1">Sample {i + 1}</p>
                  <p className="text-sm text-slate-text/70 font-spectral line-clamp-3">{sample}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Empty state / Create new profile */
        <div className="text-center py-16 space-y-6">
          <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto text-slate-text/15">
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="40" y1="40" x2="40" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="40" cy="40" r="4" fill="currentColor" />
            <text x="40" y="62" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="IBM Plex Mono">
              TRUE NORTH
            </text>
          </svg>
          <div>
            <h2 className="text-xl font-fraunces font-bold text-slate-text mb-2">No voice profile yet</h2>
            <p className="text-sm text-slate-text/50 font-spectral">Paste your writing samples below, or load demo data to try Drift instantly.</p>
          </div>
          <button onClick={() => { onLoadDemo(); }} className="btn-primary">
            Load Demo Voice
          </button>
        </div>
      )}

      {/* Create new profile section */}
      <div className="border-t border-slate-text/10 pt-8">
        <h3 className="text-lg font-fraunces font-bold text-slate-text mb-4">
          {activeHeading ? 'Create Another Profile' : 'Create Your Voice Profile'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-alert-coral/10 border border-alert-coral/30 text-alert-coral text-sm rounded font-mono">
            {error}
          </div>
        )}

        {step === 'samples' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-text/60 font-spectral">
                Paste 3+ examples of your actual writing — tweets, newsletters, scripts, anything.
              </p>
              <button onClick={handleLoadDemoSamples} className="btn-ghost text-xs">
                Load Demo Samples
              </button>
            </div>

            {samples.map((sample, i) => (
              <div key={i}>
                <label className="text-xs font-mono text-slate-text/40 uppercase">Sample {i + 1}</label>
                <textarea
                  value={sample}
                  onChange={(e) => handleSampleChange(i, e.target.value)}
                  placeholder="Paste your writing here..."
                  className="w-full h-24 mt-1 p-3 bg-ink-navy/50 text-slate-text font-spectral text-sm border border-slate-text/10 rounded focus:outline-none focus:border-brass resize-none"
                />
              </div>
            ))}

            <div className="flex items-center gap-3">
              {samples.length < 10 && (
                <button onClick={() => setSamples([...samples, ''])} className="btn-ghost text-xs">
                  + Add another sample
                </button>
              )}
              {samples.length > 3 && (
                <button onClick={() => setSamples(samples.slice(0, -1))} className="text-xs text-alert-coral/60 hover:text-alert-coral font-mono">
                  - Remove last
                </button>
              )}
            </div>

            <button onClick={handleBuildFingerprint} disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Build Voice Fingerprint'}
            </button>
          </div>
        )}

        {step === 'preview' && previewProfile && (
          <div className="space-y-4">
            <div className="card-panel space-y-2">
              {getProfileSummary(previewProfile).map((bullet, i) => (
                <p key={i} className="text-sm text-slate-text/80 font-spectral">
                  <span className="text-brass mr-2">&#9670;</span>{bullet}
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('samples')} className="btn-secondary flex-1">Back</button>
              <button onClick={() => setStep('name')} className="btn-primary flex-1">Continue</button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-text/40 uppercase">Profile Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Twitter, Newsletter, YouTube Script"
                className="w-full mt-1 px-3 py-2 bg-ink-navy/50 text-slate-text font-spectral border border-slate-text/10 rounded focus:outline-none focus:border-brass" />
            </div>
            <div>
              <label className="text-xs font-mono text-slate-text/40 uppercase">What's this voice for?</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Short-form social media posts"
                className="w-full mt-1 px-3 py-2 bg-ink-navy/50 text-slate-text font-spectral border border-slate-text/10 rounded focus:outline-none focus:border-brass" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('preview')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save This Voice'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FingerprintCard({ title, icon, stats }: {
  title: string;
  icon: string;
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="card-panel">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-brass font-mono text-lg">{icon}</span>
        <h4 className="text-xs font-mono text-slate-text/50 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="space-y-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center justify-between">
            {stat.label && <span className="text-xs font-mono text-slate-text/40">{stat.label}</span>}
            <span className={`text-sm font-spectral text-slate-text/80 ${!stat.label ? 'w-full' : ''}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
