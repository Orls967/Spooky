import { useEffect } from 'react';
import { useResolvedTheme, useSettings } from '@/store/settings';

/** Applies the theme preference to <html>, following the OS when set to "system". */
export function ThemeController(): null {
  const theme = useSettings((s) => s.theme);
  const setResolved = useResolvedTheme((s) => s.setResolved);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', dark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      root.style.backgroundColor = '';
      setResolved(dark ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme, setResolved]);

  return null;
}
