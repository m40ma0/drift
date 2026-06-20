import React, { useState } from 'react';
import { createHeading, getProfileSummary } from '@/lib/headings';
import { StylemetricProfile } from '@/lib/stylometry';

interface FingerprintBuilderProps {
  onHeadingCreated: () => void;
}

interface BuilderStep {
  type: 'samples' | 'preview' | 'name';
}

export function FingerprintBuilder({ onHeadingCreated }: FingerprintBuilderProps) {
  const [step, setStep] = useState<BuilderStep['type']>('samples');
  const [samples, setSamples] = useState<string[]>(['', '', '']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profile, setProfile] = useState<StylemetricProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSampleChange = (index: number, value: string) => {
    const newSamples = [...samples];
    newSamples[index] = value;
    setSamples(newSamples);
  };

  const handleAddSample = () => {
    setSamples([...samples, '']);
  };

  const handleRemoveSample = (index: number) => {
    if (samples.length > 3) {
      setSamples(samples.filter((_, i) => i !== index));
    }
  };

  const handleAnalyzeSamples = async () => {
    setError('');
    const nonEmptySamples = samples.filter((s) => s.trim().length > 0);

    if (nonEmptySamples.length < 3) {
      setError('Paste at least 3 samples of your writing');
      return;
    }

    setLoading(true);
    try {
      const { buildProfile } = await import('@/lib/stylometry');
      const generatedProfile = buildProfile(nonEmptySamples);
      setProfile(generatedProfile);
      setStep('preview');
    } catch (err) {
      setError('Error analyzing samples. Try again?');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeading = async () => {
    if (!name.trim()) {
      setError('Give this heading a name');
      return;
    }

    if (!description.trim()) {
      setError("Tell us what this voice is for (e.g., \"Twitter posts\")");
      return;
    }

    setLoading(true);
    try {
      const nonEmptySamples = samples.filter((s) => s.trim().length > 0);
      await createHeading(name, description, nonEmptySamples);
      onHeadingCreated();
      setStep('samples');
      setSamples(['', '', '']);
      setName('');
      setDescription('');
      setProfile(null);
    } catch (err) {
      setError('Error saving heading. Try again?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-ink-navy border border-slate-text/20 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-text/10">
          <h2 className="text-lg font-fraunces font-bold text-slate-text">
            {step === 'samples' && 'Paste 3+ samples'}
            {step === 'preview' && 'Your voice profile'}
            {step === 'name' && 'Save this heading'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-alert-coral/10 border border-alert-coral text-alert-coral text-sm rounded">
              {error}
            </div>
          )}

          {step === 'samples' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-text/70">
                Paste examples of your actual writing—tweets, newsletters, scripts, whatever. At least 3 samples, the longer the better.
              </p>

              <div className="space-y-3">
                {samples.map((sample, index) => (
                  <div key={index}>
                    <label className="text-xs font-mono text-slate-text/60 uppercase">
                      Sample {index + 1}
                    </label>
                    <textarea
                      value={sample}
                      onChange={(e) => handleSampleChange(index, e.target.value)}
                      placeholder="Paste your writing here..."
                      className="w-full h-24 mt-1 p-3 bg-chart-paper text-ink-text font-spectral border border-slate-text/20 focus:outline-none focus:border-brass"
                    />
                  </div>
                ))}
              </div>

              {samples.length < 10 && (
                <button
                  onClick={handleAddSample}
                  className="text-sm text-brass hover:text-brass/80 font-mono"
                >
                  + Add another sample
                </button>
              )}

              {samples.length > 3 && (
                <button
                  onClick={() => handleRemoveSample(samples.length - 1)}
                  className="text-sm text-alert-coral hover:text-alert-coral/80 font-mono"
                >
                  − Remove last sample
                </button>
              )}

              <button
                onClick={handleAnalyzeSamples}
                disabled={loading}
                className="w-full py-2 bg-brass text-ink-navy font-fraunces font-semibold hover:bg-brass/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze your voice'}
              </button>
            </div>
          )}

          {step === 'preview' && profile && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-text/5 border border-slate-text/10 rounded space-y-2">
                {getProfileSummary(profile).map((bullet, i) => (
                  <p key={i} className="text-sm text-slate-text/80">
                    • {bullet}
                  </p>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('samples')}
                  className="flex-1 py-2 border border-slate-text/20 text-slate-text hover:bg-slate-text/5 font-spectral transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('name')}
                  className="flex-1 py-2 bg-brass text-ink-navy font-fraunces font-semibold hover:bg-brass/90 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-text/60 uppercase">
                  Heading name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Twitter, Newsletter, Video Script"
                  className="w-full mt-1 px-3 py-2 bg-chart-paper text-ink-text font-spectral border border-slate-text/20 focus:outline-none focus:border-brass"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-text/60 uppercase">
                  What's this voice for?
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Short-form social media posts"
                  className="w-full mt-1 px-3 py-2 bg-chart-paper text-ink-text font-spectral border border-slate-text/20 focus:outline-none focus:border-brass"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('preview')}
                  className="flex-1 py-2 border border-slate-text/20 text-slate-text hover:bg-slate-text/5 font-spectral transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveHeading}
                  disabled={loading}
                  className="flex-1 py-2 bg-brass text-ink-navy font-fraunces font-semibold hover:bg-brass/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save this voice'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
