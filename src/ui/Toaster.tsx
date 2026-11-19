import { X } from 'lucide-react';
import { useToasts } from '@/store/toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'panel pointer-events-auto flex max-w-md animate-rise items-center gap-3 px-4 py-2.5 text-sm',
            t.tone === 'error' && 'border-destructive/50 text-destructive',
          )}
        >
          <span className="break-all">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
