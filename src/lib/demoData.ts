import { Heading } from './headings';

/**
 * Pre-baked demo heading with realistic sample data
 */
export const demoPunchydHeading: Heading = {
  id: 'demo_punchy_voice',
  name: 'Twitter',
  description: 'Short-form social posts',
  samples: [
    `I love this. It's so good. Really great. Who knew? Not me. But honestly, it works. And it's fast. Super fast. Incredible, honestly.`,
    `Just finished the most chaotic sprint ever. But we shipped. We actually shipped. The team crushed it. Zero regrets. Well, maybe like three regrets, but who's counting?`,
    `Hot take: good design is invisible. You don't notice it. You just feel it. If you're noticing the design, something went wrong. Anyway here's a thread about that.`,
  ],
  profile: {
    lexicalDiversity: {
      mean: 0.52,
      stdDev: 0.08,
    },
    sentenceLength: {
      mean: 9.8,
      stdDev: 6.2,
    },
    punctuation: {
      emDashes: 2.1,
      semicolons: 0.5,
      exclamationPoints: 18.3,
      questionMarks: 5.4,
      ellipses: 3.2,
    },
    fillerWords: {
      frequency: 8.1,
      words: [
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
      ],
    },
    sentenceOpeners: {
      coordinatingConjunctions: 22,
      questions: 8,
      numbers: 2,
      other: 68,
    },
    contractionRate: 0.82,
    paragraphLength: {
      mean: 45,
      stdDev: 18,
    },
  },
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 86400000,
};

export const demoNewsletterHeading: Heading = {
  id: 'demo_newsletter_voice',
  name: 'Newsletter',
  description: 'Long-form essays and analysis',
  samples: [
    `The way we express ourselves through written word has fundamentally changed over the past decade. Consider the implications of this shift—it affects everything from how we think to how we connect with others. This matters more than we realize.`,
    `There's a quiet revolution happening in how creators think about their craft. Not the flashy kind with listicles and viral moments, but the deep kind where people are asking harder questions about what they actually want to say and why.`,
    `I've been thinking about authenticity a lot lately. What does it mean to be authentic online? Is it even possible when there's always an audience? These questions don't have easy answers, but wrestling with them is what makes the work worthwhile.`,
  ],
  profile: {
    lexicalDiversity: {
      mean: 0.68,
      stdDev: 0.06,
    },
    sentenceLength: {
      mean: 18.2,
      stdDev: 4.8,
    },
    punctuation: {
      emDashes: 8.4,
      semicolons: 3.2,
      exclamationPoints: 2.1,
      questionMarks: 4.8,
      ellipses: 0.8,
    },
    fillerWords: {
      frequency: 2.3,
      words: [
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
      ],
    },
    sentenceOpeners: {
      coordinatingConjunctions: 8,
      questions: 6,
      numbers: 3,
      other: 83,
    },
    contractionRate: 0.64,
    paragraphLength: {
      mean: 72,
      stdDev: 22,
    },
  },
  createdAt: Date.now() - 172800000,
  updatedAt: Date.now() - 172800000,
};

/**
 * Example AI-polished draft that drifts from the punchy voice
 */
export const demoAIDraft = `This innovative platform represents a paradigm shift in how we approach digital communication. The sophisticated algorithms enable unprecedented levels of personalization and engagement. Furthermore, the implementation demonstrates a commitment to both accessibility and performance optimization. We believe that our comprehensive solutions will significantly enhance user satisfaction metrics across all key performance indicators.`;

/**
 * Load demo data into IndexedDB
 */
export async function loadDemoData() {
  const { saveHeading } = await import('./headings');
  
  try {
    await saveHeading(demoPunchydHeading);
    await saveHeading(demoNewsletterHeading);
    return true;
  } catch (err) {
    console.error('Failed to load demo data:', err);
    return false;
  }
}
