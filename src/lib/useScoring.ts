import { useEffect, useRef, useState, useCallback } from 'react';
import { StylemetricProfile } from './stylometry';

interface ScoringResult {
  drift: number;
  sentenceScores: Array<{
    text: string;
    driftScore: number;
  }>;
}

export function useScoring(profile: StylemetricProfile | null) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<ScoringResult>({ drift: 0, sentenceScores: [] });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentenceCompleteRef = useRef<number>(0);

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('./scoringWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      const { type, drift, sentenceScores } = event.data;
      if (type === 'result') {
        setResult({ drift, sentenceScores });
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  // Debounced scoring function
  const score = useCallback(
    (text: string, wasSentenceComplete: boolean) => {
      if (!profile || !workerRef.current) return;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If sentence just completed (., !, ?, newline), score immediately
      if (wasSentenceComplete) {
        lastSentenceCompleteRef.current = Date.now();
        workerRef.current.postMessage({
          type: 'score',
          text,
          profile,
        });
        return;
      }

      // Otherwise, debounce for 400ms of typing inactivity
      debounceTimerRef.current = setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'score',
            text,
            profile,
          });
        }
      }, 400);
    },
    [profile]
  );

  return { result, score };
}
