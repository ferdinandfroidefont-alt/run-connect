import type { SessionBlock } from './types';

const COLORS = {
  warmup: '#34c759',
  cooldown: '#34c759',
  interval: '#0066cc',
  steady: '#5ac8fa',
} as const;

function blockHeight(type: SessionBlock['type']): number {
  if (type === 'interval') return 60;
  if (type === 'steady') return 40;
  return 30;
}

function blockYOffset(type: SessionBlock['type']): number {
  const h = blockHeight(type);
  return 80 - h - (type === 'interval' ? 0 : type === 'steady' ? 20 : 10);
}

/**
 * Bandeau SVG type maquette 11 (Programmer · Détails) — proportions simplifiées par bloc.
 */
export function SessionSchemaMiniChart({ blocks }: { blocks: SessionBlock[] }) {
  const safe = blocks.length ? blocks : [];
  const n = Math.max(1, safe.length);
  const w = 320;
  const h = 80;
  const gap = 5;
  const innerW = w - gap * Math.max(0, n - 1);
  const bw = innerW / n;
  let x = 0;

  if (!safe.length) {
    return (
      <div className="flex h-[70px] w-full items-center justify-center rounded-lg bg-muted/40 text-[13px] text-muted-foreground">
        Aucun bloc — ajoute-en dans l’éditeur
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full" aria-hidden>
      {safe.map((b) => {
        const color = COLORS[b.type];
        const bh = blockHeight(b.type);
        const y = blockYOffset(b.type);
        const rect = (
          <rect
            key={b.id}
            x={x}
            y={y}
            width={Math.max(4, bw - 2)}
            height={bh}
            rx={3}
            fill={color}
          />
        );
        x += bw + gap;
        return rect;
      })}
    </svg>
  );
}

export function sessionSchemaLegend(blocks: SessionBlock[]): {
  left: string;
  mid: string;
  right: string;
} {
  if (!blocks.length) {
    return { left: '—', mid: '', right: '' };
  }
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const left = first?.type === 'warmup' ? 'Échauffement' : first?.type === 'steady' ? 'Steady' : 'Bloc';
  const right = last?.type === 'cooldown' ? 'Retour' : last?.type === 'interval' ? 'Intervalles' : 'Fin';
  const intervals = blocks.filter((b) => b.type === 'interval').length;
  const mid =
    intervals > 0
      ? `${intervals} intervalle${intervals > 1 ? 's' : ''}`
      : blocks.length > 2
        ? `${blocks.length - 2} segment${blocks.length - 3 ? 's' : ''}`
        : '';
  return { left, mid, right };
}
