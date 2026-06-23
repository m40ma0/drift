import { useEffect, useRef, useState } from 'react';

interface AboutTabProps {
  onGetStarted: () => void;
}

export function AboutTab({ onGetStarted }: AboutTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.section;
            if (id) setVisible((prev) => new Set(prev).add(id));
          }
        });
      },
      { threshold: 0.15, root: containerRef.current }
    );

    const sections = containerRef.current?.querySelectorAll('[data-section]');
    sections?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visible.has(id);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-88px)] overflow-y-auto"
      style={{
        scrollSnapType: 'y mandatory',
        background: 'var(--hex-bg)',
        color: 'var(--hex-ink-text)',
      }}
    >
      <style>{`
        .about-section {
          min-height: calc(100vh - 88px);
          scroll-snap-align: start;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
        }
        .slide-right {
          opacity: 0;
          transform: translateX(80px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .slide-left {
          opacity: 0;
          transform: translateX(-80px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .slide-up {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .slide-scale {
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .revealed {
          opacity: 1 !important;
          transform: translateX(0) translateY(0) scale(1) !important;
        }
        .step-card {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-card.revealed { opacity: 1; transform: translateY(0); }
        .step-card:nth-child(1) { transition-delay: 0.1s; }
        .step-card:nth-child(2) { transition-delay: 0.3s; }
        .step-card:nth-child(3) { transition-delay: 0.5s; }
        .step-card:nth-child(4) { transition-delay: 0.7s; }

        @media (prefers-reduced-motion: reduce) {
          .slide-right, .slide-left, .slide-up, .slide-scale, .step-card {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* 1 — Hero */}
      <section className="about-section" data-section="hero">
        <div className={`max-w-3xl mx-auto text-center slide-scale ${isVisible('hero') ? 'revealed' : ''}`}>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6" style={{ color: 'var(--hex-ink-text)' }}>
            AI detectors ask if it was written by AI.{' '}
            <span style={{ color: 'var(--hex-brass)' }}>Drift asks if it still sounds like you.</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--hex-body)' }}>
            Drift is a voice-preservation tool for writers, creators, and anyone who uses AI
            drafts but refuses to let their personal style disappear.
          </p>
          <div className="mt-10 flex justify-center">
            <div className="animate-bounce" style={{ color: 'var(--hex-brass)', opacity: 0.5 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — The Problem */}
      <section className="about-section" data-section="problem">
        <div className={`max-w-2xl mx-auto slide-right ${isVisible('problem') ? 'revealed' : ''}`}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--hex-ink-text)' }}>
            The problem nobody talks about
          </h2>
          <div className="space-y-4" style={{ color: 'var(--hex-body)' }}>
            <p className="text-base md:text-lg leading-relaxed">
              You started using AI to help with drafts. Totally reasonable. It saves time, gets ideas
              flowing, helps you past the blank page. But then something happened.
            </p>
            <p className="text-base md:text-lg leading-relaxed font-semibold" style={{ color: 'var(--hex-ink-text)' }}>
              Your writing started sounding like everyone else's writing.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              The AI polished away your rough edges &mdash; the ones that made your writing
              yours. Your sentence rhythm got smoothed out. Your weird punctuation habits
              disappeared. Your favorite filler words, your tendency to start sentences
              with "Look," or end them with dashes &mdash; gone.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              Everything became{' '}
              <span className="italic font-medium" style={{ color: 'var(--hex-coral)' }}>
                "In today's fast-paced world..."
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* 3 — What Drift is NOT */}
      <section className="about-section" data-section="not">
        <div className={`max-w-2xl mx-auto slide-left ${isVisible('not') ? 'revealed' : ''}`}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--hex-coral)' }}>
            What Drift is NOT
          </h2>
          <div className="space-y-5" style={{ color: 'var(--hex-body)' }}>
            <p className="text-base md:text-lg leading-relaxed">
              <strong style={{ color: 'var(--hex-ink-text)' }}>Not an AI detector.</strong>{' '}
              It doesn't care whether AI wrote something. That's not the question that matters.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              <strong style={{ color: 'var(--hex-ink-text)' }}>Not a "humanizer."</strong>{' '}
              Those tools just shuffle words around to fool detectors. That's the wrong game entirely.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              <strong style={{ color: 'var(--hex-ink-text)' }}>Not a plagiarism checker.</strong>{' '}
              It's not a grammar tool. It's not trying to trick anyone or game any system.
            </p>
            <p className="text-base md:text-lg leading-relaxed mt-6 border-l-2 pl-5" style={{ borderColor: 'var(--hex-coral)' }}>
              All of those tools ask "did a human write this?" What actually matters is:
              <em className="font-medium" style={{ color: 'var(--hex-ink-text)' }}> does this still sound like the person it's supposed to sound like?</em>
            </p>
          </div>
        </div>
      </section>

      {/* 4 — What Drift IS */}
      <section className="about-section" data-section="is">
        <div className={`max-w-2xl mx-auto slide-right ${isVisible('is') ? 'revealed' : ''}`}>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--hex-cyan)' }}>
            What Drift actually is
          </h2>
          <div className="space-y-4" style={{ color: 'var(--hex-body)' }}>
            <p className="text-lg md:text-xl leading-relaxed font-medium" style={{ color: 'var(--hex-ink-text)' }}>
              A voice-preservation engine.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              You give it samples of YOUR writing &mdash; the real stuff, the way you actually
              write when nobody's editing you. Blog posts, emails, tweets, journal entries, whatever
              feels most "you."
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              Drift builds a fingerprint of your style. Not just vocabulary &mdash; it captures your
              sentence rhythm, your punctuation habits, how often you use contractions, your filler
              words, whether you write long flowing sentences or short punchy ones.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              Then when you paste a draft, Drift scores every single sentence against YOUR fingerprint.
              It tells you exactly where your voice disappeared and <em>why</em>.
            </p>
          </div>
        </div>
      </section>

      {/* 5 — How It Works (staggered steps) */}
      <section className="about-section" data-section="how">
        <div className="max-w-2xl mx-auto w-full">
          <h2 className={`text-2xl md:text-3xl font-bold mb-10 text-center slide-up ${isVisible('how') ? 'revealed' : ''}`}
            style={{ color: 'var(--hex-ink-text)' }}>
            How it works
          </h2>
          <div className="space-y-5">
            {[
              { step: '1', title: 'Paste your real writing', desc: 'Add 3 or more samples of writing that sounds like you. The more you give it, the sharper your fingerprint gets.' },
              { step: '2', title: 'Drift builds your voice fingerprint', desc: 'It analyzes your sentence lengths, punctuation patterns, vocabulary choices, contraction habits, and dozens of other style markers.' },
              { step: '3', title: 'Paste any draft', desc: "AI-generated, co-written, edited by someone else — doesn't matter where it came from. Drift doesn't judge the source." },
              { step: '4', title: 'See where your voice drifted', desc: "Every sentence gets scored against your fingerprint. You'll see exactly which sentences sound like you, which don't, and why." },
            ].map((item) => (
              <div key={item.step}
                className={`step-card flex gap-5 items-start rounded-lg p-5 ${isVisible('how') ? 'revealed' : ''}`}
                style={{ background: 'var(--hex-card)', border: '1px solid var(--hex-border)' }}>
                <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--hex-brass)', color: '#FFFFFF' }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--hex-ink-text)' }}>{item.title}</h3>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--hex-body)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — Built for hackathon */}
      <section className="about-section" data-section="hackathon">
        <div className={`max-w-2xl mx-auto text-center slide-left ${isVisible('hackathon') ? 'revealed' : ''}`}>
          <h2 className="text-2xl md:text-3xl font-bold mb-5" style={{ color: 'var(--hex-ink-text)' }}>
            Built for Youth Code x AI 2026
          </h2>
          <div className="space-y-4" style={{ color: 'var(--hex-body)' }}>
            <p className="text-base md:text-lg leading-relaxed">
              Drift was built for the Youth Code x AI 2026 hackathon. It works entirely in your
              browser &mdash; no server, no API calls, no data leaves your machine.
            </p>
            <p className="text-base md:text-lg leading-relaxed">
              Your writing samples, your voice fingerprint, your drafts &mdash; everything stays
              local. Privacy isn't a feature we tacked on. It's how this thing was built from day one.
            </p>
          </div>
        </div>
      </section>

      {/* 7 — CTA */}
      <section className="about-section" data-section="cta">
        <div className={`max-w-xl mx-auto text-center slide-scale ${isVisible('cta') ? 'revealed' : ''}`}>
          <div className="rounded-lg p-10 md:p-14" style={{ background: 'var(--hex-card)', border: '1px solid var(--hex-border)' }}>
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--hex-ink-text)' }}>
              Ready to hear your own voice again?
            </h2>
            <p className="text-base md:text-lg mb-8" style={{ color: 'var(--hex-body)' }}>
              Start by building your voice fingerprint. It takes about two minutes.
            </p>
            <button onClick={onGetStarted}
              className="px-8 py-3.5 text-lg font-semibold rounded-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'var(--hex-brass)', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(var(--c-brass), 0.3)' }}>
              Build Your Voice Profile
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
