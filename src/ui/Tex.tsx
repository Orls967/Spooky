import { memo, useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

/** KaTeX renderer (synchronous, cached per expression). */
export const Tex = memo(function Tex({
  math,
  display = false,
  className,
}: {
  math: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(math, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' }),
    [math, display],
  );
  return (
    <span
      className={cn(display ? 'block overflow-x-auto overflow-y-hidden' : 'inline-block', className)}
      // KaTeX output is generated from our own trusted strings
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
