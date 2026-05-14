import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepHeaderProps = {
  step: number;
  total?: number;
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * En-tête type Apple — refonte handoff (mockup `StepHeader` 08–12) :
 *   <progress-dots step={n}/>           // 5 segments 3px (blue / hairline)
 *   <h1 display 28/700 -0.5px>{title}</h1>
 *   <p body-15 muted>{subtitle}</p>
 *
 * Le compteur « Étape n/N » est rendu en `trailing` du NavBar parent dans
 * `CreateSessionWizard` — on évite la redondance avec les dots.
 */
export const AppleStepHeader: React.FC<StepHeaderProps> = ({
  step,
  total = 5,
  title,
  subtitle,
  className,
}) => (
  <div className={cn('px-1 pb-5', className)}>
    {/*
     * Progress dots (mockup spec : flex gap-1 (4px) / h-[3px] / rounded-[2px] /
     * Action Blue actif, hairline inactif rgba(60,60,67,0.18)).
     */}
    <div className="mb-3.5 flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-[3px] flex-1 rounded-[2px] transition-colors',
            i < step
              ? 'bg-primary'
              : 'bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.65)]'
          )}
          aria-hidden
        />
      ))}
    </div>
    <h2 className="text-[28px] font-bold leading-[1.1] tracking-[-0.5px] text-foreground">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-1 text-[15px] leading-[1.35] text-muted-foreground">{subtitle}</p>
    ) : null}
  </div>
);

/**
 * Section iOS « Inset Grouped » : titre eyebrow optionnel, fond `bg-card` arrondi 18px.
 */
export const AppleGroup: React.FC<{
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, footer, children, className }) => (
  <section className={cn('space-y-2', className)}>
    {title ? (
      <div className="px-4 text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">
        {title}
      </div>
    ) : null}
    <div className="overflow-hidden rounded-[18px] border border-border/60 bg-card">
      {children}
    </div>
    {footer ? (
      <div className="px-4 text-[12px] leading-relaxed text-muted-foreground/85">
        {footer}
      </div>
    ) : null}
  </section>
);

/**
 * Pied wizard — refonte handoff (mockup `ctaFloat` 08–12) :
 * un seul bouton pill Action Blue full-width, pas de bordure haute, pas de blur.
 * Le retour est géré dans le NavBar parent (chevron-back). L'option `showBack`
 * reste exposée pour la rétrocompat des cas hors-wizard mais est désactivée
 * par défaut.
 */
export const AppleStepFooter: React.FC<{
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
  variant?: 'primary' | 'success';
}> = ({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  loading,
  showBack = false,
  variant = 'primary',
}) => (
  <div
    className={cn(
      'relative z-10 shrink-0 px-2 pt-3',
      'pb-[max(1rem,env(safe-area-inset-bottom,1rem))]'
    )}
  >
    <div className="flex items-center gap-3">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          aria-label="Étape précédente"
          className={cn(
            'flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-transform',
            'active:scale-[0.96] disabled:opacity-50'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'apple-pill apple-pill-large flex-1 disabled:cursor-not-allowed disabled:opacity-40',
          // variante succès (création coaching → vert iOS) — conserve le shape pill.
          variant === 'success' && '!bg-[#34C759]'
        )}
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <span className="truncate">{nextLabel}</span>
        )}
      </button>
    </div>
  </div>
);
