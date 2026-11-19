import gsap from 'gsap';
import { rotateVec, vlen, type Vec3 } from '@/lib/quantum/bloch';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

export interface TrailPoint {
  v: Vec3;
  t: number;
}

type Listener = () => void;

/**
 * Drives the displayed Bloch vector. Gate rotations are animated along the true rotation
 * (about the gate's axis on the sphere), not as jumps. Animations are queued so rapid taps play in order.
 */
export class BlochAnimator {
  /** displayed vector (Bloch coordinates) */
  current: Vec3;
  /** active rotation axis while a gate animates (for the guide) */
  axis: Vec3 | null = null;
  /** angle progressed so far (for the guide arc) */
  progressAngle = 0;
  totalAngle = 0;
  trail: TrailPoint[] = [];
  /** pulse 0…1 after a measurement */
  flash = 0;
  private queue: (() => gsap.core.Animation)[] = [];
  private running: gsap.core.Animation | null = null;
  private listeners = new Set<Listener>();

  constructor(initial: Vec3 = [0, 0, 1]) {
    this.current = [...initial];
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  get busy(): boolean {
    return this.running !== null || this.queue.length > 0;
  }

  private pushTrail(): void {
    const now = performance.now();
    const last = this.trail[this.trail.length - 1];
    if (
      last &&
      Math.hypot(last.v[0] - this.current[0], last.v[1] - this.current[1], last.v[2] - this.current[2]) < 0.012
    )
      return;
    this.trail.push({ v: [...this.current], t: now });
    if (this.trail.length > 240) this.trail.shift();
  }

  private next(): void {
    const make = this.queue.shift();
    if (!make) {
      this.running = null;
      this.axis = null;
      this.emit();
      return;
    }
    this.running = make();
  }

  private enqueue(make: () => gsap.core.Animation): void {
    this.queue.push(make);
    if (!this.running) this.next();
  }

  /** Rotate by `angle` about `axis` (Bloch coords), ending exactly at `target` (from the simulator). */
  rotate(axis: Vec3, angle: number, target: Vec3): void {
    this.enqueue(() => {
      const start: Vec3 = [...this.current];
      const reduce = prefersReducedMotion();
      const dur = reduce ? 0 : 0.45 + 0.38 * Math.min(Math.abs(angle), Math.PI);
      const state = { p: 0 };
      this.axis = axis;
      this.totalAngle = angle;
      return gsap.to(state, {
        p: 1,
        duration: dur,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.progressAngle = angle * state.p;
          this.current = rotateVec(start, axis, angle * state.p);
          this.pushTrail();
          this.emit();
        },
        onComplete: () => {
          this.current = [...target];
          this.pushTrail();
          this.next();
        },
      });
    });
  }

  /** Move to a target along the great circle / radial blend (sliders, noise, resets). */
  moveTo(target: Vec3, duration = 0.5, ease = 'power3.out'): void {
    this.enqueue(() => {
      const start: Vec3 = [...this.current];
      const state = { p: 0 };
      const ls = vlen(start),
        lt = vlen(target);
      return gsap.to(state, {
        p: 1,
        duration: prefersReducedMotion() ? 0 : duration,
        ease,
        onUpdate: () => {
          const p = state.p;
          // slerp the direction, lerp the length (so shrinking under noise reads clearly)
          const dir = slerpDir(start, target, p);
          const len = ls + (lt - ls) * p;
          this.current = [dir[0] * len, dir[1] * len, dir[2] * len];
          this.pushTrail();
          this.emit();
        },
        onComplete: () => {
          this.current = [...target];
          this.next();
        },
      });
    });
  }

  /** Instant set (no animation, clears queue). */
  set(target: Vec3): void {
    this.queue = [];
    this.running?.kill();
    this.running = null;
    this.axis = null;
    this.current = [...target];
    this.pushTrail();
    this.emit();
  }

  /** Measurement collapse: fast snap to a pole + flash. */
  collapse(target: Vec3): void {
    this.moveTo(target, 0.35, 'expo.out');
    this.enqueue(() => {
      const s = { f: 1 };
      return gsap.to(s, {
        f: 0,
        duration: prefersReducedMotion() ? 0 : 0.9,
        ease: 'power2.out',
        onStart: () => {
          this.flash = 1;
          this.emit();
        },
        onUpdate: () => {
          this.flash = s.f;
          this.emit();
        },
        onComplete: () => {
          this.flash = 0;
          this.next();
        },
      });
    });
  }

  clearTrail(): void {
    this.trail = [];
    this.emit();
  }

  dispose(): void {
    this.queue = [];
    this.running?.kill();
    this.listeners.clear();
  }
}

function slerpDir(a: Vec3, b: Vec3, t: number): Vec3 {
  const la = vlen(a) || 1,
    lb = vlen(b) || 1;
  const ua: Vec3 = [a[0] / la, a[1] / la, a[2] / la];
  const ub: Vec3 = [b[0] / lb, b[1] / lb, b[2] / lb];
  if (vlen(a) < 1e-6) return ub;
  if (vlen(b) < 1e-6) return ua;
  const dot = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2]));
  const om = Math.acos(dot);
  if (om < 1e-6) return ua;
  if (Math.PI - om < 1e-4) {
    // antipodal: go through any perpendicular
    const perp: Vec3 = Math.abs(ua[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const k = cross(ua, perp);
    const kl = vlen(k);
    return rotateVec(ua, [k[0] / kl, k[1] / kl, k[2] / kl], Math.PI * t);
  }
  const s = Math.sin(om);
  const wa = Math.sin((1 - t) * om) / s,
    wb = Math.sin(t * om) / s;
  return [ua[0] * wa + ub[0] * wb, ua[1] * wa + ub[1] * wb, ua[2] * wa + ub[2] * wb];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
