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
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const train = useCallback(
    (candidates: CandidateRow[], seed: number, onDone: TrainDoneCallback) => {
      workerRef.current?.terminate();
      workerRef.current = null;

      setIsTraining(true);
      setProgress(0);
      setStatus('Starting...');

      let worker: Worker;

      try {
        worker = new Worker(
          new URL('../workers/train.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        setIsTraining(false);
        setStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        return;
      }

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

          worker.terminate();
          if (workerRef.current === worker) {
            workerRef.current = null;
          }

          onDone(msg.data as TrainResponse);
        } else if (msg.type === 'error') {
          setIsTraining(false);
          setStatus(
            `Error: ${msg.message || 'Training failed.'}`
          );
          worker.terminate();

          if (workerRef.current === worker) {
            workerRef.current = null;
          }
        }
      };

      worker.onerror = (e) => {
        setIsTraining(false);
        setStatus(`Error: ${e.message || 'Worker failed.'}`);
        worker.terminate();

        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      };

      try {
        worker.postMessage({ candidates, seed });
      } catch (error) {
        setIsTraining(false);
        setStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        worker.terminate();

        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      }
    },
    []
  );

  return { train, isTraining, progress, status };
}
