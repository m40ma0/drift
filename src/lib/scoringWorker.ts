import { computeOverallDrift, scoreAgainstProfile, StylemetricProfile } from './stylometry';

interface ScoringMessage {
  type: 'score';
  text: string;
  profile: StylemetricProfile;
}

interface ScoringResult {
  type: 'result';
  drift: number;
  sentenceScores: Array<{
    text: string;
    driftScore: number;
  }>;
}

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent<ScoringMessage>) => {
  const { type, text, profile } = event.data;

  if (type === 'score') {
    try {
      // Compute overall drift (0-45 degrees)
      const drift = computeOverallDrift(text, profile);

      // Get sentence-level scores for highlighting
      const sentenceScores = scoreAgainstProfile(text, profile).map((score) => ({
        text: score.text,
        driftScore: score.driftScore,
      }));

      const result: ScoringResult = {
        type: 'result',
        drift,
        sentenceScores,
      };

      self.postMessage(result);
    } catch (error) {
      console.error('Scoring error:', error);
      self.postMessage({
        type: 'error',
        message: (error as Error).message,
      });
    }
  }
};

export {};
