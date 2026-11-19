import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Languages, SunMoon } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useUI } from '@/store/ui';
import { useResolvedTheme, useSettings } from '@/store/settings';
import { MODULES } from './routes';
import { useSearchEntries } from './searchEntries';

export function SearchCommand() {
  const { t } = useTranslation();
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const groups = useSearchEntries();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUI.getState().searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const go = (path: string) => {
    setOpen(false);
    void navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t('search.title')} description={t('header.searchHint')}>
      <CommandInput placeholder={t('search.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('search.empty')}</CommandEmpty>
        <CommandGroup heading={t('search.groupModules')}>
          {MODULES.map((m) => (
            <CommandItem
              key={m.key}
              value={`${t(`nav.${m.key}`)} ${t(`modules.${m.key}`)}`}
              onSelect={() => go(m.path)}
            >
              <m.icon />
              <span className="flex flex-col">
                <span>{t(`nav.${m.key}`)}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{t(`modules.${m.key}`)}</span>
              </span>
              <CommandShortcut>{m.index}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        {groups.map((g) => (
          <CommandGroup key={g.heading} heading={g.heading}>
            {g.items.map((it) => (
              <CommandItem key={it.id} value={`${it.label} ${it.keywords ?? ''}`} onSelect={() => go(it.path)}>
                <g.icon />
                <span className="flex min-w-0 flex-col">
                  <span>{it.label}</span>
                  {it.hint && <span className="line-clamp-1 text-xs text-muted-foreground">{it.hint}</span>}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading={t('search.groupActions')}>
          <CommandItem
            value="theme tema dark light gelap terang"
            onSelect={() => {
              useSettings.getState().setTheme(useResolvedTheme.getState().resolved === 'dark' ? 'light' : 'dark');
              setOpen(false);
            }}
          >
            <SunMoon /> {t('search.toggleTheme')}
          </CommandItem>
          <CommandItem
            value="language bahasa english indonesia"
            onSelect={() => {
              const s = useSettings.getState();
              s.setLang(s.lang === 'id' ? 'en' : 'id');
              setOpen(false);
            }}
          >
            <Languages /> {t('search.toggleLang')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
