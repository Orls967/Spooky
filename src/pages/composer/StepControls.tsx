import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function StepControls({ step, total, onStep }: { step: number; total: number; onStep: (s: number) => void }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (stepRef.current >= total) {
        setPlaying(false);
        return;
      }
      onStep(stepRef.current + 1);
    }, 750);
    return () => clearInterval(id);
  }, [playing, total, onStep]);
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('common.step')}>
      <Button variant="ghost" size="icon-sm" onClick={() => onStep(0)} aria-label={t('composer.stepStart')}>
        <ChevronFirst />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onStep(Math.max(0, step - 1))}
        aria-label={t('composer.stepBack')}
        data-testid="step-back"
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => {
          if (step >= total) onStep(0);
          setPlaying((p) => !p);
        }}
        aria-label={playing ? t('common.pause') : t('composer.playSteps')}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onStep(Math.min(total, step + 1))}
        aria-label={t('composer.stepForward')}
        data-testid="step-forward"
      >
        <ChevronRight />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => onStep(total)} aria-label={t('composer.stepEnd')}>
        <ChevronLast />
      </Button>
      <Slider
        className="mx-2 w-32 sm:w-48"
        min={0}
        max={Math.max(1, total)}
        step={1}
        value={[step]}
        onValueChange={([v]) => onStep(v)}
        aria-label={t('common.step')}
      />
      <span className="num text-xs whitespace-nowrap text-muted-foreground" data-testid="step-label">
        {step === 0 ? t('composer.initial') : t('composer.stepOf', { s: step, n: total })}
      </span>
    </div>
  );
}
