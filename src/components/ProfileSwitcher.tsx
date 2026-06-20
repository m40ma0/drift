import React, { useState } from 'react';
import { Heading } from '@/lib/headings';

interface ProfileSwitcherProps {
  headings: Heading[];
  activeHeadingId: string;
  onHeadingChange: (headingId: string) => void;
  onNewHeading: () => void;
}

export function ProfileSwitcher({
  headings,
  activeHeadingId,
  onHeadingChange,
  onNewHeading,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeHeading = headings.find((h) => h.id === activeHeadingId);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-text/60 font-mono uppercase tracking-wide">Active heading</p>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-sm bg-ink-navy border border-slate-text/20 text-slate-text hover:border-brass transition-colors text-left font-spectral"
        >
          {activeHeading?.name || 'Select a heading'}
          <span className="float-right">▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-ink-navy border border-slate-text/20 z-50">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => {
                  onHeadingChange(heading.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left font-spectral transition-colors ${
                  activeHeadingId === heading.id
                    ? 'bg-brass/10 text-brass'
                    : 'text-slate-text hover:bg-slate-text/5'
                }`}
              >
                {heading.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onNewHeading}
        className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wide bg-brass/10 text-brass hover:bg-brass/20 transition-colors"
      >
        New heading
      </button>
    </div>
  );
}
