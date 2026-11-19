import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleIndex } from '@/ui/ModuleIndex';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmbientDust } from '@/scene/AmbientDust';
import { IntroScene } from '@/scene/intro/IntroScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = ['s1', 's2', 's3', 's4', 's5'] as const;

export default function Home() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const story = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const [inView, setInView] = useState(true);

  useGSAP(
    () => {
      const proxy = { p: 0 };
      gsap.to(proxy, {
        p: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: story.current,
          start: 'top top+=56',
          end: 'bottom bottom',
          scrub: reduced ? true : 0.9,
          onToggle: (self) => setInView(self.isActive || self.progress < 1),
        },
        onUpdate: () => {
          progress.current = proxy.p;
          setStage(Math.min(4, Math.floor(proxy.p + 0.02)));
        },
      });
      if (!reduced)
        gsap.utils
          .toArray<HTMLElement>('[data-intro-hero] > *')
          .forEach((el, i) =>
            gsap.from(el, { y: 18, opacity: 0, duration: 0.9, delay: 0.1 + i * 0.08, ease: 'power3.out' }),
          );
    },
    { scope: story, dependencies: [reduced] },
  );

  // stop rendering once the story is scrolled past
  useEffect(() => {
    const el = story.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <section ref={story} className="relative" style={{ height: '560vh' }} aria-label={t('home.eyebrow')}>
        <div className="scene-surface sticky top-14 h-[calc(100dvh-3.5rem)] overflow-hidden">
          <SpookyCanvas
            label={t('home.lead')}
            className="absolute inset-0"
            alwaysRender
            paused={!inView}
            cameraPosition={[0, 0.55, 6]}
            fov={36}
          >
            <StudioLights />
            <IntroScene progress={progress} reduced={reduced} labels={stage >= 1} />
            <AmbientDust spread={10} />
            <CameraRig fitRadius={stage >= 4 ? 2.9 : 1.75} interactive={false} intro={false} />
          </SpookyCanvas>

          {/* hero over the spinning coin */}
          <div
            data-intro-hero
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-4 p-5 transition-opacity duration-500 lg:p-10',
              stage > 0 && 'opacity-0',
            )}
          >
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 className="text-display max-w-[13ch]">{t('home.title')}</h1>
            <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground lg:text-lg">{t('home.lead')}</p>
            <div className="pointer-events-auto flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/bloch">
                  {t('home.start')} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="#modules"
                  onClick={(e) => (
                    e.preventDefault(),
                    document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })
                  )}
                >
                  {t('home.explore')}
                </a>
              </Button>
            </div>
          </div>

          {/* story captions */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 lg:inset-y-0 lg:right-auto lg:flex lg:w-[min(30rem,40vw)] lg:items-center lg:p-10">
            {STEPS.map((s, i) => (
              <div
                key={s}
                data-testid={`intro-${s}`}
                aria-hidden={stage !== i}
                className={cn(
                  'panel absolute inset-x-5 bottom-5 flex flex-col gap-2 p-5 transition-[opacity,transform] duration-500 ease-out lg:static lg:inset-auto',
                  i === 0 && 'lg:mt-auto',
                  stage === i && i > 0 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
                  stage === i && i > 0 ? '' : 'lg:hidden',
                )}
              >
                <span className="num text-xs text-primary">0{i + 1} / 05</span>
                <h2 className="font-display text-2xl leading-tight tracking-tight lg:text-3xl">
                  {t(`intro.${s}Title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground lg:text-base">{t(`intro.${s}Body`)}</p>
              </div>
            ))}
            {stage === 0 && (
              <div className="pointer-events-none absolute right-5 bottom-5 flex items-center gap-2 text-xs text-muted-foreground lg:right-10 lg:bottom-8">
                <ArrowDown className="size-4 animate-bounce" /> {t('intro.scroll')}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="paper-grid flex flex-col gap-6 border-t border-border px-4 py-16 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start gap-4">
          <p className="eyebrow">{t('nav.intro')}</p>
          <h2 className="text-title max-w-[18ch]">{t('intro.s1Title')}</h2>
          <p className="max-w-[60ch] text-muted-foreground">{t('intro.s1Body')}</p>
          <Button size="lg" asChild>
            <Link to="/bloch">
              {t('intro.cta')} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
      <div className="paper-grid">
        <ModuleIndex />
      </div>
    </div>
  );
}
