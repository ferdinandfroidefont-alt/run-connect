import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  MapPin,
  EyeOff,
  Repeat,
  Radio,
  MapPinned,
} from 'lucide-react';
import {
  SessionFormData,
  SelectedLocation,
  ACTIVITY_TYPES,
  VisibilityType,
  RecurrenceType,
} from '../types';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { VisibilitySelector } from '../VisibilitySelector';
import { RecurrenceSelector } from '../RecurrenceSelector';
import { cn } from '@/lib/utils';

import { AppleStepHeader, AppleGroup } from './AppleStepChrome';
import { Group, Cell } from '@/components/apple';
import { useToast } from '@/hooks/use-toast';

interface ConfirmStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  loading: boolean;
  isPremium: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isCoachingMode?: boolean;
  /** True : pas d'en-tête ni carte récap (composition externe) */
  embedInFinalize?: boolean;
  hideFooter?: boolean;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  formData,
  selectedLocation,
  imagePreview,
  loading,
  isPremium,
  onFormDataChange,
  onSubmit,
  onBack,
  isCoachingMode = false,
  embedInFinalize = false,
  hideFooter = false,
}) => {
  const activity = ACTIVITY_TYPES.find((a) => a.value === formData.activity_type);
  const previewTitle = resolveSessionTitle({
    title: formData.title,
    activity_type: formData.activity_type,
    locationName: selectedLocation?.name ?? '',
  });

  const handleVisibilityChange = (type: VisibilityType) => {
    onFormDataChange({ visibility_type: type });
    onFormDataChange({ friends_only: type === 'friends' });
  };

  const handleHiddenUsersChange = (userIds: string[]) => {
    onFormDataChange({ hidden_from_users: userIds });
  };

  const handleRecurrenceTypeChange = (type: RecurrenceType) => {
    onFormDataChange({ recurrence_type: type });
  };

  const handleRecurrenceCountChange = (count: number) => {
    onFormDataChange({ recurrence_count: count });
  };

  const navigate = useNavigate();
  const { toast } = useToast();

  const activityShort =
    activity?.label?.replace(/^[^\s]+\s/, '').toUpperCase() ?? 'SÉANCE';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn(
        'flex w-full flex-col',
        embedInFinalize ? 'min-h-0' : 'min-h-0 flex-1'
      )}
    >
      <div
        className={cn(
          'space-y-5 px-1',
          embedInFinalize ? '' : 'flex-1 overflow-y-auto pb-4'
        )}
      >
        {!embedInFinalize && (
          <AppleStepHeader
            step={5}
            title={isCoachingMode ? 'Programmer ma séance' : 'Tout est prêt.'}
            subtitle={
              isCoachingMode
                ? 'Vérifie les détails pré-remplis par le coach.'
                : 'Booste pour multiplier ta visibilité.'
            }
          />
        )}

        {embedInFinalize && (
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Publication</h3>
        )}

        {/* Hero recap card — Apple product tile aesthetic */}
        {!embedInFinalize && (
          <div className="overflow-hidden rounded-[18px] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            {/* Maquette 12 — carte avec carte (aperçu lieu) */}
            <div className="relative h-40 w-full overflow-hidden bg-[#c5d9e8] dark:bg-[#1a3550]">
              <svg
                className="absolute inset-0 h-full w-full opacity-35 dark:opacity-25"
                viewBox="0 0 320 140"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden
              >
                <path
                  d="M0 90 Q60 70 120 85 T240 75 L320 95 V140 H0 Z"
                  fill="rgba(255,255,255,0.55)"
                  className="dark:fill-white/10"
                />
                <path
                  d="M0 60 Q80 40 160 55 T320 45"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="2"
                  fill="none"
                  className="dark:stroke-white/25"
                />
                <path
                  d="M40 30 Q100 100 200 80 T300 100"
                  stroke="rgba(0,102,204,0.35)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent dark:from-black/20" />
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground shadow-[0_6px_16px_rgba(0,102,204,0.35)]">
                <MapPin className="h-5 w-5" strokeWidth={2.2} />
              </div>
            </div>

            <div className="space-y-1 px-4 pb-5 pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.4px] text-primary">
                {activityShort}
                {formData.distance_km
                  ? ` · ${String(formData.distance_km).replace(',', '.')} km`
                  : ''}
              </div>
              <h3 className="font-display text-[24px] font-semibold leading-[1.12] tracking-[-0.5px] text-foreground">
                {formData.scheduled_at
                  ? `${new Date(formData.scheduled_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                    })} · ${new Date(formData.scheduled_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : previewTitle}
              </h3>
              <p className="text-[15px] leading-snug text-muted-foreground">
                {selectedLocation
                  ? `${selectedLocation.name}${
                      formData.max_participants
                        ? ` · ${formData.max_participants} places`
                        : ''
                    }`
                  : previewTitle}
                {formData.visibility_type === 'friends'
                  ? ' · Amis invités'
                  : formData.visibility_type === 'public'
                    ? ' · Visible publiquement'
                    : formData.visibility_type === 'club'
                      ? ' · Club'
                      : ''}
              </p>
            </div>
          </div>
        )}

        {/* Maquette 12 — section Booster */}
        {!embedInFinalize && !isCoachingMode ? (
          <Group inset={false} className="mb-0" title="Booster">
            <Cell
              icon={<span className="text-[15px]">⚡</span>}
              iconBg="#0066CC"
              title="Visibilité globale"
              subtitle="Affiché en tête de la carte"
              onClick={() => {
                if (!isPremium) {
                  navigate('/subscription');
                  return;
                }
                onFormDataChange({ visibility_type: 'public', friends_only: false });
                toast({
                  title: 'Visibilité globale',
                  description: 'La séance est visible en mode public.',
                });
              }}
            />
            <Cell
              icon={<span className="text-[15px]">📺</span>}
              iconBg="#ff9500"
              title="Regarder une vidéo · 15s"
              subtitle="Pour activer le boost gratuitement"
              onClick={() =>
                toast({
                  title: 'Bientôt disponible',
                  description: 'Le boost vidéo arrive dans une prochaine version.',
                })
              }
            />
            <Cell
              icon={<span className="text-[15px]">✨</span>}
              iconBg="#af52de"
              title="Passer Premium"
              subtitle="Boost illimité"
              accent
              last
              onClick={() => navigate('/subscription')}
            />
          </Group>
        ) : null}

        {/* Live tracking — recap row */}
        <AppleGroup>
          <div className="flex items-start gap-3 px-4 py-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
                formData.live_tracking_enabled
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {formData.live_tracking_enabled ? (
                <Radio className="h-4 w-4" />
              ) : (
                <MapPinned className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tracking-tight text-foreground">
                Live tracking
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {formData.live_tracking_enabled
                  ? 'Activé : les participants pourront partager leur position pendant la séance.'
                  : 'Désactivé : aucune position partagée sur la carte.'}
              </p>
            </div>
          </div>
        </AppleGroup>

        {/* Visibility */}
        <AppleGroup title="Visibilité">
          <div className="px-4 py-3">
            <VisibilitySelector
              visibilityType={formData.visibility_type}
              hiddenFromUsers={formData.hidden_from_users}
              isPremium={isPremium}
              onVisibilityChange={handleVisibilityChange}
              onHiddenUsersChange={handleHiddenUsersChange}
              clubId={formData.club_id}
            />
          </div>
        </AppleGroup>

        {formData.visibility_type === 'friends' &&
          formData.hidden_from_users?.length > 0 && (
            <div className="flex items-center gap-2 px-4 text-[12px] text-amber-500">
              <EyeOff className="h-3.5 w-3.5" />
              <span>
                {formData.hidden_from_users.length} ami
                {formData.hidden_from_users.length > 1 ? 's' : ''} ne verra pas cette séance
              </span>
            </div>
          )}

        {/* Recurrence */}
        <AppleGroup title="Récurrence">
          <div className="px-4 py-3">
            <RecurrenceSelector
              recurrenceType={formData.recurrence_type}
              recurrenceCount={formData.recurrence_count}
              onRecurrenceTypeChange={handleRecurrenceTypeChange}
              onRecurrenceCountChange={handleRecurrenceCountChange}
            />
          </div>
        </AppleGroup>

        {formData.recurrence_type === 'weekly' && (
          <div className="flex items-center gap-2 px-4 text-[12px] text-primary">
            <Repeat className="h-3.5 w-3.5" />
            <span>
              {formData.recurrence_count} séances seront créées automatiquement
            </span>
          </div>
        )}
      </div>

      {!hideFooter && (
        // Refonte handoff (mockup `ctaFloat` 12) — pill Action Blue full-width.
        // Le retour est désormais dans le NavBar parent (chevron-back). Pas de bordure
        // ni de backdrop-blur ici : le bloc de récap juste au-dessus suffit à séparer
        // visuellement la zone d'action.
        <div
          className={cn(
            'relative z-10 shrink-0 px-2 pt-3',
            'pb-[max(1rem,env(safe-area-inset-bottom,1rem))]'
          )}
        >
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="apple-pill apple-pill-large w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <span className="inline-flex items-center gap-2 truncate">
                <Check className="h-4 w-4 shrink-0" />
                {isCoachingMode
                  ? 'Programmer ma séance'
                  : formData.recurrence_type === 'weekly'
                  ? `Créer ${formData.recurrence_count} séances`
                  : 'Programmer & booster'}
              </span>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};
