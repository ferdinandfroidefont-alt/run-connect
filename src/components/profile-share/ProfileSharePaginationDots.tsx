import { cn } from '@/lib/utils';

export function ProfileSharePaginationDots({
  count,
  activeIndex,
  className,
}: {
  count: number;
  activeIndex: number;
  className?: string;
}) {
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
