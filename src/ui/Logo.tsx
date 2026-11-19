import { cn } from '@/lib/utils';

/** Spooky mark: a sphere, its equator, and a state vector — drawn like a pen sketch. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse
        cx="16"
        cy="16"
        rx="11.5"
        ry="3.6"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".4"
        strokeWidth="1.2"
      />
      <path d="M16 16 L22.6 7.4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.6" cy="7.4" r="2.2" fill="var(--primary)" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-[1.35rem] leading-none font-semibold tracking-[-0.03em] italic">Spooky</span>
    </span>
  );
}
