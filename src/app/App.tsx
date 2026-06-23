import { useState, useEffect, useRef } from 'react';
import { AboutTab } from '@/components/AboutTab';
import { EditorTab } from '@/components/EditorTab';
import { VoiceProfileTab } from '@/components/VoiceProfileTab';
import { CompareTab } from '@/components/CompareTab';
import { VoyageLogTab } from '@/components/VoyageLogTab';
import { VoiceDNATab } from '@/components/VoiceDNATab';
import { CompassGauge } from '@/components/CompassGauge';
import { listHeadings, Heading, getDriftHistory, DriftHistoryEntry } from '@/lib/headings';
import { loadDemoData } from '@/lib/demoData';
import { clear, keys as idbKeys, del as idbDel } from 'idb-keyval';

type Tab = 'editor' | 'profile' | 'compare' | 'log' | 'dna' | 'about';

const TABS: { key: Tab; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'profile', label: 'Voice Profile' },
  { key: 'compare', label: 'Compare' },
  { key: 'log', label: 'Voyage Log' },
  { key: 'dna', label: 'Voice DNA' },
  { key: 'about', label: 'About' },
];

function CompassLogo({ size = 24 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const r = s * 0.42;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgb(var(--c-ink-text))" strokeWidth={s * 0.035} opacity="0.25" />
      <polygon points={`${c},${c - r * 0.6} ${c - s * 0.06},${c} ${c},${c - s * 0.03} ${c + s * 0.06},${c}`} fill="rgb(var(--c-brass))" />
      <polygon points={`${c},${c + r * 0.6} ${c - s * 0.06},${c} ${c},${c + s * 0.03} ${c + s * 0.06},${c}`} fill="rgb(var(--c-signal-cyan))" />
      <circle cx={c} cy={c} r={s * 0.04} fill="rgb(var(--c-ink-text))" opacity="0.3" />
    </svg>
  );
}

function DarkToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={dark ? 'Light mode' : 'Dark mode'}
      className="p-1.5 rounded-md hover:bg-ink-text/5 transition-colors text-slate-text/50">
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
  const mainRef = useRef<HTMLDivElement>(null);
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
      setDriftHistory(await getDriftHistory(saved[0].id));
    } else if (saved.length > 0 && activeHeading) {
      const updated = saved.find(h => h.id === activeHeading.id);
      if (updated) setActiveHeading(updated);
      setDriftHistory(await getDriftHistory(activeHeading.id));
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
      setDriftHistory(await getDriftHistory(headingId));
    }
  };

  const handleLoadDemo = async () => {
    await loadDemoData();
    const saved = await listHeadings();
    setHeadings(saved);
    if (saved.length > 0) {
      setActiveHeading(saved[0]);
      setDriftHistory(await getDriftHistory(saved[0].id));
    }
  };

  const handleResetDemo = async () => {
    await clear();
    setHeadings([]);
    setActiveHeading(null);
    setDriftHistory([]);
    setCurrentDrift(0);
    await loadDemoData();
    const saved = await listHeadings();
    setHeadings(saved);
    if (saved.length > 0) {
      setActiveHeading(saved[0]);
      setDriftHistory(await getDriftHistory(saved[0].id));
    }
    setActiveTab('editor');
  };

  const switchTab = async (tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (tab === 'log' && activeHeading) {
      setDriftHistory(await getDriftHistory(activeHeading.id));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-ink-navy items-center justify-center flex-col gap-2">
        <CompassLogo size={32} />
        <span className="text-slate-text/50 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ink-navy text-slate-text">
      {/* Nav */}
      <nav className="border-b border-card-border flex-shrink-0 bg-chart-paper sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 sm:px-5 h-12">
          {/* Logo */}
          <button onClick={() => switchTab('about')} className="flex items-center gap-2 hover:opacity-70 transition-opacity" aria-label="Drift home">
            <CompassLogo size={22} />
            <span className="text-sm font-semibold text-ink-text">Drift</span>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {activeHeading && (
              <>
                <div className="hidden sm:block"><CompassGauge drift={currentDrift} size={32} /></div>
                <select value={activeHeading.id} onChange={(e) => handleHeadingChange(e.target.value)} aria-label="Active voice profile"
                  className="bg-transparent text-ink-text text-xs px-2 py-1 rounded-md border border-card-border focus:outline-none focus:border-brass cursor-pointer max-w-[110px] sm:max-w-[160px] truncate">
                  {headings.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </>
            )}
            {!activeHeading && headings.length === 0 && (
              <button onClick={handleLoadDemo} className="btn-primary py-1 px-3 text-xs">Load demo</button>
            )}
            {headings.length > 0 && (
              <button onClick={handleResetDemo} title="Reset and reload demo data"
                className="p-1.5 rounded-md hover:bg-ink-text/5 transition-colors text-slate-text/40 hover:text-alert-coral">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            )}
            <DarkToggle dark={dark} onToggle={() => setDark(d => !d)} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 sm:px-5 gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => switchTab(tab.key)}
              className={`tab-button whitespace-nowrap ${activeTab === tab.key ? 'tab-button-active' : 'tab-button-inactive'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto" role="main">
        <div className="tab-content-enter" key={activeTab}>
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
            <VoyageLogTab history={driftHistory} activeHeadingName={activeHeading?.name || ''}
              onClearHistory={async () => {
                if (!activeHeading) return;
                const ks = await idbKeys();
                for (const k of ks) { if (typeof k === 'string' && k.startsWith(`history:${activeHeading.id}:`)) await idbDel(k); }
                setDriftHistory([]);
              }} />
          )}
          {activeTab === 'dna' && (
            <VoiceDNATab activeHeading={activeHeading} />
          )}
          {activeTab === 'about' && (
            <AboutTab onGetStarted={() => switchTab('profile')} />
          )}
        </div>
      </main>
    </div>
  );
}
