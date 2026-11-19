import * as Comlink from 'comlink';
import type { Circuit } from './quantum/circuit';
import type { SimulationResult } from './quantum/engine';
import type { SimWorkerApi } from '@/workers/sim.worker';

export interface SimClient {
  simulate(circuit: Circuit, seed: number): Promise<SimulationResult>;
  sampleShots(circuit: Circuit, shots: number, seed: number): Promise<Uint32Array>;
  /** true when simulation runs in a Web Worker */
  readonly inWorker: boolean;
}

let client: SimClient | null = null;

async function localClient(): Promise<SimClient> {
  const { simulate, sampleShots } = await import('./quantum/engine');
  return {
    inWorker: false,
    simulate: async (c, seed) => simulate(c, seed),
    sampleShots: async (c, shots, seed) => sampleShots(c, shots, seed),
  };
}

/**
 * Simulator client. Uses a module Web Worker (Comlink) so 10-qubit runs never block the UI;
 * falls back to the main thread when Workers are unavailable or fail to start.
 */
export async function getSimClient(): Promise<SimClient> {
  if (client) return client;
  if (typeof Worker === 'undefined') {
    client = await localClient();
    return client;
  }
  try {
    const worker = new Worker(new URL('../workers/sim.worker.ts', import.meta.url), {
      type: 'module',
      name: 'spooky-sim',
    });
    const remote = Comlink.wrap<SimWorkerApi>(worker);
    let fallback: SimClient | null = null;
    const viaWorker = async <T>(fn: () => Promise<T>, local: (c: SimClient) => Promise<T>): Promise<T> => {
      if (fallback) return local(fallback);
      try {
        return await fn();
      } catch (err) {
        console.warn('[spooky] worker failed, falling back to main thread', err);
        worker.terminate();
        fallback = await localClient();
        return local(fallback);
      }
    };
    worker.addEventListener('error', () => {
      void localClient().then((c) => (fallback = c));
    });
    client = {
      get inWorker() {
        return fallback === null;
      },
      simulate: (c, seed) =>
        viaWorker(
          () => remote.simulate(c, seed),
          (l) => l.simulate(c, seed),
        ),
      sampleShots: (c, shots, seed) =>
        viaWorker(
          () => remote.sampleShots(c, shots, seed),
          (l) => l.sampleShots(c, shots, seed),
        ),
    };
    return client;
  } catch {
    client = await localClient();
    return client;
  }
}
