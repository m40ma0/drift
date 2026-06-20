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
    emDashes: number;
    semicolons: number;
    exclamationPoints: number;
    questionMarks: number;
    ellipses: number;
    commas: number;
    colons: number;
    parentheses: number;
  };
  fillerWords: {
    frequency: number;
    words: string[];
  };
  sentenceOpeners: {
    coordinatingConjunctions: number;
    questions: number;
    numbers: number;
    other: number;
  };
  contractionRate: number;
  paragraphLength: {
    mean: number;
    stdDev: number;
  };
  topPhrases: string[];
  aiClicheCount: number;
  lexicalUniqueness: number;
  sentenceCount: number;
  paragraphCount: number;
}

export interface DriftReason {
  type: 'rhythm' | 'vocabulary' | 'punctuation' | 'pacing' | 'cliche';
  label: string;
}

export interface SentenceScore {
  text: string;
  driftScore: number;
  status: 'aligned' | 'slight-drift' | 'heavy-drift';
  reasons: DriftReason[];
  metrics: {
    lengthDeviation: number;
    rhythmDeviation: number;
    punctuationDeviation: number;
    fillerDeviation: number;
  };
}

const FILLER_WORDS = [
  'actually', 'honestly', 'basically', 'literally', 'just',
  'so', 'like', 'kind of', 'sort of', 'i mean', 'you know',
  'really', 'pretty', 'quite', 'anyway', 'well',
];

export const AI_CLICHE_PHRASES = [
  'delve into', 'game-changer', "in today's fast-paced",
  'paradigm shift', 'cutting-edge',
  'unprecedented', 'facilitate', 'utilize',
  'furthermore', 'moreover', 'in conclusion',
  'it is important to note', 'it is important to remember',
  'significant impact', 'key performance indicators', 'best practices',
  'synergy', 'ecosystem', 'holistic', 'robust',
  'scalable', 'streamline',
  'transformative', 'disruptive', 'groundbreaking',
  'state-of-the-art', 'world-class', 'next-generation',
  'user-centric', 'seamless', 'end-to-end',
  'actionable insights', 'thought leadership',
  'at the end of the day', 'moving forward',
  'deep dive', 'low-hanging fruit',
  'value proposition', 'core competency',
  'innovative solution', 'enhance user satisfaction',
  'performance optimization', 'across all key',
  'demonstrates a commitment',
  'comprehensive solutions', 'personalization and engagement',
  'unlock new opportunities', 'set yourself up for',
  'long-term success', 'daunting challenge',
  'exciting opportunity', 'key strategies',
  'can be a valuable', 'fully reflect',
  'remaining adaptable',
];

const AI_CLICHE_STEMS = [
  'leverag', 'optimi', 'innovat', 'comprehen',
  'empow', 'facilitat', 'utiliz', 'streamlin',
];

const CLICHE_REPLACEMENTS: Record<string, string> = {
  'paradigm shift': 'change',
  'leverage': 'use',
  'cutting-edge': 'latest',
  'unprecedented': 'unusual',
  'comprehensive': 'full',
  'facilitate': 'help',
  'utilize': 'use',
  'furthermore': 'also',
  'moreover': 'also',
  'optimize': 'improve',
  'streamline': 'simplify',
  'empower': 'help',
  'transformative': 'big',
  'scalable': 'flexible',
  'robust': 'solid',
  'holistic': 'overall',
  'seamless': 'smooth',
  'innovative': 'new',
  'disruptive': 'bold',
  'groundbreaking': 'new',
};

export { CLICHE_REPLACEMENTS };

export function computeLexicalDiversity(text: string, windowSize: number = 100): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const window = words.slice(0, Math.min(windowSize, words.length));
  const uniqueWords = new Set(window);
  return uniqueWords.size / window.length;
}

export function getSentenceLengths(text: string): number[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  return sentences.map((sentence: string) => {
    return sentence.split(/\s+/).filter(Boolean).length;
  });
}

export function computeSentenceRhythm(text: string): { mean: number; stdDev: number } {
  const lengths = getSentenceLengths(text);
  if (lengths.length === 0) return { mean: 0, stdDev: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

export function computePunctuation(text: string): Record<string, number> {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const perHundredFactor = wordCount > 0 ? 100 / wordCount : 0;

  return {
    emDashes: (text.match(/—/g) || []).length * perHundredFactor,
    semicolons: (text.match(/;/g) || []).length * perHundredFactor,
    exclamationPoints: (text.match(/!/g) || []).length * perHundredFactor,
    questionMarks: (text.match(/\?/g) || []).length * perHundredFactor,
    ellipses: (text.match(/\.\.\./g) || []).length * perHundredFactor,
    commas: (text.match(/,/g) || []).length * perHundredFactor,
    colons: (text.match(/:/g) || []).length * perHundredFactor,
    parentheses: (text.match(/[()]/g) || []).length * perHundredFactor,
  };
}

export function computeFillerWords(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const fillerCount = words.filter((word) =>
    FILLER_WORDS.some((filler) => word.includes(filler))
  ).length;
  return (fillerCount / words.length) * 100;
}

export function computeSentenceOpeners(text: string): Record<string, number> {
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
    } else if (/\?$/.test(trimmed)) {
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

export function computeContractionRate(text: string): number {
  const nts = (text.match(/\b\w+n't\b/gi) || []).length;
  const pronounS = (text.match(/\b(it|that|there|here|what|who|he|she|let|how|where|when|why)'s\b/gi) || []).length;
  const otherSuffixes = (text.match(/\b\w+'(re|ve|ll|d|m)\b/gi) || []).length;
  const contractions = nts + pronounS + otherSuffixes;

  const expandedNot = (text.match(
    /\b(do|did|does|will|would|could|should|have|has|had|is|are|was|were|cannot|can not)\s+not\b/gi
  ) || []).length;
  const expandedIs = (text.match(/\b(it|that|there)\s+is\b/gi) || []).length;
  const expandedOther = (text.match(/\b(they|we|you|I)\s+(are|have|will|am)\b/gi) || []).length;
  const potentialContractions = expandedNot + expandedIs + expandedOther;

  const total = contractions + potentialContractions;
  return total > 0 ? contractions / total : 0.5;
}

export function getParagraphLengths(text: string): number[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((para) => para.split(/\s+/).filter(Boolean).length);
}

export function computeParagraphPacing(text: string): { mean: number; stdDev: number } {
  const lengths = getParagraphLengths(text);
  if (lengths.length === 0) return { mean: 0, stdDev: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

export function extractNgrams(text: string, n: number = 2, topK: number = 10): string[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const ngrams = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'and',
    'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
    'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'than', 'too', 'very', 'just', 'about', 'this', 'that', 'these', 'those', 'it',
    'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
    'her', 'they', 'them', 'their', 'what', 'which', 'who', 'whom']);

  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n);
    if (gram.some(w => stopWords.has(w))) continue;
    const key = gram.join(' ');
    ngrams.set(key, (ngrams.get(key) || 0) + 1);
  }

  return Array.from(ngrams.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([phrase]) => phrase);
}

export function computeAIClicheCount(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of AI_CLICHE_PHRASES) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  const words = lower.split(/\s+/);
  for (const stem of AI_CLICHE_STEMS) {
    count += words.filter(w => w.startsWith(stem)).length;
  }
  return count;
}

export function findAIClichesInSentence(sentence: string): string[] {
  const lower = sentence.toLowerCase();
  const found: string[] = [];
  for (const phrase of AI_CLICHE_PHRASES) {
    if (lower.includes(phrase)) {
      found.push(phrase);
    }
  }
  const words = lower.split(/\s+/);
  for (const stem of AI_CLICHE_STEMS) {
    if (words.some(w => w.startsWith(stem))) {
      found.push(stem + '*');
    }
  }
  return found;
}

export function computeLexicalUniqueness(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

export function buildProfile(samples: string[]): StylemetricProfile {
  const allText = samples.join('\n\n');

  const lexicalDiversities = samples.map((sample) => computeLexicalDiversity(sample, 150));
  const lexicalDiversityMean = lexicalDiversities.reduce((a, b) => a + b, 0) / lexicalDiversities.length;
  const lexicalDiversityVar = lexicalDiversities.reduce(
    (sum, val) => sum + Math.pow(val - lexicalDiversityMean, 2), 0
  ) / lexicalDiversities.length;

  const sentenceRhythm = computeSentenceRhythm(allText);
  const punctuation = computePunctuation(allText);
  const fillerFreq = computeFillerWords(allText);
  const sentenceOpeners = computeSentenceOpeners(allText);
  const contractionRate = computeContractionRate(allText);
  const paragraphPacing = computeParagraphPacing(allText);
  const topPhrases = extractNgrams(allText, 2, 8);
  const aiClicheCount = computeAIClicheCount(allText);
  const lexicalUniqueness = computeLexicalUniqueness(allText);

  const doc = nlp(allText);
  const sentenceCount = doc.sentences().out('array').length;
  const paragraphCount = allText.split(/\n\n+/).filter(Boolean).length;

  return {
    lexicalDiversity: { mean: lexicalDiversityMean, stdDev: Math.sqrt(lexicalDiversityVar) },
    sentenceLength: sentenceRhythm,
    punctuation: {
      emDashes: punctuation.emDashes,
      semicolons: punctuation.semicolons,
      exclamationPoints: punctuation.exclamationPoints,
      questionMarks: punctuation.questionMarks,
      ellipses: punctuation.ellipses,
      commas: punctuation.commas || 0,
      colons: punctuation.colons || 0,
      parentheses: punctuation.parentheses || 0,
    },
    fillerWords: { frequency: fillerFreq, words: FILLER_WORDS },
    sentenceOpeners,
    contractionRate,
    paragraphLength: paragraphPacing,
    topPhrases,
    aiClicheCount,
    lexicalUniqueness,
    sentenceCount,
    paragraphCount,
  };
}

function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return Math.abs(value - mean) > 0.01 ? 1 : 0;
  return Math.abs((value - mean) / stdDev);
}

export function analyzeSentenceReasons(sentence: string, profile: StylemetricProfile): DriftReason[] {
  const reasons: DriftReason[] = [];
  const words = sentence.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const lengthDiff = Math.abs(wordCount - profile.sentenceLength.mean);
  if (lengthDiff > Math.max(profile.sentenceLength.stdDev * 1.5, 5)) {
    reasons.push({
      type: 'rhythm',
      label: wordCount > profile.sentenceLength.mean
        ? `Too long (${wordCount} words vs your avg ${Math.round(profile.sentenceLength.mean)})`
        : `Too short (${wordCount} words vs your avg ${Math.round(profile.sentenceLength.mean)})`,
    });
  }

  const cliches = findAIClichesInSentence(sentence);
  if (cliches.length > 0) {
    reasons.push({
      type: 'cliche',
      label: `AI-cliche detected: "${cliches[0]}"`,
    });
  }

  const hasContractions = /\b\w+n't\b/i.test(sentence) ||
    /\b(it|that|there|here|what|who|he|she|let)'s\b/i.test(sentence) ||
    /\b\w+'(re|ve|ll|d|m)\b/i.test(sentence);
  if (profile.contractionRate > 0.3 && !hasContractions && wordCount > 6) {
    const hasExpandedForms = /\b(do|does|did|will|would|could|should|is|are|was|were|have|has|had)\s+not\b/i.test(sentence) ||
      /\b(it|that|there)\s+is\b/i.test(sentence);
    if (hasExpandedForms) {
      reasons.push({
        type: 'vocabulary',
        label: `No contractions — you contract ${Math.round(profile.contractionRate * 100)}% of the time`,
      });
    }
  }

  if (FORMAL_PATTERNS.test(sentence)) {
    reasons.push({
      type: 'vocabulary',
      label: 'Vocabulary is more formal than your style',
    });
  }

  if (profile.punctuation.emDashes > 3 && !sentence.includes('—') && wordCount > 10) {
    reasons.push({
      type: 'punctuation',
      label: 'Missing em-dashes — you use them frequently',
    });
  }

  return reasons.slice(0, 3);
}

const FORMAL_PATTERNS = /\b(furthermore|additionally|consequently|nevertheless|notwithstanding|whereby|thereof|henceforth|aforementioned|prioritize|materialize|necessitate|substantive|pertaining|aforementioned|subsequently|accordingly|it is important to|it is worth noting|such as .+ and)\b/i;

export function scoreAgainstProfile(text: string, profile: StylemetricProfile): SentenceScore[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');

  return sentences.map((sentence: string) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Sentence length deviation
    const lengthDeviation = computeZScore(
      wordCount, profile.sentenceLength.mean, Math.max(profile.sentenceLength.stdDev, 2)
    );

    // 2. Contraction deviation — big differentiator between casual and formal
    let contractionDeviation = 0;
    if (profile.contractionRate > 0.3 && wordCount > 4) {
      const hasContractions = /\b\w+n't\b/i.test(sentence) ||
        /\b(it|that|there|here|what|who|he|she|let)'s\b/i.test(sentence) ||
        /\b\w+'(re|ve|ll|d|m)\b/i.test(sentence);
      const hasExpanded = /\b(do|does|did|will|would|could|should|is|are|was|were|have|has|had)\s+not\b/i.test(sentence) ||
        /\b(it|that|there)\s+is\b/i.test(sentence) ||
        /\b(they|we|you|I)\s+(are|have|will|am)\b/i.test(sentence);
      if (!hasContractions && hasExpanded) {
        contractionDeviation = Math.min(profile.contractionRate * 1.5, 1.0);
      } else if (!hasContractions && wordCount > 10) {
        contractionDeviation = Math.min(profile.contractionRate * 0.5, 0.5);
      }
    }

    // 3. AI cliche penalty
    const cliches = findAIClichesInSentence(sentence);
    const clichePenalty = Math.min(cliches.length * 0.5, 1.0);

    // 4. Formality penalty — detects corporate/academic register
    let formalityPenalty = 0;
    if (FORMAL_PATTERNS.test(sentence)) {
      formalityPenalty = 0.6;
    }
    const passiveIndicators = (sentence.match(/\b(is|are|was|were|been|be)\s+(being\s+)?\w+ed\b/gi) || []).length;
    if (passiveIndicators > 0 && profile.contractionRate > 0.5) {
      formalityPenalty = Math.max(formalityPenalty, 0.4);
    }

    // 5. Filler word deviation
    const fillerFreq = computeFillerWords(sentence);
    const fillerDeviation = computeZScore(
      fillerFreq, profile.fillerWords.frequency, Math.max(profile.fillerWords.frequency * 0.5, 2)
    );

    // 6. Punctuation deviation (check multiple types)
    const punct = computePunctuation(sentence);
    const punctDeviations = [
      computeZScore(punct.emDashes, profile.punctuation.emDashes, Math.max(profile.punctuation.emDashes * 0.5, 1)),
      computeZScore(punct.exclamationPoints, profile.punctuation.exclamationPoints, Math.max(profile.punctuation.exclamationPoints * 0.5, 2)),
    ];
    const punctuationDeviation = punctDeviations.reduce((a, b) => a + b, 0) / punctDeviations.length;

    // Weighted combination
    const totalDeviation =
      lengthDeviation * 0.18 +
      contractionDeviation * 0.22 +
      clichePenalty * 0.25 +
      formalityPenalty * 0.15 +
      fillerDeviation * 0.08 +
      punctuationDeviation * 0.12;

    const driftScore = Math.min(totalDeviation / 1.8, 1);

    const status: SentenceScore['status'] =
      driftScore < 0.3 ? 'aligned' :
      driftScore < 0.6 ? 'slight-drift' : 'heavy-drift';

    const reasons = analyzeSentenceReasons(sentence, profile);

    return {
      text: sentence.trim(),
      driftScore,
      status,
      reasons,
      metrics: {
        lengthDeviation,
        rhythmDeviation: contractionDeviation,
        punctuationDeviation,
        fillerDeviation,
      },
    };
  });
}

export function computeOverallDrift(text: string, profile: StylemetricProfile): number {
  const scores = scoreAgainstProfile(text, profile);
  if (scores.length === 0) return 0;
  const avgDrift = scores.reduce((sum, score) => sum + score.driftScore, 0) / scores.length;
  return avgDrift * 45;
}

export function computeDriftScore100(text: string, profile: StylemetricProfile): number {
  if (!text.trim()) return 0;

  const sentenceLengths = getSentenceLengths(text);
  if (sentenceLengths.length === 0) return 0;
  const avgLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

  // 1. Sentence length deviation (0-1)
  const lengthZ = computeZScore(avgLen, profile.sentenceLength.mean, Math.max(profile.sentenceLength.stdDev, 2));
  const lengthScore = Math.min(lengthZ / 3, 1);

  // 2. Contraction rate deviation (0-1)
  const textContractionRate = computeContractionRate(text);
  const contractionScore = Math.abs(textContractionRate - profile.contractionRate);

  // 3. AI cliche density (0-1)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const clicheCount = computeAIClicheCount(text);
  const clicheScore = Math.min(clicheCount / Math.max(wordCount / 25, 1), 1);

  // 4. Formality (0-1)
  const formalMatches = (text.match(FORMAL_PATTERNS) || []).length;
  const formalityScore = Math.min(formalMatches / Math.max(sentenceLengths.length * 0.5, 1), 1);

  // 5. Filler word deviation (0-1)
  const fillerFreq = computeFillerWords(text);
  const fillerZ = computeZScore(fillerFreq, profile.fillerWords.frequency, Math.max(profile.fillerWords.frequency * 0.5, 2));
  const fillerScore = Math.min(fillerZ / 3, 1);

  // 6. Punctuation deviation (0-1)
  const punct = computePunctuation(text);
  const emZ = computeZScore(punct.emDashes, profile.punctuation.emDashes, Math.max(profile.punctuation.emDashes * 0.5, 1));
  const exZ = computeZScore(punct.exclamationPoints, profile.punctuation.exclamationPoints, Math.max(profile.punctuation.exclamationPoints * 0.5, 2));
  const punctScore = Math.min((emZ + exZ) / 6, 1);

  const drift =
    lengthScore * 0.15 +
    contractionScore * 0.25 +
    clicheScore * 0.25 +
    formalityScore * 0.15 +
    fillerScore * 0.10 +
    punctScore * 0.10;

  return Math.min(Math.round(drift * 130), 100);
}

export function computeProfileSimilarity(textA: string, textB: string, profile: StylemetricProfile): {
  scoreA: number;
  scoreB: number;
  difference: number;
} {
  const scoreA = computeDriftScore100(textA, profile);
  const scoreB = computeDriftScore100(textB, profile);
  return { scoreA, scoreB, difference: Math.abs(scoreA - scoreB) };
}
