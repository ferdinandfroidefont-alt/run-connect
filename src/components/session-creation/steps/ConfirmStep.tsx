import React from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  MapPin,
  Calendar,
  Users,
  Ruler,
  EyeOff,
  Building2,
  Globe,
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
import {
  DEFAULT_SESSION_CALENDAR_DURATION_MIN,
  estimateSessionDurationMinutes,
} from '@/lib/estimateSessionDurationMinutes';
import { AppleStepHeader, AppleGroup } from './AppleStepChrome';

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

const getVisibilityIcon = (type: VisibilityType) => {
  switch (type) {
    case 'friends':
      return Users;
    case 'club':
      return Building2;
    case 'public':
      return Globe;
    default:
      return Users;
  }
};

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
  const estimatedDurationMin = estimateSessionDurationMinutes({
    session_blocks: formData.blocks,
    distance_km: formData.distance_km
      ? Number.parseFloat(formData.distance_km)
      : null,
    interval_distance: formData.interval_distance
      ? Number.parseFloat(formData.interval_distance)
      : null,
    interval_count: formData.interval_count
      ? Number.parseInt(formData.interval_count, 10)
      : null,
    interval_pace: formData.interval_pace || null,
    pace_general: formData.pace_general || null,
  });
  const calendarDurationMin = estimatedDurationMin ?? DEFAULT_SESSION_CALENDAR_DURATION_MIN;
  const estimatedEndTime = formData.scheduled_at
    ? new Date(new Date(formData.scheduled_at).getTime() + calendarDurationMin * 60_000)
    : null;

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

  const VisibilityIcon = getVisibilityIcon(formData.visibility_type);

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
                : 'Vérifie le récapitulatif puis publie ta séance.'
            }
          />
        )}

        {embedInFinalize && (
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Publication</h3>
        )}

        {/* Hero recap card — Apple product tile aesthetic */}
        {!embedInFinalize && (
          <div className="overflow-hidden rounded-[18px] border border-border/60 bg-card">
            {imagePreview ? (
              <div className="relative h-36 w-full">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-white">
                  {activity?.label?.replace(/^[^\s]+\s/, '') || 'Séance'}
                </div>
              </div>
            ) : null}
            <div className="space-y-3 p-5">
              {!imagePreview && (
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {activity?.label?.replace(/^[^\s]+\s/, '') || 'Séance'}
                  {formData.distance_km ? ` · ${formData.distance_km} km` : ''}
                </div>
              )}
              <h3 className="text-[24px] font-semibold leading-[1.15] tracking-[-0.5px] text-foreground">
                {previewTitle}
              </h3>

              <div className="space-y-2 pt-1">
                {selectedLocation && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 truncate text-[15px] tracking-tight text-foreground">
                      {selectedLocation.name}
                    </span>
                  </div>
                )}
                {formData.scheduled_at && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 text-[15px] tracking-tight text-foreground">
                      {new Date(formData.scheduled_at).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}{' '}
                      ·{' '}
                      {new Date(formData.scheduled_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {estimatedEndTime ? (
                        <span className="text-muted-foreground">
                          {' '}
                          → {estimatedEndTime.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-[13px] text-muted-foreground">
                  {formData.max_participants && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {formData.max_participants} max
                    </span>
                  )}
                  {formData.distance_km && (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5" />
                      {formData.distance_km} km
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <VisibilityIcon className="h-3.5 w-3.5" />
                    {formData.visibility_type === 'public'
                      ? 'Public'
                      : formData.visibility_type === 'club'
                      ? 'Club'
                      : 'Amis'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  : 'Programmer & publier'}
              </span>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};
