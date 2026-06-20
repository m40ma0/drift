# Drift — Measure Your Voice, Keep Your Soul

A writing tool for content creators who use AI to draft faster but don't want their voice to flatten into generic "AI voice." Drift computes a stylometric fingerprint from your past writing and scores live drafts against it—sentence by sentence—showing exactly where and how text drifts from your authentic voice.

## The Problem

AI writing tools excel at generating grammatically correct, well-structured prose. The result: everything sounds the same. Creators lose their distinctive voice—the thing that makes their writing *theirs*—to algorithmic polish.

Drift is not an "AI detector" or a "humanizer." It doesn't care *whether* AI wrote something. It cares whether it *still sounds like you*.

## Core Features

### 1. **Fingerprint Builder**
Paste 3+ samples of your actual writing (tweets, newsletters, scripts—anything). Drift computes a baseline stylometric profile measuring:
- **Sentence rhythm**: mean length + variance (short punches vs. long runs)
- **Punctuation fingerprint**: em-dashes, semicolons, exclamation points per 100 words
- **Filler/tic words**: frequency of "literally," "honestly," "so," etc.
- **Lexical diversity**: vocabulary range and repetition patterns
- **Contractions**: "don't" vs. "do not" ratio
- **Sentence openers**: how you typically start sentences
- **Paragraph pacing**: typical paragraph lengths

You get a plain-English summary of your voice: "Your sentences average 14 words but swing wide—you mix short punches with longer runs."

### 2. **Live Drift Scoring**
Paste or write in the editor. The compass gauge updates in real-time:
- **0°** = "True North" (perfectly on-voice)
- **±45°** = maximum drift

The needle animates smoothly with a cyan trail showing recent history. No jank, no lag—all scoring happens in a Web Worker so typing never stutters.

### 3. **Sentence-Level Attribution**
Don't just see one number. See exactly which sentences drift:
- Red underlines mark high-drift sentences
- Hover to see a plain-English reason: "High drift — notably different from your voice"
- Two-pane split-view: input on left, analysis on right

### 4. **Multiple Headings (Voice Profiles)**
Your tweet voice and long-form newsletter voice are legitimately different. Create separate headings:
- **Twitter** — short, punchy, exclamation-heavy
- **Newsletter** — long-form, thoughtful, em-dash-heavy
- **Video Script** — conversational, contracted, audience-direct

Switch between them instantly. The compass rescores against whichever heading is active.

### 5. **Voyage Log**
A hand-built SVG chart showing your drift over time. The line turns cyan when you're near true north, coral when you're drifting. Proves the story: "See how your voice drifted into AI-polish over these drafts? Now watch how Drift helps you course-correct."

### 6. **Voice DNA Card**
One-click export to PNG—a shareable profile card showing:
- Your heading name and description
- 4–5 plain-English voice traits
- A small compass seal graphic
- Date and "drift.ai • your voice, unflattened"

Perfect for social sharing or embedding in documentation.

### 7. **Demo Mode**
Pre-seeded with two realistic voice profiles (Twitter & Newsletter) and demo AI drafts. Load the demo with one click—no setup required. Judges love this.

## How It Works

### Stylometry Engine
All scoring runs client-side in TypeScript using `compromise` for lightweight NLP. No server calls for core scoring—only the optional rewrite suggestions use an API.

**Scoring pipeline:**
1. Parse sentences from the draft
2. Extract metrics for each sentence (length, punctuation, filler words, etc.)
3. Compute z-scores against the profile baseline
4. Combine weighted metrics into a 0–45° drift value
5. Return sentence-level scores for highlighting

**Performance:**
- Debounced scoring: 400ms idle + immediate on sentence completion
- Sliding window (last ~150 words) for incremental updates
- Web Worker keeps main thread responsive
- Cached per-sentence scores minimize recomputation

### Architecture

```
src/
├── app/
│   └── App.tsx                 # Main shell, layout, state management
├── components/
│   ├── CompassGauge.tsx        # Hand-built SVG compass with animation
│   ├── VoiceEditor.tsx         # Split-pane editor with sentence highlighting
│   ├── VoyageLog.tsx           # SVG line chart of drift history
│   ├── VoiceDNACard.tsx        # Shareable profile card + PNG export
│   ├── FingerprintBuilder.tsx  # Multi-step profile creation flow
│   └── ProfileSwitcher.tsx     # Heading selector
├── lib/
│   ├── stylometry.ts           # Pure scoring functions (unit-testable)
│   ├── scoringWorker.ts        # Web Worker message handler
│   ├── useScoring.ts           # React hook wrapping worker
│   ├── headings.ts             # IndexedDB CRUD for profiles
│   ├── demoData.ts             # Pre-baked demo profiles
│   └── ...
└── index.css                   # Design tokens, fonts, accessibility
```

## Design System

### Colors (custom tokens, no Tailwind defaults)
- **Ink Navy** `#101826` — app shell background
- **Chart Paper** `#F1EAD6` — editor surface (warm, paper-like)
- **Brass** `#C98A3E` — primary accent, on-course state
- **Signal Cyan** `#4FD8C4` — live data, trail, on-voice indicator
- **Alert Coral** `#E2604F` — high-drift warning
- **Slate Text** `#C9D3DC` — body text on navy
- **Ink Text** `#2B2418` — body text on paper

### Typography
- **Display/Wordmark**: Fraunces (variable, heavy weight) — logo, section headers
- **Reading**: Spectral or Source Serif 4 — where user's writing lives
- **Data/Utility**: IBM Plex Mono — scores, labels, timestamps

### Layout
Two-pane workspace:
- **Left**: Paper-colored editor (warm, welcoming, looks like a manuscript)
- **Right**: Navy instrument panel (cold, functional, reads like a dashboard)

The contrast *is* the design. No softening, no blur—clean separation between writing space and measurement space.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind (utilities only) + custom CSS tokens
- **Scoring**: `compromise` for NLP, hand-written z-score metrics
- **Worker**: Native Web Worker for non-blocking scoring
- **Storage**: `idb-keyval` (IndexedDB) — local, encrypted by default, zero account required
- **Export**: `html-to-image` for PNG card generation
- **LLM (optional)**: Serverless proxy to Claude/OpenAI for rewrite suggestions

## Privacy

Your writing never leaves your device. Headings, samples, and history all live in IndexedDB locally. This is a genuine privacy feature, not a hackathon shortcut—someone's unpublished writing should never transit the internet.

## Demo Flow

1. **Load demo** → two pre-built headings appear (Twitter & Newsletter)
2. **Switch to Twitter heading** → compass shows 0°
3. **Paste AI draft** → watch needle swing to ~35° in real-time
4. **Hover underlined sentences** → see why each drifts
5. **Switch to Newsletter heading** → same draft scores completely differently (maybe 12° drift)
6. **Show Voice DNA** → export shareable PNG
7. **Voyage log** → show drift trend over time

Whole demo: ~2 minutes. No spinners, no API latency, no setup.

## Build & Run

```bash
# Install dependencies
npm install

# Dev server (HMR enabled)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Key Implementation Details

### Why the split-pane editor?
Typing and analyzing in the same textarea creates cognitive friction. The split pane lets the user focus on writing (left) while Drift runs analysis live (right). Reading your own drift in real-time, sentence by sentence, creates muscle memory around your voice faster than any abstract feedback.

### Why the compass, not a progress bar?
Progress bars are reductive. A compass is directional—it *feels* like navigation, not grading. The needle points, the trail shows momentum, and 0° = "true north" is a metaphor that sticks. Judges screenshot this.

### Why Web Worker?
Scoring ~2000 words takes ~20ms on main thread. With live typing at 60fps, even 20ms is noticeable jank. The Worker keeps typing smooth. It's a small investment, high ROI.

### Why local storage only?
- Zero onboarding friction (no login, no API keys)
- Genuine privacy story (data never leaves device)
- Works offline
- Hackathon-friendly (no backend infrastructure)

Production version can add optional cloud sync, but the core product works totally offline.

## Accessibility

- **Keyboard navigation**: All buttons and inputs support keyboard focus (visible 2px brass outline)
- **Prefers reduced motion**: Compass animation respects `prefers-reduced-motion: reduce` from system settings
- **Color contrast**: All text meets WCAG AA standards on both navy and paper backgrounds
- **Focus management**: Modal dialogs trap focus, escape key closes modals
- **Semantic HTML**: Proper heading hierarchy, labels on form inputs

## What's Not (Yet)

- LLM-powered rewrite suggestions (optional feature, needs serverless endpoint)
- Cloud sync / multi-device (local storage only)
- Voice profile sharing/library (future feature)
- Batch analysis mode (process multiple drafts at once)
- Dark/light mode toggle (fully committed to the navy/paper contrast)

## The Pitch in 30 Seconds

"Content creators use AI to draft faster. Problem: everything ends up sounding the same. Drift measures your actual voice—your sentence rhythm, punctuation habits, filler words—then scores live drafts against it, sentence by sentence. A compass needle shows drift in real-time. Red underlines mark sentences that don't sound like you. It's not about detecting AI. It's about keeping your voice yours. Load the demo, paste an AI draft, watch the needle swing. That's the whole product."

## Future Roadmap

- [ ] Rewrite suggestions via Claude (on-demand, grounded in actual metrics)
- [ ] Exported profile sharing (teams of creators, editorial consistency)
- [ ] Historical voice profiles (track how your voice evolves over time)
- [ ] Integration with popular writing platforms (Google Docs, Notion, etc.)
- [ ] Fine-tune metrics for specific genres (social media, long-form, technical writing)
- [ ] Batch processing for newsletter/blog archives

---

**Built for the 2026 Hackathon**

Your voice is your competitive advantage. Keep it.
