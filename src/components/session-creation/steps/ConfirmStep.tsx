import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  MapPin,
  X,
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

import { AppleStepHeader, AppleGroup, WizardInsetCard } from './AppleStepChrome';
import { WIZARD_CARD_SHADOW } from '../wizardVisualTokens';
import { Cell, EmojiBadge } from '@/components/apple';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MiniMapPreview } from '@/components/feed/MiniMapPreview';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { RouteSelector } from '../RouteSelector';

interface ConfirmStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  loading: boolean;
  isPremium: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onSubmit: () => void;
  onBack: () => void;
  isCoachingMode?: boolean;
  /** True : pas d'en-tête ni carte récap (composition externe) */
  embedInFinalize?: boolean;
  hideFooter?: boolean;
  wizardShellFooter?: boolean;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  formData,
  selectedLocation,
  imagePreview,
  loading,
  isPremium,
  onFormDataChange,
  onImageSelect,
  onImageRemove,
  onSubmit,
  onBack,
  isCoachingMode = false,
  embedInFinalize = false,
  hideFooter = false,
  wizardShellFooter = false,
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
  const { userProfile } = useUserProfile();
  const pinAvatarUrl = userProfile?.avatar_url || imagePreview || null;
  const photoInputRef = useRef<HTMLInputElement>(null);

  const activityShort =
    activity?.label?.replace(/^[^\s]+\s/, '').toUpperCase() ?? 'SÉANCE';

  const suppressFooter = hideFooter || wizardShellFooter;

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
          'flex flex-col px-0',
          embedInFinalize ? '' : 'flex-1 overflow-y-auto pb-4'
        )}
      >
        {!embedInFinalize && (
          <>
            <AppleStepHeader
              titleVariant="hero"
              title={isCoachingMode ? 'Programmer ma séance' : 'Tout est prêt.'}
              subtitle={
                isCoachingMode
                  ? 'Vérifie les détails pré-remplis par le coach.'
                  : 'Booste pour multiplier ta visibilité.'
              }
              className="shrink-0 pb-0"
            />

            {/* Maquette étape 5 : cartes séparées avec ~12px entre blocs (gap-3 / mt-3) */}
            <div className="mt-5 flex flex-col gap-3">
              <div
                className="overflow-hidden rounded-[18px] bg-white"
                style={{ boxShadow: WIZARD_CARD_SHADOW }}
              >
                <div className="relative h-[220px] w-full overflow-hidden bg-[#c5d9e8] dark:bg-[#1a3550]">
                  {selectedLocation ? (
                    <MiniMapPreview
                      lat={selectedLocation.lat}
                      lng={selectedLocation.lng}
                      avatarUrl={pinAvatarUrl}
                      activityType={formData.activity_type}
                      interactive={false}
                      showHint={false}
                      zoom={13}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <MapPin className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4" style={{ boxShadow: WIZARD_CARD_SHADOW }}>
                <div className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#007AFF]">
                  {activityShort}
                  {formData.distance_km ? ` · ${String(formData.distance_km).replace(',', '.')} km` : ''}
                </div>
                <h3
                  className="mt-1 text-[26px] font-black leading-[1.12] tracking-[-0.02em]"
                  style={{ color: '#0A0F1F' }}
                >
                  {formData.scheduled_at
                    ? `${new Date(formData.scheduled_at).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                      })} · ${new Date(formData.scheduled_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : previewTitle}
                </h3>
                <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
                  {selectedLocation
                    ? `${selectedLocation.name}${
                        formData.max_participants ? ` · ${formData.max_participants} places` : ''
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

              <WizardInsetCard className="rounded-2xl">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    onImageSelect(e);
                    e.target.value = '';
                  }}
                />
                {!imagePreview ? (
                  <Cell
                    icon={<span className="text-[15px]">📷</span>}
                    iconBg="#5AC8FA"
                    title="Ajouter une photo"
                    subtitle="Optionnel · JPG, PNG ou WebP, max 5 Mo"
                    accessory="chevron"
                    last
                    onClick={() => photoInputRef.current?.click()}
                  />
                ) : (
                  <div className="divide-y divide-[#E5E5EA]">
                    <div className="relative mx-4 my-4 overflow-hidden rounded-[12px]">
                      <img src={imagePreview} alt="" className="h-36 w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Retirer la photo"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageRemove();
                        }}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md active:opacity-90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Cell
                      icon={<span className="text-[15px]">📷</span>}
                      iconBg="#5AC8FA"
                      title="Remplacer la photo"
                      subtitle="Choisir une autre image"
                      accessory="chevron"
                      last
                      onClick={() => photoInputRef.current?.click()}
                    />
                  </div>
                )}
              </WizardInsetCard>

              <div className="rounded-2xl bg-[#F2F2F7] px-4 py-3">
                <RouteSelector
                  embedded
                  selectedRouteId={formData.route_id}
                  onRouteSelect={(route) =>
                    route ? onFormDataChange({ route_id: route.id }) : onFormDataChange({ route_id: null })
                  }
                  onAutoFill={({ distance_km, elevation_gain }) =>
                    onFormDataChange({ distance_km, elevation_gain })
                  }
                />
              </div>

              <WizardInsetCard className="rounded-2xl">
                <VisibilitySelector
                  embedded
                  visibilityType={formData.visibility_type}
                  hiddenFromUsers={formData.hidden_from_users}
                  isPremium={isPremium}
                  onVisibilityChange={handleVisibilityChange}
                  onHiddenUsersChange={handleHiddenUsersChange}
                  clubId={formData.club_id}
                />
              </WizardInsetCard>

              <WizardInsetCard className="rounded-2xl">
                <div className="flex items-center gap-3 px-4 py-3">
                  <EmojiBadge
                    emoji={formData.live_tracking_enabled ? '📡' : '🌍'}
                    className={formData.live_tracking_enabled ? 'bg-[#30D158]' : 'bg-[#48484A]'}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[17px] font-normal leading-snug tracking-[-0.4px] text-foreground">
                      Live tracking
                    </p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      {formData.live_tracking_enabled
                        ? 'Les participants pourront partager leur position pendant la séance.'
                        : 'Aucune position partagée sur la carte.'}
                    </p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={formData.live_tracking_enabled}
                    onCheckedChange={(v) => onFormDataChange({ live_tracking_enabled: v })}
                  />
                </div>
              </WizardInsetCard>

              <WizardInsetCard className="rounded-2xl">
                <div className="px-4 pb-4 pt-3">
                  <div className="mb-3 flex gap-3">
                    <EmojiBadge emoji="📝" className="shrink-0 bg-[#64D2FF]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-normal leading-snug tracking-[-0.4px] text-foreground">
                        Note
                      </p>
                      <p className="text-[13px] text-muted-foreground">Optionnel · pour les participants</p>
                    </div>
                  </div>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => onFormDataChange({ description: e.target.value })}
                    placeholder="Détails pour les participants · niveau, matériel, consignes…"
                    rows={3}
                    className="min-h-[88px] w-full resize-none rounded-[12px] border-border/70 bg-[#F2F2F7] text-[15px] leading-snug"
                  />
                </div>
              </WizardInsetCard>

              {!isCoachingMode ? (
                <>
                  <WizardInsetCard className="rounded-2xl">
                    <Cell
                      icon={<span className="text-[15px]">⚡</span>}
                      iconBg="#0066CC"
                      title="Visibilité globale"
                      subtitle="Affiché en tête de la carte"
                      last
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
                  </WizardInsetCard>
                  <WizardInsetCard className="rounded-2xl">
                    <Cell
                      icon={<span className="text-[15px]">📺</span>}
                      iconBg="#FF6482"
                      title="Regarder une vidéo · 15s"
                      subtitle="Pour activer le boost gratuitement"
                      last
                      onClick={() =>
                        toast({
                          title: 'Bientôt disponible',
                          description: 'Le boost vidéo arrive dans une prochaine version.',
                        })
                      }
                    />
                  </WizardInsetCard>
                  <WizardInsetCard className="rounded-2xl">
                    <Cell
                      icon={<span className="text-[15px]">✨</span>}
                      iconBg="#FFD60A"
                      title="Passer Premium"
                      subtitle="Boost illimité"
                      accent
                      last
                      onClick={() => navigate('/subscription')}
                    />
                  </WizardInsetCard>
                </>
              ) : null}

              <WizardInsetCard className="rounded-2xl">
                <RecurrenceSelector
                  variant="integrated"
                  recurrenceType={formData.recurrence_type}
                  recurrenceCount={formData.recurrence_count}
                  onRecurrenceTypeChange={handleRecurrenceTypeChange}
                  onRecurrenceCountChange={handleRecurrenceCountChange}
                />
              </WizardInsetCard>
            </div>
          </>
        )}

        {embedInFinalize && (
          <>
            <h3 className="mb-3 text-[15px] font-semibold text-foreground">Publication</h3>
            <AppleGroup>
              <RecurrenceSelector
                variant="integrated"
                recurrenceType={formData.recurrence_type}
                recurrenceCount={formData.recurrence_count}
                onRecurrenceTypeChange={handleRecurrenceTypeChange}
                onRecurrenceCountChange={handleRecurrenceCountChange}
              />
            </AppleGroup>
          </>
        )}
      </div>

      {!suppressFooter && (
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
