import { useState, useEffect } from 'react';
import { EditorTab } from '@/components/EditorTab';
import { VoiceProfileTab } from '@/components/VoiceProfileTab';
import { CompareTab } from '@/components/CompareTab';
import { VoyageLogTab } from '@/components/VoyageLogTab';
import { VoiceDNATab } from '@/components/VoiceDNATab';
import { CompassGauge } from '@/components/CompassGauge';
import { listHeadings, Heading, getDriftHistory, DriftHistoryEntry } from '@/lib/headings';
import { loadDemoData } from '@/lib/demoData';

type Tab = 'editor' | 'profile' | 'compare' | 'log' | 'dna';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'editor', label: 'Editor', icon: 'E' },
  { key: 'profile', label: 'Voice Profile', icon: 'V' },
  { key: 'compare', label: 'Compare', icon: 'C' },
  { key: 'log', label: 'Voyage Log', icon: 'L' },
  { key: 'dna', label: 'Voice DNA', icon: 'D' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [currentDrift, setCurrentDrift] = useState(0);
  const [activeHeading, setActiveHeading] = useState<Heading | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [driftHistory, setDriftHistory] = useState<DriftHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshHeadings = async () => {
    const saved = await listHeadings();
    setHeadings(saved);
    if (saved.length > 0 && !activeHeading) {
      setActiveHeading(saved[0]);
      const history = await getDriftHistory(saved[0].id);
      setDriftHistory(history);
    } else if (saved.length > 0 && activeHeading) {
      const updated = saved.find(h => h.id === activeHeading.id);
      if (updated) setActiveHeading(updated);
      const history = await getDriftHistory(activeHeading.id);
      setDriftHistory(history);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshHeadings();
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleHeadingChange = async (headingId: string) => {
    const selected = headings.find(h => h.id === headingId);
    if (selected) {
      setActiveHeading(selected);
      const history = await getDriftHistory(headingId);
      setDriftHistory(history);
    }
  };

  const handleLoadDemo = async () => {
    await loadDemoData();
    const saved = await listHeadings();
    setHeadings(saved);
    if (saved.length > 0) {
      setActiveHeading(saved[0]);
      const history = await getDriftHistory(saved[0].id);
      setDriftHistory(history);
    }
  };

  const handleProfileCreated = async () => {
    await refreshHeadings();
  };

  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'log' && activeHeading) {
      const history = await getDriftHistory(activeHeading.id);
      setDriftHistory(history);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" className="text-brass animate-pulse">
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="16" y1="16" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2" fill="currentColor" />
          </svg>
          <span className="text-slate-text/60 font-mono text-sm">Loading Drift...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ink-navy text-slate-text">
      {/* Top navigation */}
      <nav className="border-b border-slate-text/10 flex-shrink-0">
        {/* Brand bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 28 28" className="text-brass">
                <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="14" r="2" fill="currentColor" />
              </svg>
              <h1 className="text-xl font-fraunces font-bold text-slate-text">Drift</h1>
            </div>
            {/* Tagline */}
            <p className="text-xs text-slate-text/40 font-mono hidden md:block max-w-md">
              AI detectors ask if it was written by AI. Drift asks if it still sounds like you.
            </p>
          </div>

          {/* Profile selector + compass */}
          <div className="flex items-center gap-4">
            {activeHeading && (
              <div className="flex items-center gap-3">
                <CompassGauge drift={currentDrift} size={48} />
                <select
                  value={activeHeading.id}
                  onChange={(e) => handleHeadingChange(e.target.value)}
                  className="bg-ink-navy border border-slate-text/15 text-slate-text text-sm font-mono px-3 py-1.5 rounded focus:outline-none focus:border-brass cursor-pointer"
                >
                  {headings.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
            {!activeHeading && headings.length === 0 && (
              <button onClick={handleLoadDemo} className="btn-primary text-xs py-1.5">
                Load Demo Voice
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 gap-1 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`tab-button ${activeTab === tab.key ? 'tab-button-active' : 'tab-button-inactive'}`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.icon}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'editor' && (
          <EditorTab
            activeProfile={activeHeading?.profile || null}
            activeHeadingId={activeHeading?.id || ''}
            onDriftChange={setCurrentDrift}
          />
        )}
        {activeTab === 'profile' && (
          <VoiceProfileTab
            activeHeading={activeHeading}
            onProfileCreated={handleProfileCreated}
            onLoadDemo={handleLoadDemo}
          />
        )}
        {activeTab === 'compare' && (
          <CompareTab activeProfile={activeHeading?.profile || null} />
        )}
        {activeTab === 'log' && (
          <VoyageLogTab
            history={driftHistory}
            activeHeadingName={activeHeading?.name || ''}
          />
        )}
        {activeTab === 'dna' && (
          <VoiceDNATab activeHeading={activeHeading} />
        )}
      </main>
    </div>
  );
}
