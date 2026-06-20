import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Heading, getProfileSummary } from '@/lib/headings';

interface VoiceDNACardProps {
  heading: Heading;
}

export function VoiceDNACard({ heading }: VoiceDNACardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const summary = getProfileSummary(heading.profile);

  const handleExport = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 600,
        height: 400,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `drift-${heading.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export card:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Card preview */}
      <div
        ref={cardRef}
        className="w-full aspect-video bg-gradient-to-br from-ink-navy to-ink-navy/80 border border-slate-text/20 rounded-lg p-8 flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #101826 0%, #0a0f17 100%)',
        }}
      >
        {/* Header with logo area */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-fraunces font-bold text-brass mb-1">
              {heading.name}
            </h3>
            <p className="text-sm text-slate-text/70 font-mono">
              {heading.description}
            </p>
          </div>
          {/* Compass seal */}
          <svg width="60" height="60" viewBox="0 0 60 60" className="opacity-40">
            <circle cx="30" cy="30" r="28" fill="none" stroke="#C98A3E" strokeWidth="1" />
            <circle cx="30" cy="30" r="4" fill="#C98A3E" />
            <line x1="30" y1="30" x2="30" y2="8" stroke="#C98A3E" strokeWidth="1.5" strokeLinecap="round" />
            <text x="30" y="50" textAnchor="middle" className="text-xs" fill="#C98A3E" fontFamily="IBM Plex Mono">
              TRUE NORTH
            </text>
          </svg>
        </div>

        {/* Voice traits */}
        <div className="space-y-2">
          {summary.slice(0, 4).map((trait, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-brass text-sm mt-0.5">▪</span>
              <p className="text-sm text-slate-text leading-snug font-spectral">
                {trait}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-text/10">
          <p className="text-xs text-slate-text/50 font-mono">
            drift.ai • your voice, unflattened
          </p>
          <p className="text-xs text-slate-text/50 font-mono">
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="w-full py-2 bg-brass text-ink-navy font-fraunces font-semibold hover:bg-brass/90 transition-colors rounded"
      >
        Export as PNG
      </button>
    </div>
  );
}
