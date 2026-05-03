import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Ruler,
  X,
  Mountain,
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
  TERRAIN_TYPES,
  SessionBlock,
  SessionMode,
  VisibilityType,
  isEnduranceActivity,
  isRunningActivity,
  isCyclingActivity,
  isSwimmingActivity,
  getPacePlaceholder,
  getDistanceUnit,
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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const builderRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [liveTrackingWarningOpen, setLiveTrackingWarningOpen] = useState(false);
  const [openPicker, setOpenPicker] = useState<
    null | 'pace' | 'distance' | 'elevation' | 'participants'
  >(null);
  const [draftPaceMin, setDraftPaceMin] = useState('5');
  const [draftPaceSec, setDraftPaceSec] = useState('30');
  const [draftDistanceWhole, setDraftDistanceWhole] = useState('10');
  const [draftDistanceMeters, setDraftDistanceMeters] = useState('0');
  const [draftElevation, setDraftElevation] = useState('150');
  const [draftParticipants, setDraftParticipants] = useState('20');

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
  const showTerrainField =
    isRunningActivity(formData.activity_type) || isCyclingActivity(formData.activity_type);
  const showElevationField = showTerrainField;
  const distanceUnit = getDistanceUnit(formData.activity_type);

  const handleBlocksChange = (blocks: SessionBlock[]) => {
    onFormDataChange({ blocks: normalizeBlocksForStorage(blocks) });
  };

  const handleRouteAutoFill = (data: { distance_km: string; elevation_gain: string }) => {
    onFormDataChange(data);
  };

  const distanceWholeOptions = Array.from({ length: 201 }, (_, i) => ({
    value: String(i),
    label: String(i),
  }));
  const distanceMetersOptions = Array.from({ length: 40 }, (_, i) => {
    const meters = i * 25;
    return { value: String(meters), label: String(meters).padStart(3, '0') };
  });
  const distanceMetersOnlyOptions = Array.from({ length: 401 }, (_, i) => {
    const meters = i * 25;
    return { value: String(meters), label: String(meters) };
  });
  const distanceMilesDecOptions = Array.from({ length: 100 }, (_, i) => ({
    value: String(i),
    label: String(i).padStart(2, '0'),
  }));
  const elevationOptions = Array.from({ length: 5001 }, (_, i) => ({
    value: String(i),
    label: String(i),
  }));
  const participantsOptions = Array.from({ length: 200 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  const paceMinOptions = Array.from({ length: 60 }, (_, i) => ({
    value: String(i),
    label: String(i).padStart(2, '0'),
  }));
  const paceSecOptions = Array.from({ length: 60 }, (_, i) => ({
    value: String(i),
    label: String(i).padStart(2, '0'),
  }));

  const openDistancePicker = () => {
    const parsedKm = Math.max(
      0,
      Number.parseFloat((formData.distance_km || '0').replace(',', '.')) || 0
    );

    if (distanceUnit === 'mi') {
      const parsedMi = parsedKm / 1.60934;
      const wholeMi = Math.floor(parsedMi);
      const decMi = Math.max(0, Math.min(99, Math.round((parsedMi - wholeMi) * 100)));
      setDraftDistanceWhole(String(wholeMi));
      setDraftDistanceMeters(String(decMi));
    } else if (distanceUnit === 'm') {
      const metersRaw = Math.round(parsedKm * 1000);
      const snappedMeters = Math.max(0, Math.round(metersRaw / 25) * 25);
      setDraftDistanceWhole(String(snappedMeters));
      setDraftDistanceMeters('0');
    } else {
      const wholeKm = Math.floor(parsedKm);
      const remainingMetersRaw = Math.round((parsedKm - wholeKm) * 1000);
      const snappedMeters = Math.min(975, Math.max(0, Math.round(remainingMetersRaw / 25) * 25));
      setDraftDistanceWhole(String(wholeKm));
      setDraftDistanceMeters(String(snappedMeters));
    }
    setOpenPicker('distance');
  };

  const openElevationPicker = () => {
    setDraftElevation(
      String(Math.max(0, Number.parseInt(formData.elevation_gain || '0', 10) || 0))
    );
    setOpenPicker('elevation');
  };

  const openParticipantsPicker = () => {
    setDraftParticipants(
      String(Math.max(1, Number.parseInt(formData.max_participants || '20', 10) || 20))
    );
    setOpenPicker('participants');
  };

  const setVisibility = (t: VisibilityType) => {
    if (t === 'club' && !formData.club_id) return;
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

        {/* Maquette 11 — Médias (Group + Cell) */}
        {showEnduranceFields && (
          <Group inset={false} className="mb-0" title="Médias">
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
          </Group>
        )}

        {/* Distance, dénivelé, terrain */}
        {showEnduranceFields && (
          <AppleGroup title="Mesures">
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <div>
                <Label
                  htmlFor="distance_km"
                  className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85"
                >
                  <Ruler className="h-3.5 w-3.5 text-primary" />
                  Distance ({distanceUnit})
                  {isStructured && (
                    <span className="ml-auto text-[10px] font-normal normal-case text-muted-foreground/70">
                      auto
                    </span>
                  )}
                </Label>
                <Input
                  id="distance_km"
                  value={formData.distance_km}
                  readOnly
                  onClick={isStructured ? undefined : openDistancePicker}
                  placeholder={
                    isStructured
                      ? '—'
                      : isSwimmingActivity(formData.activity_type)
                      ? '1500'
                      : '10'
                  }
                  className={cn(
                    'h-11 rounded-xl border-border/60 bg-secondary/40 text-[15px] tracking-tight',
                    isStructured ? 'cursor-not-allowed bg-secondary/20' : 'cursor-pointer'
                  )}
                  title={
                    isStructured
                      ? 'Calculée automatiquement à partir de la structure de la séance'
                      : undefined
                  }
                />
              </div>
              {showElevationField && (
                <div>
                  <Label
                    htmlFor="elevation_gain"
                    className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85"
                  >
                    <Mountain className="h-3.5 w-3.5 text-emerald-600" />
                    D+ (m)
                  </Label>
                  <Input
                    id="elevation_gain"
                    value={formData.elevation_gain}
                    readOnly
                    onClick={openElevationPicker}
                    placeholder="150"
                    className="h-11 cursor-pointer rounded-xl border-border/60 bg-secondary/40 text-[15px] tracking-tight"
                  />
                </div>
              )}
            </div>
            {showTerrainField && (
              <div className="border-t border-border/40 px-4 py-3">
                <Label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
                  <Mountain className="h-3.5 w-3.5 text-amber-600" />
                  Type de terrain
                </Label>
                <Select
                  value={formData.terrain_type}
                  onValueChange={(v) => onFormDataChange({ terrain_type: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/40">
                    <SelectValue placeholder="Sélectionner le terrain" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AppleGroup>
        )}

        {/* Maquette 11 — Visibilité (Cells + suivi live + aperçu) */}
        <Group
          inset={false}
          className="mb-0"
          title="Visibilité"
          footer={
            <>
              Le suivi live partage ta position en temps réel pendant la séance, comme sur la page
              « En direct ».
            </>
          }
        >
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
            subtitle={
              formData.club_id
                ? 'Réservé aux membres du club'
                : 'Sélectionne un club ci-dessous'
            }
            accessory={
              formData.visibility_type === 'club'
                ? 'check'
                : formData.club_id
                  ? 'chevron'
                  : 'none'
            }
            last={false}
            className={cn(!formData.club_id && 'cursor-default opacity-60')}
            onClick={formData.club_id ? () => setVisibility('club') : undefined}
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
          <Cell
            title="Participants max"
            subtitle="Limite d'inscriptions"
            value={formData.max_participants || '20'}
            accessory="chevron"
            onClick={openParticipantsPicker}
          />
          <div className="border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
            <Label className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              Club (optionnel)
            </Label>
            <ClubSelector
              selectedClubId={formData.club_id}
              onClubSelect={(clubId) => {
                const next: Partial<SessionFormData> = { club_id: clubId };
                if (clubId && formData.visibility_type !== 'club') {
                  next.visibility_type = 'club';
                  next.friends_only = false;
                }
                onFormDataChange(next);
              }}
            />
          </div>
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
          <div className="flex items-center gap-3 border-t border-[rgba(60,60,67,0.12)] px-4 py-3 dark:border-[rgba(84,84,88,0.4)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(255,59,48,0.12)]">
              <span
                className="h-2 w-2 rounded-full bg-[#ff3b30]"
                style={{ boxShadow: '0 0 0 4px rgba(255,59,48,0.18)' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold tracking-[-0.3px] text-foreground">
                Aperçu live
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Avatars visibles sur la carte · auto-stop à l'arrivée
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: 'Aperçu',
                  description:
                    'Pendant la séance, les participants en live apparaissent sur la carte Découvrir.',
                })
              }
              className="shrink-0 rounded-full bg-[rgba(118,118,128,0.12)] px-3.5 py-1.5 text-[13px] font-semibold tracking-[-0.2px] text-primary active:opacity-70"
            >
              Voir
            </button>
          </div>
        </Group>

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
        open={openPicker === 'pace'}
        onClose={() => setOpenPicker(null)}
        title="Allure générale"
        columns={[
          { items: paceMinOptions, value: draftPaceMin, onChange: setDraftPaceMin, suffix: 'min' },
          { items: paceSecOptions, value: draftPaceSec, onChange: setDraftPaceSec, suffix: 's' },
        ]}
        onConfirm={() => {
          onFormDataChange({
            pace_general: `${draftPaceMin}:${draftPaceSec.padStart(2, '0')}/km`,
          });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'distance'}
        onClose={() => setOpenPicker(null)}
        title={`Distance (${distanceUnit})`}
        columns={
          distanceUnit === 'm'
            ? [
                {
                  items: distanceMetersOnlyOptions,
                  value: draftDistanceWhole,
                  onChange: setDraftDistanceWhole,
                  suffix: 'm',
                },
              ]
            : distanceUnit === 'mi'
            ? [
                {
                  items: distanceWholeOptions,
                  value: draftDistanceWhole,
                  onChange: setDraftDistanceWhole,
                  suffix: 'mi',
                },
                {
                  items: distanceMilesDecOptions,
                  value: draftDistanceMeters,
                  onChange: setDraftDistanceMeters,
                },
              ]
            : [
                {
                  items: distanceWholeOptions,
                  value: draftDistanceWhole,
                  onChange: setDraftDistanceWhole,
                },
                {
                  items: distanceMetersOptions,
                  value: draftDistanceMeters,
                  onChange: setDraftDistanceMeters,
                  suffix: 'm',
                },
              ]
        }
        onConfirm={() => {
          let totalKm = 0;
          if (distanceUnit === 'mi') {
            const wholeMi = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            const decMi = Math.max(
              0,
              Math.min(99, Number.parseInt(draftDistanceMeters, 10) || 0)
            );
            totalKm = (wholeMi + decMi / 100) * 1.60934;
          } else if (distanceUnit === 'm') {
            const meters = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            totalKm = meters / 1000;
          } else {
            const wholeKm = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            const meters = Math.min(
              975,
              Math.max(0, Number.parseInt(draftDistanceMeters, 10) || 0)
            );
            totalKm = wholeKm + meters / 1000;
          }
          const formattedDistance = Number(totalKm.toFixed(3)).toString();
          onFormDataChange({ distance_km: formattedDistance });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'elevation'}
        onClose={() => setOpenPicker(null)}
        title="Dénivelé positif"
        columns={[
          {
            items: elevationOptions,
            value: draftElevation,
            onChange: setDraftElevation,
            suffix: 'm',
          },
        ]}
        onConfirm={() => {
          onFormDataChange({ elevation_gain: draftElevation });
          setOpenPicker(null);
        }}
      />
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
