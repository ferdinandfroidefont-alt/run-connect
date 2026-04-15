import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export function SessionShareActionButton({ icon, label, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition-colors active:bg-secondary/80',
        'min-w-0 flex-1 basis-[22%] sm:basis-[18%]',
        disabled && 'pointer-events-none opacity-40'
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground shadow-sm">
        {icon}
      </div>
      <span className="max-w-[76px] text-[11px] font-medium leading-tight text-foreground">{label}</span>
    </button>
  );
}
