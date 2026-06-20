# Drift — Your Voice, Unflattened

> AI detectors ask if it was written by AI. **Drift asks if it still sounds like you.**

Drift is a voice-preservation writing tool for creators who use AI drafts but don't want their personal voice to flatten into generic AI writing. It measures your actual writing fingerprint, detects where AI flattened it, and rewrites only the drifted parts back into your voice.

**Drift is not an AI detector. Drift is not an AI humanizer.** It is a creator tool that answers one question: *does this still sound like me?*

## Features

### Editor
Live writing surface with sentence-by-sentence drift analysis. Paste a draft, see where your voice disappeared, and restore it.
- Real-time drift score (0-100)
- Sentence highlighting: aligned / slight drift / heavy drift
- Drift reasons per sentence (rhythm, vocabulary, punctuation, AI-cliche)
- "Restore my voice" rewrite suggestions
- Voice Lock toggle (warns when rewrites over-polish)
- Voice Receipt showing what changed and why

### Voice Profile
Build and manage your writing fingerprint from 3+ writing samples.
- One-click "Load Demo Voice" for instant testing
- Fingerprint cards: sentence rhythm, punctuation habits, vocabulary, common phrases, filler words, paragraph rhythm
- Confidence indicator based on sample count
- Local storage — nothing leaves your device

### Compare
Side-by-side draft comparison — the demo wow moment.
- Two text areas: Generic AI Draft vs Creator Voice Draft
- Two compass gauges showing drift for each
- Verdict line: "Draft B is 42 points closer to your voice"
- "Load Demo Compare" for instant judge-ready demo

### Voyage Log
Track your voice drift over time. Proves the social value story: are creators slowly losing their voice?
- Timeline chart of drift scores
- Trend analysis: "Your voice is staying consistent" or "Your last 3 drafts are becoming more generic"
- Local-only privacy

### Voice DNA
Screenshot-worthy share card showing your unique writing fingerprint.
- Voice traits, signature phrases, punctuation style, rhythm summary
- Export as PNG or copy as text
- Confidence level and sample count

## Hackathon Judging Alignment

| Category | How Drift Delivers |
|----------|-------------------|
| **Originality** | Not a detector or humanizer — a voice-preservation engine. Novel framing. |
| **Presentation** | Compare tab is the wow moment. Voice DNA is the closing screenshot. |
| **Social Value** | Creators losing their voice to AI is a real, growing problem. Voyage Log proves the trend. |
| **UI/UX** | Polished tabbed app, compass motif, sentence-level highlights, empty states. |
| **Technical** | Client-side stylometry, Web Worker scoring, deterministic analysis, mock AI rewrites. |
| **Impact** | Any creator using AI can use Drift today, locally, with zero setup. |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + custom design tokens
- **NLP**: compromise.js for sentence parsing
- **Scoring**: Custom stylometric z-score engine
- **Worker**: Web Worker for non-blocking live scoring
- **Storage**: IndexedDB via idb-keyval (local, no account required)
- **Export**: html-to-image for PNG card generation

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Docker Setup

```bash
# Build and run
docker compose up --build

# Or manually
docker build -t drift .
docker run -p 8080:80 drift
```

Open [http://localhost:8080](http://localhost:8080).

## Demo Script

Follow this sequence for the strongest presentation:

1. **Voice Profile tab** → Click "Load Demo Voice" → voice fingerprint appears instantly
2. **Voice Profile tab** → Review fingerprint cards (sentence rhythm, punctuation, vocabulary)
3. **Compare tab** → Click "Load Demo Compare" → two drafts appear, analyzed
4. **Compare tab** → Show the verdict: "Draft B is X points closer to your voice"
5. **Editor tab** → Paste a generic AI paragraph → watch drift score climb
6. **Editor tab** → Click "Restore my voice" on a flagged sentence → show rewrite + Voice Receipt
7. **Voice DNA tab** → Show the polished DNA card → export as PNG

Total demo time: ~2 minutes. No API keys needed. No spinners. No setup.

## Privacy

All data stays in your browser. Writing samples, profiles, and history are stored in IndexedDB locally. Nothing is transmitted to any server. This is a genuine privacy feature — a creator's unpublished writing should never transit the internet.

## Architecture

```
src/
├── app/
│   └── App.tsx                 # Tabbed shell, state management, profile selector
├── components/
│   ├── EditorTab.tsx           # Live editor with drift analysis + rewrite panel
│   ├── VoiceProfileTab.tsx     # Sample management + fingerprint cards
│   ├── CompareTab.tsx          # Side-by-side draft comparison
│   ├── VoyageLogTab.tsx        # Drift timeline + trend analysis
│   ├── VoiceDNATab.tsx         # Shareable voice card + export
│   └── CompassGauge.tsx        # Animated SVG compass gauge
├── lib/
│   ├── stylometry.ts           # Stylometric analysis engine
│   ├── rewrite.ts              # Mock rewrite suggestion engine
│   ├── scoringWorker.ts        # Web Worker for non-blocking scoring
│   ├── useScoring.ts           # React hook wrapping worker
│   ├── headings.ts             # IndexedDB CRUD for voice profiles
│   └── demoData.ts             # Pre-built demo profiles + compare texts
└── index.css                   # Design tokens, fonts, Tailwind layers
```

## Design System

| Token | Hex | Usage |
|-------|-----|-------|
| Ink Navy | `#101826` | App background |
| Chart Paper | `#F1EAD6` | Editor surfaces |
| Brass | `#C98A3E` | Primary accent, on-course |
| Signal Cyan | `#4FD8C4` | Aligned state, data trails |
| Alert Coral | `#E2604F` | Heavy drift warnings |
| Slate Text | `#C9D3DC` | Body text on dark |
| Ink Text | `#2B2418` | Body text on light |

**Typography**: Fraunces (display), Spectral (body), IBM Plex Mono (data/labels)

---

Built for [Youth Code x AI 2026](https://youth-code-x-ai-29376.devpost.com/). Your voice is your competitive advantage. Keep it.
