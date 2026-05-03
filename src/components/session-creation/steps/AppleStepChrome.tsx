import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepHeaderProps = {
  step: number;
  total?: number;
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * En-tête type Apple (App Store / Réglages) : eyebrow « ÉTAPE n / N »,
 * grand titre SF Pro Display tracking serré, sous-titre body 17px.
 */
export const AppleStepHeader: React.FC<StepHeaderProps> = ({
  step,
  total = 5,
  title,
  subtitle,
  className,
}) => (
  <div className={cn('px-1 pb-5', className)}>
    <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">
      Étape {step} / {total}
    </div>
    <h2 className="mt-1.5 text-[28px] font-semibold leading-[1.1] tracking-[-0.5px] text-foreground">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
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
 * Pied wizard : pile bouton Retour (icone) + bouton primaire pleine largeur.
 * L’apparence reproduit la pill bleue Apple avec backdrop-blur + safe area iOS.
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
  showBack = true,
  variant = 'primary',
}) => (
  <div
    className={cn(
      'relative z-10 -mx-4 shrink-0 border-t border-border/60 bg-secondary/95 px-4 pt-4 backdrop-blur-md supports-[backdrop-filter]:bg-secondary/80',
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
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-transform',
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
          'flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-medium tracking-tight text-white transition-transform',
          'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
          variant === 'success' ? 'bg-emerald-600' : 'bg-primary'
        )}
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <>
            <span>{nextLabel}</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  </div>
);
