import { StylemetricProfile, CLICHE_REPLACEMENTS, findAIClichesInSentence, computeDriftScore100, computeVoiceArchetype } from './stylometry';

export interface RewriteSuggestion {
  original: string;
  rewritten: string;
  explanation: string;
  changes: string[];
}

export interface VoiceReceipt {
  changes: string[];
  scoreBefore: number;
  scoreAfter: number;
  sentencesChanged: number;
}

const CONTRACTION_MAP: [RegExp, string][] = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\bIt is\b/g, "It's"],
  [/\bit is\b/g, "it's"],
  [/\bThat is\b/g, "That's"],
  [/\bthat is\b/g, "that's"],
  [/\bThere is\b/g, "There's"],
  [/\bthere is\b/g, "there's"],
  [/\bI am\b/g, "I'm"],
  [/\bI have\b/g, "I've"],
  [/\bI will\b/g, "I'll"],
  [/\bWe are\b/g, "We're"],
  [/\bwe are\b/g, "we're"],
  [/\bWe have\b/g, "We've"],
  [/\bwe have\b/g, "we've"],
  [/\bThey are\b/g, "They're"],
  [/\bthey are\b/g, "they're"],
  [/\bYou are\b/g, "You're"],
  [/\byou are\b/g, "you're"],
];

function addContractions(text: string): string {
  let result = text;
  for (const [pattern, replacement] of CONTRACTION_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function replaceCliches(text: string): string {
  let result = text;
  for (const [cliche, replacement] of Object.entries(CLICHE_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  return result;
}

export function generateMockRewrites(
  sentence: string,
  profile: StylemetricProfile
): RewriteSuggestion[] {
  const suggestions: RewriteSuggestion[] = [];

  // Suggestion 1: Apply contractions + remove cliches
  {
    let rewritten = sentence;
    const changes: string[] = [];

    if (profile.contractionRate > 0.4) {
      const contracted = addContractions(rewritten);
      if (contracted !== rewritten) {
        changes.push(`Added contractions (you contract ${Math.round(profile.contractionRate * 100)}% of the time)`);
        rewritten = contracted;
      }
    }

    const cliches = findAIClichesInSentence(sentence);
    if (cliches.length > 0) {
      const deCliched = replaceCliches(rewritten);
      if (deCliched !== rewritten) {
        changes.push(`Replaced AI-cliche "${cliches[0]}" with simpler language`);
        rewritten = deCliched;
      }
    }

    const formalWords = /\b(Furthermore|Additionally|Consequently|Nevertheless|Moreover)\b/g;
    rewritten = rewritten.replace(formalWords, (match) => {
      const replacements: Record<string, string> = {
        'Furthermore': 'Also',
        'Additionally': 'Plus',
        'Consequently': 'So',
        'Nevertheless': 'Still',
        'Moreover': 'And',
      };
      const r = replacements[match];
      if (r) {
        changes.push(`Replaced "${match}" with "${r}" to match your casual tone`);
        return r;
      }
      return match;
    });

    if (changes.length > 0) {
      suggestions.push({
        original: sentence,
        rewritten,
        explanation: 'Closer to your vocabulary and rhythm',
        changes,
      });
    }
  }

  // Suggestion 2: Shorten if too long
  const wordCount = sentence.split(/\s+/).filter(Boolean).length;
  if (wordCount > profile.sentenceLength.mean * 1.5 && wordCount > 15) {
    const splitPoints = [/,\s*(and|but|so|or|yet)\s+/i, /;\s*/,  /\s*—\s*/];
    let rewritten = sentence;
    let didSplit = false;

    for (const splitPoint of splitPoints) {
      const match = rewritten.match(splitPoint);
      if (match && match.index && match.index > 10) {
        const before = rewritten.slice(0, match.index).trim();
        let after = rewritten.slice(match.index + match[0].length).trim();
        if (after.length > 0) {
          after = after.charAt(0).toUpperCase() + after.slice(1);
          rewritten = before + '. ' + after;
          didSplit = true;
          break;
        }
      }
    }

    if (didSplit) {
      if (profile.contractionRate > 0.4) {
        rewritten = addContractions(rewritten);
      }
      rewritten = replaceCliches(rewritten);

      suggestions.push({
        original: sentence,
        rewritten,
        explanation: `Shortened to match your ~${Math.round(profile.sentenceLength.mean)} word rhythm`,
        changes: [
          `Split long sentence (${wordCount} words) into shorter segments`,
          `Your average sentence is ${Math.round(profile.sentenceLength.mean)} words`,
        ],
      });
    }
  }

  if (suggestions.length === 0) {
    let rewritten = addContractions(replaceCliches(sentence));
    if (rewritten !== sentence) {
      suggestions.push({
        original: sentence,
        rewritten,
        explanation: 'Minor voice adjustments',
        changes: ['Applied small style tweaks to better match your patterns'],
      });
    }
  }

  if (suggestions.length === 0) {
    const words = sentence.split(/\s+/).filter(Boolean);
    const targetLen = Math.round(profile.sentenceLength.mean);
    suggestions.push({
      original: sentence,
      rewritten: sentence,
      explanation: `This sentence drifts from your voice but has no direct text-level fix. Your rhythm averages ~${targetLen} words; this one has ${words.length}.`,
      changes: [`Consider rewriting to match your ~${targetLen}-word rhythm`, 'Try using your usual vocabulary and punctuation'],
    });
  }

  return suggestions;
}

export type PlatformMode = 'general' | 'social' | 'essay' | 'newsletter' | 'blog' | 'application' | 'founder';

const PLATFORM_HINTS: Record<PlatformMode, string> = {
  general: '',
  social: 'Keep it short and punchy. Under 280 characters if possible.',
  essay: 'Maintain depth and flow. Longer sentences are fine if they serve the argument.',
  newsletter: 'Conversational but structured. Use transitions. Address the reader directly.',
  blog: 'Informative but personal. Use concrete examples. Avoid jargon where possible.',
  application: 'Sincere and specific. Show, don\'t tell. Avoid cliches about passion and growth.',
  founder: 'Direct and data-informed. Lead with results, then context. Skip the fluff.',
};

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

export async function generateLLMRewrite(
  sentence: string,
  profile: StylemetricProfile,
  _mode: PlatformMode = 'general',
  sampleCount: number = 3,
): Promise<RewriteSuggestion | null> {
  if (typeof window === 'undefined') return null;
  const geminiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('drift-gemini-key');
  const openaiKey = import.meta.env.VITE_OPENAI_KEY || localStorage.getItem('drift-openai-key');
  if (!geminiKey && !openaiKey) return null;

  const archetype = computeVoiceArchetype(profile, sampleCount);
  const platformHint = PLATFORM_HINTS[_mode];

  const prompt = `You are a voice-preservation editor. Rewrite ONE sentence so it matches the creator's writing fingerprint while preserving the original meaning.

Creator voice profile:
- Archetype: ${archetype.name} — ${archetype.description}
- Average sentence: ${Math.round(profile.sentenceLength.mean)} words
- Contraction rate: ${Math.round(profile.contractionRate * 100)}%
- Formality: ${archetype.formalityLevel}
- Rhythm: ${archetype.rhythmSignature}
- Punctuation: ${archetype.punctuationSignature}
- Do NOT flatten: ${archetype.doNotFlatten.join('; ')}
${platformHint ? `\nPlatform context: ${platformHint}` : ''}

Sentence to rewrite:
"${sentence}"

Return ONLY a JSON object with no extra text:
{"rewritten": "the rewritten sentence", "explanation": "1-sentence explanation of what changed"}`;

  try {
    const raw = geminiKey
      ? await callGemini(prompt, geminiKey)
      : await callOpenAI(prompt, openaiKey!);
    if (!raw) return null;
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      original: sentence,
      rewritten: parsed.rewritten,
      explanation: parsed.explanation || 'Rewritten to match your voice',
      changes: ['Rewritten by AI to match your voice fingerprint'],
    };
  } catch {
    return null;
  }
}

export function generateVoiceReceipt(
  originalScores: Array<{ text: string; driftScore: number }>,
  newText: string,
  profile: StylemetricProfile,
  _scoreBefore: number
): VoiceReceipt {
  const changes: string[] = [];
  const sentencesChanged = originalScores.filter(s => s.driftScore > 0.3).length;

  const avgLength = Math.round(profile.sentenceLength.mean);
  if (sentencesChanged > 0) {
    changes.push(`Adjusted ${sentencesChanged} sentence(s) toward your ${avgLength}-word rhythm`);
  }

  if (profile.contractionRate > 0.5) {
    const contractionsBefore = (originalScores.map(s => s.text).join(' ').match(/\b\w+\s+not\b/gi) || []).length;
    const contractionsAfter = (newText.match(/\b\w+\s+not\b/gi) || []).length;
    if (contractionsBefore > contractionsAfter) {
      changes.push(`Added ${contractionsBefore - contractionsAfter} contraction(s) (you contract ${Math.round(profile.contractionRate * 100)}%)`);
    }
  }

  const clichesBefore = originalScores.reduce((count, s) => count + findAIClichesInSentence(s.text).length, 0);
  const clichesAfter = findAIClichesInSentence(newText).length;
  if (clichesBefore > clichesAfter) {
    changes.push(`Removed ${clichesBefore - clichesAfter} AI-cliche phrase(s)`);
  }

  if (changes.length === 0) {
    changes.push('Minor adjustments to match your voice fingerprint');
  }

  const scoreAfter = computeDriftScore100(newText, profile);

  return {
    changes,
    scoreBefore: _scoreBefore,
    scoreAfter,
    sentencesChanged,
  };
}
