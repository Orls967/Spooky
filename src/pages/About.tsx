import { useTranslation } from 'react-i18next';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { RichText } from '@/ui/RichText';

const SOURCES = [
  'M. A. Nielsen & I. L. Chuang — Quantum Computation and Quantum Information (Cambridge, 2010).',
  'J. F. Clauser, M. A. Horne, A. Shimony, R. A. Holt — Proposed experiment to test local hidden-variable theories, PRL 23, 880 (1969).',
  'B. S. Cirel’son (Tsirelson) — Quantum generalizations of Bell’s inequality, Lett. Math. Phys. 4, 93 (1980).',
  'W. K. Wootters — Entanglement of formation of an arbitrary state of two qubits, PRL 80, 2245 (1998).',
  'L. K. Grover — A fast quantum mechanical algorithm for database search, STOC (1996).',
  'P. W. Shor — Algorithms for quantum computation: discrete logarithms and factoring, FOCS (1994).',
  'D. Deutsch & R. Jozsa (1992); E. Bernstein & U. Vazirani (1993); C. H. Bennett et al. — teleportation (1993) and superdense coding (1992).',
  'F. Crameri, G. E. Shephard, P. J. Heron — The misuse of colour in science communication, Nat. Commun. 11, 5444 (2020) — prinsip peta warna siklik ramah buta warna / principles behind the CVD-aware cyclic colormap.',
];

const STACK = [
  'Vite',
  'React 19',
  'TypeScript',
  'three.js WebGPURenderer + TSL',
  'React Three Fiber',
  'Tailwind CSS v4',
  'shadcn/ui',
  'GSAP',
  'KaTeX',
  'dnd-kit',
  'Zustand',
  'Zod',
  'i18next',
  'Comlink Web Worker',
  'Vitest',
  'Playwright',
];

export default function About() {
  const { t } = useTranslation();
  const limits = ['limits1', 'limits2', 'limits3', 'limits4', 'limits5'] as const;
  return (
    <div className="paper-grid flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-14 lg:px-6">
        <ModuleHeader module="about" title={t('about.title')} lead={t('about.lead')} />
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t('about.whatTitle')}</h2>
          <RichText text={t('about.what')} className="leading-relaxed" />
        </section>
        <section className="flex flex-col gap-3" data-testid="about-limits">
          <h2 className="font-display text-2xl">{t('about.limitsTitle')}</h2>
          <ol className="flex flex-col gap-3">
            {limits.map((k, i) => (
              <li key={k} className="grid grid-cols-[2rem_1fr] gap-2 border-t border-border pt-3 leading-relaxed">
                <span className="num text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>
                <RichText text={t(`about.${k}`)} />
              </li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t('about.privacyTitle')}</h2>
          <p className="leading-relaxed">{t('about.privacy')}</p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t('about.sourcesTitle')}</h2>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            {SOURCES.map((s) => (
              <li key={s} className="border-l-2 border-border pl-3">
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">{t('about.creditsTitle')}</h2>
          <p className="text-sm leading-relaxed">{t('about.credits')}</p>
          <h3 className="eyebrow mt-2">{t('about.stackTitle')}</h3>
          <p className="flex flex-wrap gap-1.5">
            {STACK.map((s) => (
              <span key={s} className="num rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs">
                {s}
              </span>
            ))}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl">{t('about.name')}</h2>
          <p className="font-display text-lg italic">{t('about.nameBody')}</p>
        </section>
      </article>
    </div>
  );
}
