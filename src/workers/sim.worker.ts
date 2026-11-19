/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import { simulate, sampleShots } from '@/lib/quantum/engine';
import type { Circuit } from '@/lib/quantum/circuit';

const api = {
  simulate(circuit: Circuit, seed: number) {
    const res = simulate(circuit, seed);
    const transfers = res.snapshots.flatMap((s) => [s.amplitudes.buffer, s.probabilities.buffer]);
    return Comlink.transfer(res, transfers as Transferable[]);
  },
  sampleShots(circuit: Circuit, shots: number, seed: number) {
    const counts = sampleShots(circuit, shots, seed);
    return Comlink.transfer(counts, [counts.buffer]);
  },
};

export type SimWorkerApi = typeof api;

Comlink.expose(api);
