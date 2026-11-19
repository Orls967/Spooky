import * as React from 'react';
import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border border-b-2 bg-card px-1 font-mono text-[0.65rem] text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
