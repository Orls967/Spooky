import { NavLink, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu, Monitor, Moon, Search, Sun, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useResolvedTheme, useSettings, type Lang, type ThemePref } from '@/store/settings';
import { useUI } from '@/store/ui';
import { Wordmark } from './Logo';
import { MODULES } from './routes';
import { useState } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const setSearchOpen = useUI((s) => s.setSearchOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t('nav.menu')}>
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="gap-0 p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle asChild>
                <span>
                  <Wordmark />
                </span>
              </SheetTitle>
              <SheetDescription>{t('brand.tagline')}</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-0.5 overflow-y-auto p-3" aria-label={t('nav.modules')}>
              {MODULES.map((m) => (
                <NavLink
                  key={m.key}
                  to={m.path}
                  end={m.path === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-baseline gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-secondary',
                      isActive && 'bg-secondary',
                    )
                  }
                >
                  <span className="num text-xs text-muted-foreground group-aria-[current=page]:text-primary">
                    {m.index}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{t(`nav.${m.key}`)}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{t(`modules.${m.key}`)}</span>
                  </span>
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0 rounded-md text-foreground" aria-label="Spooky">
          <Wordmark />
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label={t('nav.modules')}>
          {MODULES.filter((m) => m.key !== 'intro' && m.key !== 'about').map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                cn(
                  'relative rounded-md px-2.5 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground',
                  isActive &&
                    'text-foreground after:absolute after:inset-x-2.5 after:-bottom-[11px] after:h-[2px] after:bg-primary',
                )
              }
            >
              {t(`nav.${m.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="w-9 justify-center px-0 text-muted-foreground sm:w-44 sm:justify-start sm:px-2.5"
            aria-label={t('header.searchHint')}
          >
            <Search />
            <span className="hidden sm:inline">{t('header.search')}</span>
            <span className="ml-auto hidden items-center gap-0.5 sm:flex">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </Button>
          <LangToggle />
          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}

function LangToggle() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  return (
    <ToggleGroup
      type="single"
      value={lang}
      onValueChange={(v) => v && setLang(v as Lang)}
      aria-label={t('header.language')}
      className="h-8"
    >
      <ToggleGroupItem value="id" className="num" data-testid="lang-id">
        ID
      </ToggleGroupItem>
      <ToggleGroupItem value="en" className="num" data-testid="lang-en">
        EN
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function ThemeMenu() {
  const { t } = useTranslation();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const lowPower = useSettings((s) => s.lowPower);
  const setLowPower = useSettings((s) => s.setLowPower);
  const resolved = useResolvedTheme((s) => s.resolved);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label={t('header.theme')} data-testid="theme-menu">
          {resolved === 'dark' ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t('header.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
          <DropdownMenuRadioItem value="light" data-testid="theme-light">
            <Sun /> {t('header.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" data-testid="theme-dark">
            <Moon /> {t('header.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> {t('header.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setLowPower(!lowPower);
          }}
        >
          <Zap className={cn(lowPower && '!text-primary')} />
          <span className="flex-1">{t('header.lowPower')}</span>
          <span className="num text-xs text-muted-foreground">{lowPower ? 'ON' : 'OFF'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
