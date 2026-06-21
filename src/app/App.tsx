import { useState, useEffect } from 'react';
import { AboutTab } from '@/components/AboutTab';
import { EditorTab } from '@/components/EditorTab';
import { VoiceProfileTab } from '@/components/VoiceProfileTab';
import { CompareTab } from '@/components/CompareTab';
import { VoyageLogTab } from '@/components/VoyageLogTab';
import { VoiceDNATab } from '@/components/VoiceDNATab';
import { CompassGauge } from '@/components/CompassGauge';
import { listHeadings, Heading, getDriftHistory, DriftHistoryEntry } from '@/lib/headings';
import { loadDemoData } from '@/lib/demoData';

type Tab = 'editor' | 'profile' | 'compare' | 'log' | 'dna' | 'about';

const TABS: { key: Tab; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'profile', label: 'Voice Profile' },
  { key: 'compare', label: 'Compare' },
  { key: 'log', label: 'Voyage Log' },
  { key: 'dna', label: 'Voice DNA' },
  { key: 'about', label: 'About' },
];

function CompassLogo({ size = 28 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const r = s * 0.43;
  const t = s * 0.08;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={c} cy={c} r={r} fill="#1a1f2e" stroke="#B8863A" strokeWidth={s * 0.04} />
      <line x1={c} y1={c - r - t * 0.3} x2={c} y2={c - r + t * 1.2} stroke="#B8863A" strokeWidth={s * 0.035} strokeLinecap="round" />
      <line x1={c} y1={c + r - t * 1.2} x2={c} y2={c + r + t * 0.3} stroke="#B8863A" strokeWidth={s * 0.035} strokeLinecap="round" />
      <line x1={c - r - t * 0.3} y1={c} x2={c - r + t * 1.2} y2={c} stroke="#B8863A" strokeWidth={s * 0.035} strokeLinecap="round" />
      <line x1={c + r - t * 1.2} y1={c} x2={c + r + t * 0.3} y2={c} stroke="#B8863A" strokeWidth={s * 0.035} strokeLinecap="round" />
      <polygon points={`${c},${c - r * 0.65} ${c - s * 0.07},${c} ${c},${c - s * 0.04} ${c + s * 0.07},${c}`} fill="#B8863A" />
      <polygon points={`${c},${c + r * 0.65} ${c - s * 0.07},${c} ${c},${c + s * 0.04} ${c + s * 0.07},${c}`} fill="#4FD8C4" />
      <circle cx={c} cy={c} r={s * 0.055} fill="#F9F7F4" />
    </svg>
  );
}

function DarkModeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-ink-text/5 transition-colors text-slate-text">
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [currentDrift, setCurrentDrift] = useState(0);
  const [activeHeading, setActiveHeading] = useState<Heading | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [driftHistory, setDriftHistory] = useState<DriftHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('drift-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('drift-dark-mode', String(dark));
  }, [dark]);

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
      try { await refreshHeadings(); } catch (err) { console.error('Failed to load:', err); } finally { setLoading(false); }
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

  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'log' && activeHeading) {
      const history = await getDriftHistory(activeHeading.id);
      setDriftHistory(history);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-ink-navy items-center justify-center flex-col gap-4">
        <CompassLogo size={40} />
        <span className="text-slate-text text-sm">Loading Drift...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ink-navy text-slate-text">
      {/* Navigation */}
      <nav className="border-b border-card-border flex-shrink-0 bg-chart-paper/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <CompassLogo size={30} />
            <h1 className="text-lg font-bold text-ink-text">Drift</h1>
            <p className="text-xs text-slate-text/50 hidden lg:block ml-2">
              AI helps you write faster. Drift makes sure it still sounds like you.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeHeading && (
              <>
                <CompassGauge drift={currentDrift} size={40} />
                <select value={activeHeading.id} onChange={(e) => handleHeadingChange(e.target.value)}
                  className="bg-chart-paper border border-card-border text-ink-text text-sm px-3 py-1.5 rounded-xl focus:outline-none focus:border-brass cursor-pointer">
                  {headings.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </>
            )}
            {!activeHeading && headings.length === 0 && (
              <button onClick={handleLoadDemo} className="btn-primary text-xs py-1.5">Try demo</button>
            )}
            <DarkModeToggle dark={dark} onToggle={() => setDark(d => !d)} />
          </div>
        </div>

        <div className="flex px-6 gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`tab-button whitespace-nowrap ${activeTab === tab.key ? 'tab-button-active' : 'tab-button-inactive'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'about' && (
          <AboutTab onGetStarted={() => setActiveTab('profile')} />
        )}
        {activeTab === 'editor' && (
          <EditorTab activeProfile={activeHeading?.profile || null} activeHeadingId={activeHeading?.id || ''} activeProfileName={activeHeading?.name || ''} onDriftChange={setCurrentDrift} onLoadDemo={handleLoadDemo} />
        )}
        {activeTab === 'profile' && (
          <VoiceProfileTab activeHeading={activeHeading} onProfileCreated={refreshHeadings} onLoadDemo={handleLoadDemo} />
        )}
        {activeTab === 'compare' && (
          <CompareTab activeProfile={activeHeading?.profile || null} sampleCount={activeHeading?.samples.length} />
        )}
        {activeTab === 'log' && (
          <VoyageLogTab history={driftHistory} activeHeadingName={activeHeading?.name || ''} />
        )}
        {activeTab === 'dna' && (
          <VoiceDNATab activeHeading={activeHeading} />
        )}
      </main>
    </div>
  );
}
