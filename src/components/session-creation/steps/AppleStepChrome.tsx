import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_CARD_SHADOW, WIZARD_MUTED, WIZARD_TITLE } from '../wizardVisualTokens';

type StepHeaderProps = {
  step?: number;
  total?: number;
  title: string;
  subtitle?: string;
  className?: string;
  /** Maquette wizard : titres 36/900 (étapes 1–3, 5) ou 22/800 (étape 4). */
  titleVariant?: 'hero' | 'compact';
};

/**
 * En-tête étape wizard — titres / sous-titre alignés maquette `RunConnect (7).jsx`.
 * La barre de progression segmentée est rendue dans `CreateSessionWizard` (sous le NavBar).
 */
export const AppleStepHeader: React.FC<StepHeaderProps> = ({
  title,
  subtitle,
  className,
  titleVariant = 'hero',
}) => (
  <div className={cn('px-0 pb-5', className)}>
    <h2
      className={cn(
        'm-0',
        titleVariant === 'hero' && 'text-[36px] font-black leading-[1.05] tracking-[-0.04em]',
        titleVariant === 'compact' && 'text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em]'
      )}
      style={{ color: WIZARD_TITLE }}
    >
      {title}
    </h2>
    {subtitle ? (
      <p
        className="mt-1.5 text-[16px] leading-[1.4]"
        style={{ color: WIZARD_MUTED }}
      >
        {subtitle}
      </p>
    ) : null}
  </div>
);

/** Carte blanche type liste wizard (ombre + léger contour). */
export const WizardInsetCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn('overflow-hidden rounded-2xl bg-white', className)}
    style={{ boxShadow: WIZARD_CARD_SHADOW }}
  >
    {children}
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
