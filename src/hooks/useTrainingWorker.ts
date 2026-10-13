import { useEffect, useRef, useCallback, useState } from 'react';
import Worker from 'web-worker';
import type { TrainResponse } from '@/workers/train.worker';
import type { CandidateRow } from '@/lib/types';

export type TrainProgressCallback = (progress: number, status: string) => void;
export type TrainDoneCallback = (response: TrainResponse) => void;

export function useTrainingWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const train = useCallback(
    (candidates: CandidateRow[], seed: number, onDone: TrainDoneCallback) => {
      setIsTraining(true);
      setProgress(0);
      setStatus('Starting...');

      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = new Worker(new URL('../workers/train.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          setProgress(msg.progress);
          setStatus(msg.status);
        } else if (msg.type === 'done') {
          setProgress(100);
          setStatus('Done');
          setIsTraining(false);
          onDone(msg.data as TrainResponse);
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = (e) => {
        setIsTraining(false);
        setStatus(`Error: ${e.message}`);
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ candidates, seed });
    },
    []
  );

  return { train, isTraining, progress, status };
}
