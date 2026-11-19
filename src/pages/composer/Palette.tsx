import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GATE_DOCS } from '@/content/gates';
import { useBi } from '@/hooks/useBi';
import { cn } from '@/lib/utils';
import { PALETTE, type PaletteItem } from './palette';

function Chip({ item, armed, onArm }: { item: PaletteItem; armed: boolean; onArm: (item: PaletteItem) => void }) {
  const bi = useBi();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pal-${item.key}`,
    data: { kind: 'palette', key: item.key },
  });
  const doc = GATE_DOCS[item.doc];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={setNodeRef}
          type="button"
          {...listeners}
          {...attributes}
          onClick={() => onArm(item)}
          aria-pressed={armed}
          aria-label={doc ? bi(doc.name) : item.label}
          data-testid={`pal-${item.key}`}
          className={cn(
            'flex h-10 min-w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-[5px] border bg-card px-2 font-mono text-[0.8rem] font-semibold transition-[border-color,background-color,transform] active:cursor-grabbing',
            item.group === 'multi' && 'border-dashed',
            item.group === 'measure' && 'text-primary',
            armed
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:-translate-y-0.5 hover:border-ink/60',
            isDragging && 'opacity-40',
          )}
        >
          {item.label}
        </button>
      </TooltipTrigger>
      {doc && (
        <TooltipContent
          side="bottom"
          className="max-w-60 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-border"
        >
          <p className="text-sm font-medium">{bi(doc.name)}</p>
          <p className="text-xs text-muted-foreground">{bi(doc.desc)}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export function Palette({ armedKey, onArm }: { armedKey: string | null; onArm: (item: PaletteItem) => void }) {
  const { t } = useTranslation();
  const groups: PaletteItem['group'][] = ['single', 'rotation', 'multi', 'measure'];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">{t('composer.palette')}</h2>
        <p className="hidden text-xs text-muted-foreground sm:block">{t('composer.paletteHint')}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {groups.map((gr) => (
          <div key={gr} className="flex shrink-0 gap-1.5 border-r border-border pr-3 last:border-r-0">
            {PALETTE.filter((p) => p.group === gr).map((p) => (
              <Chip key={p.key} item={p} armed={armedKey === p.key} onArm={onArm} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
