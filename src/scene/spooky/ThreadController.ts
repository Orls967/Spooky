import gsap from 'gsap';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Animated parameters of the "ghost thread" between the two qubits. Mutated by GSAP, read by the scene
 * each frame (no React re-render).
 */
export class ThreadController {
  /** 0…1 visible entanglement (concurrence) */
  strength = 1;
  /** position of a travelling flash along the thread (0 = Alice, 1 = Bob) */
  pulse = 0;
  pulseAmp = 0;
  private listeners = new Set<() => void>();

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  setStrength(target: number, duration = 0.8): gsap.core.Tween {
    return gsap.to(this, {
      strength: target,
      duration: prefersReducedMotion() ? 0 : duration,
      ease: 'power2.inOut',
      onUpdate: () => this.emit(),
    });
  }

  /** Lightning-like pulse from one side to the other. */
  flash(from: 'a' | 'b' = 'a', duration = 0.55): gsap.core.Timeline {
    const tl = gsap.timeline({ onUpdate: () => this.emit() });
    const reduce = prefersReducedMotion();
    this.pulse = from === 'a' ? 0 : 1;
    tl.set(this, { pulseAmp: 1 });
    tl.to(this, { pulse: from === 'a' ? 1 : 0, duration: reduce ? 0 : duration, ease: 'power3.in' });
    tl.to(this, { pulseAmp: 0, duration: reduce ? 0 : 0.35, ease: 'power2.out' });
    return tl;
  }
}
