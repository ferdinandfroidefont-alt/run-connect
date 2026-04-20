import { cn } from '@/lib/utils';

type Props = {
  count: number;
  activeIndex: number;
  className?: string;
};

export function SessionSharePaginationDots({ count, activeIndex, className }: Props) {
  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-200',
            i === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/35'
          )}
        />
      ))}
    </div>
  );
}
