import { useEffect, useRef, useState } from 'react';
import type { Circuit } from '@/lib/quantum/circuit';
import type { SimulationResult } from '@/lib/quantum/engine';
import { getSimClient } from '@/lib/sim-client';

/** Simulate a circuit in the Web Worker (debounced); keeps the last result while recomputing. */
export function useSimulation(circuit: Circuit, seed: number) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [inWorker, setInWorker] = useState(true);
  const ticket = useRef(0);
  useEffect(() => {
    const my = ++ticket.current;
    const id = setTimeout(() => {
      void getSimClient().then(async (client) => {
        try {
          const r = await client.simulate(circuit, seed);
          if (my === ticket.current) {
            setResult(r);
            setInWorker(client.inWorker);
          }
        } catch (e) {
          console.error(e);
        }
      });
    }, 40);
    return () => clearTimeout(id);
  }, [circuit, seed]);
  return { result, inWorker };
}
