import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, FileImage, FileUp, Link2, Minus, Plus, Redo2, Trash, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useComposer, MAX_COMPOSER_QUBITS } from '@/store/composer';
import { EXAMPLES } from '@/content/examples';
import { useBi } from '@/hooks/useBi';
import { circuitFromJSON, circuitToJSON, encodeCircuitForURL } from '@/lib/quantum/serialize';
import { circuitToSVG, downloadBlob, svgToPng, type DiagramColors } from '@/lib/circuitSvg';
import { toast } from '@/store/toast';
import { useResolvedTheme } from '@/store/settings';

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          data-testid={testId}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function diagramColors(dark: boolean): DiagramColors {
  return dark
    ? { paper: '#10151f', ink: '#e9e3d6', muted: '#9aa6bd', accent: '#f2b84b', box: '#161d2b' }
    : { paper: '#f7f2e8', ink: '#272c38', muted: '#666d7b', accent: '#b4530b', box: '#fbf8f2' };
}

export function Toolbar() {
  const { t } = useTranslation();
  const bi = useBi();
  const circuit = useComposer((s) => s.circuit);
  const name = useComposer((s) => s.name);
  const past = useComposer((s) => s.past.length);
  const future = useComposer((s) => s.future.length);
  const { undo, redo, clear, setQubits, setCircuit } = useComposer.getState();
  const dark = useResolvedTheme((s) => s.resolved) === 'dark';
  const fileRef = useRef<HTMLInputElement>(null);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/composer?c=${encodeCircuitForURL(circuit)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('composer.shareCopied'));
    } catch {
      toast(`${t('composer.shareFallback')} ${url}`);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = circuitFromJSON(await file.text());
    if (!res.ok) toast(t('composer.loadError', { msg: res.error }), 'error');
    else if (res.value.circuit.qubits > MAX_COMPOSER_QUBITS)
      toast(t('composer.loadError', { msg: `> ${MAX_COMPOSER_QUBITS} qubits` }), 'error');
    else {
      setCircuit(res.value.circuit, { name: res.value.name ?? '' });
      toast(t('composer.loaded'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="mr-2 flex items-center gap-1 rounded-md border border-border bg-card px-1">
        <IconBtn
          label={t('composer.removeQubit')}
          onClick={() => setQubits(circuit.qubits - 1)}
          disabled={circuit.qubits <= 1}
          testId="qubit-minus"
        >
          <Minus />
        </IconBtn>
        <span className="num min-w-14 text-center text-xs" data-testid="qubit-count">
          {circuit.qubits} {t('composer.qubits').toLowerCase()}
        </span>
        <IconBtn
          label={t('composer.addQubit')}
          onClick={() => setQubits(circuit.qubits + 1)}
          disabled={circuit.qubits >= MAX_COMPOSER_QUBITS}
          testId="qubit-plus"
        >
          <Plus />
        </IconBtn>
      </div>
      <IconBtn label={t('composer.undo')} onClick={undo} disabled={!past} testId="undo">
        <Undo2 />
      </IconBtn>
      <IconBtn label={t('composer.redo')} onClick={redo} disabled={!future} testId="redo">
        <Redo2 />
      </IconBtn>
      <IconBtn label={t('composer.clear')} onClick={clear}>
        <Trash />
      </IconBtn>
      <span className="mx-1 h-5 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="examples">
            <BookOpen /> {t('composer.examples')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>{t('composer.examples')}</DropdownMenuLabel>
          {EXAMPLES.map((ex) => (
            <DropdownMenuItem
              key={ex.key}
              onSelect={() => setCircuit(ex.build(), { name: bi(ex.name) })}
              data-testid={`example-${ex.key}`}
            >
              {bi(ex.name)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download /> {t('common.open')}…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem
            onSelect={() =>
              downloadBlob(
                new Blob([circuitToJSON(circuit, name || undefined)], { type: 'application/json' }),
                'spooky-circuit.json',
              )
            }
          >
            <Download /> {t('composer.save')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <FileUp /> {t('composer.load')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void share()} data-testid="share">
            <Link2 /> {t('composer.share')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              downloadBlob(
                new Blob([circuitToSVG(circuit, diagramColors(dark), name || undefined)], { type: 'image/svg+xml' }),
                'spooky-circuit.svg',
              )
            }
          >
            <FileImage /> {t('composer.exportSvg')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              void svgToPng(circuitToSVG(circuit, diagramColors(dark), name || undefined))
                .then((b) => downloadBlob(b, 'spooky-circuit.png'))
                .catch((e: Error) => toast(e.message, 'error'))
            }
          >
            <FileImage /> {t('composer.exportPng')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
