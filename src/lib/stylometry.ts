import nlp from 'compromise';

export interface StylemetricProfile {
  lexicalDiversity: {
    mean: number;
    stdDev: number;
  };
  sentenceLength: {
    mean: number;
    stdDev: number;
  };
  punctuation: {
    emDashes: number; // per 100 words
    semicolons: number;
    exclamationPoints: number;
    questionMarks: number;
    ellipses: number;
  };
  fillerWords: {
    frequency: number; // per 100 words
    words: string[];
  };
  sentenceOpeners: {
    coordinatingConjunctions: number; // And, But, So at sentence start
    questions: number;
    numbers: number;
    other: number;
  };
  contractionRate: number; // 0-1
  paragraphLength: {
    mean: number;
    stdDev: number;
  };
}

export interface SentenceScore {
  text: string;
  driftScore: number; // 0-1, where 1 is max drift
  metrics: {
    lengthDeviation: number;
    rhythmDeviation: number;
    punctuationDeviation: number;
    fillerDeviation: number;
  };
}

// Filler/tic words list
const FILLER_WORDS = [
  'actually',
  'honestly',
  'basically',
  'literally',
  'just',
  'so',
  'like',
  'kind of',
  'sort of',
  'i mean',
  'you know',
];

/**
 * Compute lexical diversity (type-token ratio) over a moving window
 */
export function computeLexicalDiversity(text: string, windowSize: number = 100): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const window = words.slice(0, Math.min(windowSize, words.length));
  const uniqueWords = new Set(window);
  return uniqueWords.size / window.length;
}

/**
 * Compute sentence lengths in words
 */
export function getSentenceLengths(text: string): number[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  return sentences.map((sentence: string) => {
    return sentence.split(/\s+/).filter(Boolean).length;
  });
}

/**
 * Compute mean and standard deviation of sentence lengths
 */
export function computeSentenceRhythm(text: string): { mean: number; stdDev: number } {
  const lengths = getSentenceLengths(text);
  if (lengths.length === 0) return { mean: 0, stdDev: 0 };

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Count punctuation frequency per 100 words
 */
export function computePunctuation(text: string): Record<string, number> {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const perHundredFactor = wordCount > 0 ? 100 / wordCount : 0;

  const emDashes = (text.match(/—/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const exclamationPoints = (text.match(/!/g) || []).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const ellipses = (text.match(/\.\.\./g) || []).length;

  return {
    emDashes: emDashes * perHundredFactor,
    semicolons: semicolons * perHundredFactor,
    exclamationPoints: exclamationPoints * perHundredFactor,
    questionMarks: questionMarks * perHundredFactor,
    ellipses: ellipses * perHundredFactor,
  };
}

/**
 * Count filler word frequency per 100 words
 */
export function computeFillerWords(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 0;

  const fillerCount = words.filter((word) =>
    FILLER_WORDS.some((filler) => word.includes(filler))
  ).length;

  return (fillerCount / wordCount) * 100;
}

/**
 * Analyze how sentences start
 */
export function computeSentenceOpeners(
  text: string
): Record<string, number> {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  let coordinatingConjunctions = 0;
  let questions = 0;
  let numbers = 0;
  let other = 0;

  sentences.forEach((sentence: string) => {
    const trimmed = sentence.trim();
    if (/^(And|But|So|Or|Yet|Because)\s/i.test(trimmed)) {
      coordinatingConjunctions++;
    } else if (/^\?/.test(trimmed)) {
      questions++;
    } else if (/^\d/.test(trimmed)) {
      numbers++;
    } else {
      other++;
    }
  });

  const total = sentences.length || 1;
  return {
    coordinatingConjunctions: (coordinatingConjunctions / total) * 100,
    questions: (questions / total) * 100,
    numbers: (numbers / total) * 100,
    other: (other / total) * 100,
  };
}

/**
 * Compute contraction rate (contracted vs full forms)
 */
export function computeContractionRate(text: string): number {
  const contractions = (text.match(/\b\w+n't\b|\b\w+'[a-z]{1,2}\b/gi) || []).length;
  const potentialContractions = (text.match(
    /\b(do|did|does|will|would|have|has|had|is|are|was|were|cannot|can not)\s+not\b/gi
  ) || []).length;

  const total = contractions + potentialContractions;
  return total > 0 ? contractions / total : 0;
}

/**
 * Get paragraph lengths
 */
export function getParagraphLengths(text: string): number[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((para) => para.split(/\s+/).filter(Boolean).length);
}

/**
 * Compute mean and std dev of paragraph lengths
 */
export function computeParagraphPacing(text: string): { mean: number; stdDev: number } {
  const lengths = getParagraphLengths(text);
  if (lengths.length === 0) return { mean: 0, stdDev: 0 };

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Build a complete stylometric profile from samples
 */
export function buildProfile(samples: string[]): StylemetricProfile {
  const allText = samples.join('\n\n');

  const lexicalDiversities = samples.map((sample) => computeLexicalDiversity(sample, 150));
  const lexicalDiversityMean = lexicalDiversities.reduce((a, b) => a + b, 0) / lexicalDiversities.length;
  const lexicalDiversityVar = lexicalDiversities.reduce(
    (sum, val) => sum + Math.pow(val - lexicalDiversityMean, 2),
    0
  ) / lexicalDiversities.length;

  const sentenceRhythm = computeSentenceRhythm(allText);

  const punctuation = computePunctuation(allText);

  const fillerFreq = computeFillerWords(allText);

  const sentenceOpeners = computeSentenceOpeners(allText);

  const contractionRate = computeContractionRate(allText);

  const paragraphPacing = computeParagraphPacing(allText);

  return {
    lexicalDiversity: {
      mean: lexicalDiversityMean,
      stdDev: Math.sqrt(lexicalDiversityVar),
    },
    sentenceLength: sentenceRhythm,
    punctuation: {
      emDashes: punctuation.emDashes,
      semicolons: punctuation.semicolons,
      exclamationPoints: punctuation.exclamationPoints,
      questionMarks: punctuation.questionMarks,
      ellipses: punctuation.ellipses,
    },
    fillerWords: {
      frequency: fillerFreq,
      words: FILLER_WORDS,
    },
    sentenceOpeners,
    contractionRate,
    paragraphLength: paragraphPacing,
  };
}

/**
 * Compute z-score deviation from profile
 */
function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return Math.abs((value - mean) / stdDev);
}

/**
 * Score a piece of text against a profile, sentence by sentence
 */
export function scoreAgainstProfile(text: string, profile: StylemetricProfile): SentenceScore[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  return sentences.map((sentence: string) => {
    const lengths = getSentenceLengths(sentence);
    const sentenceLengthMean = lengths.length > 0 ? lengths[0] : 0;

    const punctuation = computePunctuation(sentence);
    const fillerFreq = computeFillerWords(sentence);
    const contractionRate = computeContractionRate(sentence);

    // Compute deviations as z-scores
    const lengthDeviation = computeZScore(
      sentenceLengthMean,
      profile.sentenceLength.mean,
      profile.sentenceLength.stdDev
    );

    const rhythmDeviation = computeZScore(
      profile.sentenceLength.stdDev,
      profile.sentenceLength.stdDev,
      0.5 // arbitrary small stdDev for stability
    );

    const emDashDeviation = computeZScore(
      punctuation.emDashes,
      profile.punctuation.emDashes,
      1 // avoid division by zero
    );

    const fillerDeviation = computeZScore(
      fillerFreq,
      profile.fillerWords.frequency,
      Math.max(profile.fillerWords.frequency * 0.5, 0.1)
    );

    // Weighted combination into single drift score (0-1)
    const totalDeviation =
      lengthDeviation * 0.4 +
      rhythmDeviation * 0.2 +
      emDashDeviation * 0.2 +
      fillerDeviation * 0.2;

    // Normalize to 0-1 range
    const driftScore = Math.min(totalDeviation / 3, 1);

    return {
      text: sentence.trim(),
      driftScore,
      metrics: {
        lengthDeviation,
        rhythmDeviation,
        punctuationDeviation: emDashDeviation,
        fillerDeviation,
      },
    };
  });
}

/**
 * Compute overall drift as a single number (0-45 degrees for compass)
 */
export function computeOverallDrift(
  text: string,
  profile: StylemetricProfile
): number {
  const scores = scoreAgainstProfile(text, profile);
  if (scores.length === 0) return 0;

  const avgDrift = scores.reduce((sum, score) => sum + score.driftScore, 0) / scores.length;
  // Map 0-1 to 0-45 degrees
  return avgDrift * 45;
}
