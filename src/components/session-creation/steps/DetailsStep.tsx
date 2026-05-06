import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Building2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SessionFormData,
  SelectedLocation,
  ACTIVITY_TYPES,
  SessionBlock,
  VisibilityType,
  isEnduranceActivity,
} from '../types';
import { ClubSelector } from '@/components/ClubSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SessionBlockBuilder } from '../SessionBlockBuilder';
import { RouteSelector } from '../RouteSelector';
import { cn } from '@/lib/utils';
import { WheelValuePickerModal } from '@/components/ui/ios-wheel-picker';
import {
  computeBlocksDistanceKm,
  formatDistanceForInput,
} from '../utils/computeBlocksDistance';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import {
  normalizeBlocksForStorage,
} from '@/lib/sessionBlockCalculations';
import { AppleStepHeader, AppleStepFooter, AppleGroup } from './AppleStepChrome';
import { Group, Cell } from '@/components/apple';
import { SessionSchemaMiniChart, sessionSchemaLegend } from '../SessionSchemaMiniChart';
import { VisibilitySelector } from '../VisibilitySelector';

interface DetailsStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  isPremium: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onNext: () => void;
  onBack: () => void;
  /** Masque les boutons Retour / Aperçu (cas avancé) */
  hideNavigation?: boolean;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  formData,
  selectedLocation,
  imagePreview,
  isPremium,
  onFormDataChange,
  onImageSelect,
  onImageRemove,
  onNext,
  onBack,
  hideNavigation = false,
}) => {
  const builderRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [liveTrackingWarningOpen, setLiveTrackingWarningOpen] = useState(false);
  const [openPicker, setOpenPicker] = useState<null | 'participants'>(null);
  const [draftParticipants, setDraftParticipants] = useState('20');
  const [showClubSelector, setShowClubSelector] = useState(false);

  // Auto-generate title suggestion
  useEffect(() => {
    if (!formData.title && formData.activity_type && selectedLocation) {
      onFormDataChange({
        title: resolveSessionTitle({
          title: '',
          activity_type: formData.activity_type,
          locationName: selectedLocation.name,
        }),
      });
    }
  }, [formData.activity_type, selectedLocation]);

  // Force structured mode when sport supports it
  useEffect(() => {
    if (formData.session_mode !== 'structured') {
      onFormDataChange({ session_mode: 'structured' });
    }
  }, [formData.session_mode, onFormDataChange]);

  // Auto-compute distance from structured blocks
  const isStructured = true;
  const resolvedBlocks = React.useMemo(
    () => normalizeBlocksForStorage(formData.blocks),
    [formData.blocks]
  );
  const computedDistanceKm = React.useMemo(
    () => (isStructured ? computeBlocksDistanceKm(resolvedBlocks) : null),
    [isStructured, resolvedBlocks]
  );
  useEffect(() => {
    if (!isStructured || computedDistanceKm == null) return;
    const formatted = formatDistanceForInput(computedDistanceKm);
    if (formatted !== formData.distance_km) {
      onFormDataChange({ distance_km: formatted });
    }
  }, [isStructured, computedDistanceKm, formData.distance_km, onFormDataChange]);

  const showEnduranceFields = isEnduranceActivity(formData.activity_type);
  const handleBlocksChange = (blocks: SessionBlock[]) => {
    onFormDataChange({ blocks: normalizeBlocksForStorage(blocks) });
  };

  const handleRouteAutoFill = (data: { distance_km: string; elevation_gain: string }) => {
    onFormDataChange(data);
  };

  const participantsOptions = Array.from({ length: 200 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const openParticipantsPicker = () => {
    setDraftParticipants(
      String(Math.max(1, Number.parseInt(formData.max_participants || '20', 10) || 20))
    );
    setOpenPicker('participants');
  };

  const setVisibility = (t: VisibilityType) => {
    onFormDataChange({ visibility_type: t, friends_only: t === 'friends' });
  };

  const legend = sessionSchemaLegend(resolvedBlocks);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={cn('flex min-h-0 w-full flex-col', !hideNavigation && 'flex-1')}
    >
      <div
        className={cn(
          'space-y-5 px-1',
          hideNavigation ? 'pb-0' : 'flex-1 overflow-y-auto pb-4'
        )}
      >
        {!hideNavigation && (
          <AppleStepHeader
            step={4}
            title="Compose ta séance"
            subtitle="Glisse les blocs pour structurer l'effort."
          />
        )}

        {/* Maquette 11 — carte schéma (bandeau + Modifier + éditeur) */}
        {showEnduranceFields && (
          <div
            id="session-schema-card"
            className="rounded-[14px] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-muted-foreground">
                SCHÉMA · {resolvedBlocks.length} bloc{resolvedBlocks.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="shrink-0 text-[15px] font-medium text-primary active:opacity-60"
                onClick={() =>
                  builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                Modifier
              </button>
            </div>
            <SessionSchemaMiniChart blocks={resolvedBlocks} />
            <div className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="min-w-0 truncate">{legend.left}</span>
              <span className="min-w-0 truncate text-center">{legend.mid}</span>
              <span className="min-w-0 truncate text-right">{legend.right}</span>
            </div>
            <div
              ref={builderRef}
              className="mt-4 border-t border-[rgba(60,60,67,0.12)] pt-4 dark:border-[rgba(84,84,88,0.4)]"
            >
              <SessionBlockBuilder
                blocks={resolvedBlocks}
                activityType={formData.activity_type}
                onBlocksChange={handleBlocksChange}
              />
            </div>
          </div>
        )}

        {/* Identity — sport + nom */}
        <AppleGroup title="Identité">
          <div className="px-4 py-3">
            <Label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
              Sport
            </Label>
            <Select
              value={formData.activity_type}
              onValueChange={(v) => onFormDataChange({ activity_type: v })}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-secondary/40">
                <SelectValue placeholder="Choisir un sport" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="mr-1.5">{t.icon}</span>
                    {t.label.replace(/^.+?\s/, '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t border-border/40 px-4 py-3">
            <Label className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
              Nom de la séance
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => onFormDataChange({ title: e.target.value })}
              placeholder="Footing matinal..."
              className="h-11 rounded-xl border-border/60 bg-secondary/40 text-[15px] tracking-tight"
            />
          </div>
        </AppleGroup>

        {/* Maquette 11 — Médias + Visibilité (Group + Cells) */}
        {showEnduranceFields && (
          <Group inset={false} className="mb-0" title="Médias et visibilité">
            <Cell
              icon={<span className="text-[15px]">📷</span>}
              iconBg="#ff9500"
              title="Ajouter une photo"
              accessory="chevron"
              onClick={() => photoInputRef.current?.click()}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageSelect}
            />
            {imagePreview ? (
              <div className="relative border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
                <div className="relative overflow-hidden rounded-xl">
                  <img src={imagePreview} alt="" className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    onClick={onImageRemove}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md active:scale-95"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
              <RouteSelector
                selectedRouteId={formData.route_id}
                onRouteSelect={(route) => onFormDataChange({ route_id: route?.id || null })}
                onAutoFill={handleRouteAutoFill}
              />
            </div>
            <div className="border-t border-[rgba(60,60,67,0.12)] px-4 py-2 text-[12px] text-muted-foreground dark:border-[rgba(84,84,88,0.4)]">
              Le suivi live partage ta position en temps réel pendant la séance.
            </div>
          <Cell
            icon={<span className="text-[15px]">👥</span>}
            iconBg="#0066CC"
            title="Mes amis"
            subtitle="Visible par tes amis"
            accessory={formData.visibility_type === 'friends' ? 'check' : 'chevron'}
            onClick={() => setVisibility('friends')}
          />
          <Cell
            icon={<span className="text-[15px]">🌍</span>}
            iconBg="hsl(var(--foreground))"
            title="Tout le monde"
            subtitle={
              isPremium
                ? 'Visibilité étendue (Premium)'
                : 'Visible localement dans Découvrir (5 km par défaut)'
            }
            accessory={formData.visibility_type === 'public' ? 'check' : 'chevron'}
            onClick={() => setVisibility('public')}
          />
          <Cell
            icon={<Building2 className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />}
            iconBg="#007AFF"
            title="Club"
            subtitle={formData.club_id ? 'Réservé aux membres du club' : 'Choisir un club'}
            accessory={
              formData.visibility_type === 'club' && formData.club_id ? 'check' : 'chevron'
            }
            last={false}
            onClick={() => {
              setShowClubSelector((prev) => !prev);
              if (formData.club_id) {
                setVisibility('club');
              }
            }}
          />
          {formData.visibility_type === 'friends' ? (
          <div className="border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
            <VisibilitySelector
              visibilityType={formData.visibility_type}
              hiddenFromUsers={formData.hidden_from_users}
              isPremium={isPremium}
              onVisibilityChange={(t) =>
                onFormDataChange({ visibility_type: t, friends_only: t === 'friends' })
              }
              onHiddenUsersChange={(ids) => onFormDataChange({ hidden_from_users: ids })}
              clubId={formData.club_id}
              friendsHiddenSectionOnly
            />
          </div>
          ) : null}
          {showClubSelector ? (
            <div className="border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
              <ClubSelector
                selectedClubId={formData.club_id}
                onClubSelect={(clubId) => {
                  const next: Partial<SessionFormData> = { club_id: clubId };
                  if (clubId) {
                    next.visibility_type = 'club';
                    next.friends_only = false;
                  } else if (formData.visibility_type === 'club') {
                    next.visibility_type = 'friends';
                    next.friends_only = true;
                  }
                  onFormDataChange(next);
                }}
              />
            </div>
          ) : null}
          <Cell
            title="Participants max"
            subtitle="Limite d'inscriptions"
            value={formData.max_participants || '20'}
            accessory="chevron"
            onClick={openParticipantsPicker}
          />
          <Cell
            icon={<span className="text-[15px]">📡</span>}
            iconBg="#ff3b30"
            title="Live tracking"
            subtitle="Diffuse ma position pendant la séance"
            accessory="none"
          >
            <Switch
              checked={formData.live_tracking_enabled}
              onCheckedChange={(checked) => {
                if (checked) setLiveTrackingWarningOpen(true);
                else onFormDataChange({ live_tracking_enabled: false });
              }}
              className="shrink-0"
            />
          </Cell>
        </Group>
        )}

        {/* Description */}
        <AppleGroup title="Notes">
          <div className="px-4 py-3">
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ description: e.target.value })}
              placeholder="Niveau requis, matériel recommandé..."
              rows={3}
              className="resize-none rounded-xl border-border/60 bg-secondary/40 text-[15px] tracking-tight"
            />
          </div>
        </AppleGroup>

        <AlertDialog
          open={liveTrackingWarningOpen}
          onOpenChange={setLiveTrackingWarningOpen}
        >
          <AlertDialogContent className="max-w-[320px] gap-0 rounded-[14px] border-border/80 p-0 shadow-xl">
            <AlertDialogHeader className="space-y-2 p-5 pb-3">
              <AlertDialogTitle className="text-center text-[17px] font-semibold">
                Activer le live tracking ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-[13px] leading-relaxed text-muted-foreground">
                Si vous activez cette option, chaque participant pourra choisir de partager sa
                position en direct sur la carte pendant le créneau de la séance. Vous pouvez
                l'arrêter à tout moment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="border-t border-border">
              <AlertDialogCancel className="h-12 w-full rounded-none border-0 text-[17px] font-normal text-primary hover:bg-secondary/60">
                Annuler
              </AlertDialogCancel>
            </div>
            <div className="border-t border-border">
              <AlertDialogAction
                className="h-12 w-full rounded-none border-0 bg-transparent text-[17px] font-semibold text-emerald-600 hover:bg-secondary/60"
                onClick={() => onFormDataChange({ live_tracking_enabled: true })}
              >
                Activer pour cette séance
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <WheelValuePickerModal
        open={openPicker === 'participants'}
        onClose={() => setOpenPicker(null)}
        title="Participants max"
        columns={[
          {
            items: participantsOptions,
            value: draftParticipants,
            onChange: setDraftParticipants,
            suffix: 'pers.',
          },
        ]}
        onConfirm={() => {
          onFormDataChange({ max_participants: draftParticipants });
          setOpenPicker(null);
        }}
      />

      {!hideNavigation && (
        <AppleStepFooter
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!formData.activity_type || !selectedLocation}
          nextLabel="Aperçu"
        />
      )}
    </motion.div>
  );
};
