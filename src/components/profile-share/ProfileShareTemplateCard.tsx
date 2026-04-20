import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Conteneur visuel pour un template dans le carousel (bordure + ombre cohérentes). */
export function ProfileShareTemplateCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border border-border bg-muted/30 shadow-[0_12px_40px_rgba(15,23,42,0.12)]',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
