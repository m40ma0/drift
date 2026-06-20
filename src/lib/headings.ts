import { set, get, del, keys } from 'idb-keyval';
import { StylemetricProfile, buildProfile } from './stylometry';

export interface Heading {
  id: string;
  name: string;
  description: string; // "What's this voice for?"
  samples: string[];
  profile: StylemetricProfile;
  createdAt: number;
  updatedAt: number;
}

export interface DriftHistoryEntry {
  headingId: string;
  timestamp: number;
  driftScore: number; // 0-45 degrees
  textLength: number;
}

const HEADING_PREFIX = 'heading:';
const HISTORY_PREFIX = 'history:';

/**
 * Save a heading (voice profile) to IndexedDB
 */
export async function saveHeading(heading: Heading): Promise<void> {
  const key = `${HEADING_PREFIX}${heading.id}`;
  await set(key, heading);
}

/**
 * Load a heading by ID
 */
export async function loadHeading(id: string): Promise<Heading | undefined> {
  const key = `${HEADING_PREFIX}${id}`;
  return get(key);
}

/**
 * List all headings
 */
export async function listHeadings(): Promise<Heading[]> {
  const allKeys = await keys();
  const headingKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(HEADING_PREFIX));
  
  const headings = await Promise.all(
    headingKeys.map((k) => get(k as string))
  );
  
  return headings.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete a heading
 */
export async function deleteHeading(id: string): Promise<void> {
  const key = `${HEADING_PREFIX}${id}`;
  await del(key);
  
  // Also delete all history for this heading
  const allKeys = await keys();
  const historyKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(`${HISTORY_PREFIX}${id}:`)
  );
  
  for (const k of historyKeys) {
    await del(k as string);
  }
}

/**
 * Create a new heading from samples
 */
export async function createHeading(
  name: string,
  description: string,
  samples: string[]
): Promise<Heading> {
  if (samples.length < 3) {
    throw new Error('At least 3 samples required');
  }

  const profile = buildProfile(samples);
  const id = `heading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const heading: Heading = {
    id,
    name,
    description,
    samples,
    profile,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveHeading(heading);
  return heading;
}

/**
 * Record a drift history entry
 */
export async function recordDriftHistory(
  headingId: string,
  driftScore: number,
  textLength: number
): Promise<void> {
  const timestamp = Date.now();
  const key = `${HISTORY_PREFIX}${headingId}:${timestamp}`;
  const entry: DriftHistoryEntry = {
    headingId,
    timestamp,
    driftScore,
    textLength,
  };
  
  await set(key, entry);
}

/**
 * Get drift history for a heading
 */
export async function getDriftHistory(headingId: string): Promise<DriftHistoryEntry[]> {
  const allKeys = await keys();
  const historyKeys = allKeys.filter(
    (k) => typeof k === 'string' && k.startsWith(`${HISTORY_PREFIX}${headingId}:`)
  );
  
  const entries = await Promise.all(
    historyKeys.map((k) => get(k as string))
  );
  
  return entries
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get voice profile summary as plain English bullets
 */
export function getProfileSummary(profile: StylemetricProfile): string[] {
  const bullets: string[] = [];

  // Sentence rhythm
  const avgLength = Math.round(profile.sentenceLength.mean);
  const rhythm = profile.sentenceLength.stdDev;
  
  if (rhythm > 10) {
    bullets.push(
      `Your sentences average ${avgLength} words but swing wide—you mix short punches with longer runs.`
    );
  } else if (rhythm < 3) {
    bullets.push(`Your sentences are consistently around ${avgLength} words. Very measured.`);
  } else {
    bullets.push(`Your sentences average ${avgLength} words with natural variation.`);
  }

  // Punctuation
  if (profile.punctuation.emDashes > 5) {
    bullets.push(`You use em-dashes about ${Math.round(profile.punctuation.emDashes)}x more than typical.`);
  }

  if (profile.punctuation.exclamationPoints < 1) {
    bullets.push(`You almost never use exclamation points.`);
  } else if (profile.punctuation.exclamationPoints > 10) {
    bullets.push(`You're exclamation-point-heavy—about ${Math.round(profile.punctuation.exclamationPoints)} per 100 words.`);
  }

  // Contractions
  const contractionPct = Math.round(profile.contractionRate * 100);
  if (contractionPct > 70) {
    bullets.push(`You contract heavily—${contractionPct}% of do/have/will forms are contracted.`);
  } else if (contractionPct < 30) {
    bullets.push(`You tend to write out full forms like "do not" instead of "don't".`);
  }

  // Filler words
  if (profile.fillerWords.frequency > 5) {
    bullets.push(`Filler words like "literally" and "honestly" show up often in your voice.`);
  }

  // Lexical diversity
  const diversity = Math.round(profile.lexicalDiversity.mean * 100);
  if (diversity > 60) {
    bullets.push(`High vocabulary range—you repeat words less than average.`);
  } else if (diversity < 40) {
    bullets.push(`You tend to use a familiar set of words repeatedly.`);
  }

  return bullets.slice(0, 5); // Return max 5 bullets
}
