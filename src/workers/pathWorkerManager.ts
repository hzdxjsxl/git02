import { PathResult, GridResult } from '../types';

interface WorkerProgress {
  type: 'progress';
  progress: number;
  text: string;
}

interface WorkerResult {
  type: 'result';
  paths: PathResult[];
  error?: string;
}

type WorkerMessage = WorkerProgress | WorkerResult;

type ProgressCallback = (progress: number, text: string) => void;
type ResultCallback = (paths: PathResult[]) => void;
type ErrorCallback = (error: string) => void;

class PathWorkerManager {
  private worker: Worker | null = null;
  private progressCallback: ProgressCallback | null = null;
  private resultCallback: ResultCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private isBusy = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/pathFinder.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const data = e.data;

        if (data.type === 'progress') {
          this.progressCallback?.(data.progress, data.text);
        } else if (data.type === 'result') {
          this.isBusy = false;
          if (data.error) {
            this.errorCallback?.(data.error);
          } else {
            this.resultCallback?.(data.paths);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('Path worker error:', error);
        this.isBusy = false;
        this.errorCallback?.(error.message || 'Worker error');
      };
    } catch (error) {
      console.error('Failed to create path worker:', error);
    }
  }

  calculatePaths(
    gridResult: GridResult,
    numColors: number,
    onProgress: ProgressCallback,
    onResult: ResultCallback,
    onError?: ErrorCallback
  ): void {
    if (!this.worker) {
      onError?.('Worker not initialized');
      return;
    }

    if (this.isBusy) {
      console.warn('Path worker is busy, request ignored');
      return;
    }

    this.isBusy = true;
    this.progressCallback = onProgress;
    this.resultCallback = onResult;
    this.errorCallback = onError || null;

    this.worker.postMessage({
      colorMatrix: gridResult.colorMatrix,
      gridSize: gridResult.gridSize,
      numColors,
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isBusy = false;
  }

  get busy(): boolean {
    return this.isBusy;
  }
}

export const pathWorker = new PathWorkerManager();

export const calculatePathsAsync = (
  gridResult: GridResult,
  numColors: number,
  onProgress: ProgressCallback
): Promise<PathResult[]> => {
  return new Promise((resolve, reject) => {
    pathWorker.calculatePaths(
      gridResult,
      numColors,
      onProgress,
      resolve,
      reject
    );
  });
};
