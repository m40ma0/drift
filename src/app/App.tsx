import React, { useState, useEffect } from 'react';
import { VoiceEditor } from '@/components/VoiceEditor';
import { CompassGauge } from '@/components/CompassGauge';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { FingerprintBuilder } from '@/components/FingerprintBuilder';
import { VoyageLog } from '@/components/VoyageLog';
import { VoiceDNACard } from '@/components/VoiceDNACard';
import { listHeadings, Heading, getDriftHistory } from '@/lib/headings';
import { loadDemoData } from '@/lib/demoData';

export function App() {
  const [currentDrift, setCurrentDrift] = useState(0);
  const [activeHeading, setActiveHeading] = useState<Heading | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showVoiceDNA, setShowVoiceDNA] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driftHistory, setDriftHistory] = useState([]);

  useEffect(() => {
    const loadHeadings = async () => {
      try {
        const saved = await listHeadings();
        setHeadings(saved);
        if (saved.length > 0) {
          setActiveHeading(saved[0]);
          const history = await getDriftHistory(saved[0].id);
          setDriftHistory(history);
        } else {
          setShowBuilder(true);
        }
      } catch (err) {
        console.error('Failed to load headings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHeadings();
  }, []);

  const handleHeadingCreated = async () => {
    const updated = await listHeadings();
    setHeadings(updated);
    if (updated.length > 0) {
      setActiveHeading(updated[0]);
    }
    setShowBuilder(false);
  };

  const handleHeadingChange = async (headingId: string) => {
    const selected = headings.find((h) => h.id === headingId);
    if (selected) {
      setActiveHeading(selected);
      const history = await getDriftHistory(headingId);
      setDriftHistory(history);
    }
  };

  const handleLoadDemo = async () => {
    try {
      await loadDemoData();
      const updated = await listHeadings();
      setHeadings(updated);
      if (updated.length > 0) {
        setActiveHeading(updated[0]);
        const history = await getDriftHistory(updated[0].id);
        setDriftHistory(history);
      }
    } catch (err) {
      console.error('Failed to load demo data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-ink-navy items-center justify-center flex-col gap-4">
        <p className="text-slate-text font-spectral">Loading your voice profiles...</p>
        <button
          onClick={handleLoadDemo}
          className="px-4 py-2 bg-brass/20 text-brass font-fraunces font-semibold hover:bg-brass/30 transition-colors rounded"
        >
          Load demo
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-ink-navy text-slate-text font-spectral">
      <div className="flex-1 flex flex-col bg-chart-paper text-ink-text overflow-hidden">
        {activeHeading ? (
          <VoiceEditor 
            onDriftChange={setCurrentDrift}
            activeProfile={activeHeading.profile}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-ink-text/60 font-spectral">No voice profiles yet</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-4 py-2 bg-brass text-ink-navy font-fraunces font-semibold hover:bg-brass/90"
            >
              Create your first heading
            </button>
            <button
              onClick={handleLoadDemo}
              className="px-4 py-2 bg-brass/20 text-brass font-fraunces font-semibold hover:bg-brass/30 transition-colors rounded"
            >
              Or load demo
            </button>
          </div>
        )}
      </div>

      <div className="w-80 bg-ink-navy border-l border-slate-text/10 flex flex-col overflow-hidden">
        {/* Compass gauge */}
        <div className="flex-1 flex items-center justify-center p-6 border-b border-slate-text/10">
          <CompassGauge drift={currentDrift} />
        </div>

        {/* Profile switcher */}
        <div className="px-6 py-4 border-b border-slate-text/10">
          <ProfileSwitcher 
            headings={headings}
            activeHeadingId={activeHeading?.id || ''}
            onHeadingChange={handleHeadingChange}
            onNewHeading={() => setShowBuilder(true)}
          />
        </div>

        {/* Voyage log */}
        <div className="px-6 py-4 border-b border-slate-text/10">
          <p className="text-xs text-slate-text/60 font-mono uppercase mb-3">Voyage log</p>
          <VoyageLog history={driftHistory} />
        </div>

        {/* Voice DNA button */}
        {activeHeading && (
          <div className="px-6 py-3 border-t border-slate-text/10">
            <button
              onClick={() => setShowVoiceDNA(!showVoiceDNA)}
              className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wide bg-brass/10 text-brass hover:bg-brass/20 transition-colors rounded"
            >
              {showVoiceDNA ? 'Hide' : 'Show'} Voice DNA
            </button>
          </div>
        )}
      </div>

      {/* Voice DNA modal */}
      {showVoiceDNA && activeHeading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ink-navy border border-slate-text/20 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-fraunces font-bold text-slate-text">Voice DNA</h2>
              <button
                onClick={() => setShowVoiceDNA(false)}
                className="text-slate-text/60 hover:text-slate-text text-xl"
              >
                ✕
              </button>
            </div>
            <VoiceDNACard heading={activeHeading} />
          </div>
        </div>
      )}

      {showBuilder && (
        <FingerprintBuilder onHeadingCreated={handleHeadingCreated} />
      )}
    </div>
  );
}
