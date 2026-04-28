import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Users, Ruler, ImagePlus, X, Gauge, Mountain, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  SessionFormData, 
  SelectedLocation, 
  ACTIVITY_TYPES, 
  TERRAIN_TYPES,
  SessionBlock,
  SessionMode,
  isEnduranceActivity,
  isRunningActivity,
  isCyclingActivity,
  isSwimmingActivity,
  getPacePlaceholder,
  getDistanceUnit
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
import { computeBlocksDistanceKm, formatDistanceForInput } from '../utils/computeBlocksDistance';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { normalizeBlocksForStorage, resolveSessionTotals, zoneLabel } from '@/lib/sessionBlockCalculations';

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
  const [liveTrackingWarningOpen, setLiveTrackingWarningOpen] = useState(false);
  const [openPicker, setOpenPicker] = useState<null | 'pace' | 'distance' | 'elevation' | 'participants'>(null);
  const [draftPaceMin, setDraftPaceMin] = useState("5");
  const [draftPaceSec, setDraftPaceSec] = useState("30");
  const [draftDistanceWhole, setDraftDistanceWhole] = useState("10");
  const [draftDistanceMeters, setDraftDistanceMeters] = useState("0");
  const [draftElevation, setDraftElevation] = useState("150");
  const [draftParticipants, setDraftParticipants] = useState("20");
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

  // Auto-compute distance from structured blocks
  const isStructured = formData.session_mode === 'structured';
  const resolvedBlocks = React.useMemo(() => normalizeBlocksForStorage(formData.blocks), [formData.blocks]);
  const resolvedTotals = React.useMemo(() => resolveSessionTotals(resolvedBlocks), [resolvedBlocks]);
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
  const showTerrainField = isRunningActivity(formData.activity_type) || isCyclingActivity(formData.activity_type);
  const showElevationField = showTerrainField;
  const distanceUnit = getDistanceUnit(formData.activity_type);
  const pacePlaceholder = getPacePlaceholder(formData.activity_type);
  const selectedActivityMeta = ACTIVITY_TYPES.find((activity) => activity.value === formData.activity_type);

  const handleModeChange = (mode: SessionMode) => {
    onFormDataChange({ session_mode: mode });
    // Clear blocks when switching to simple mode
    if (mode === 'simple') {
      onFormDataChange({ blocks: [] });
    }
  };

  const handleBlocksChange = (blocks: SessionBlock[]) => {
    onFormDataChange({ blocks: normalizeBlocksForStorage(blocks) });
  };

  const handleRouteAutoFill = (data: { distance_km: string; elevation_gain: string }) => {
    onFormDataChange(data);
  };

  const distanceWholeOptions = Array.from({ length: 201 }, (_, i) => ({ value: String(i), label: String(i) }));
  const distanceMetersOptions = Array.from({ length: 40 }, (_, i) => {
    const meters = i * 25;
    return {
      value: String(meters),
      label: String(meters).padStart(3, '0'),
    };
  });
  const distanceMetersOnlyOptions = Array.from({ length: 401 }, (_, i) => {
    const meters = i * 25;
    return {
      value: String(meters),
      label: String(meters),
    };
  });
  const distanceMilesDecOptions = Array.from({ length: 100 }, (_, i) => ({
    value: String(i),
    label: String(i).padStart(2, '0'),
  }));
  const elevationOptions = Array.from({ length: 5001 }, (_, i) => ({ value: String(i), label: String(i) }));
  const participantsOptions = Array.from({ length: 200 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const paceMinOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));
  const paceSecOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }));

  const openDistancePicker = () => {
    const parsedKm = Math.max(0, Number.parseFloat((formData.distance_km || "0").replace(",", ".")) || 0);

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
      setDraftDistanceMeters("0");
    } else {
      const wholeKm = Math.floor(parsedKm);
      const remainingMetersRaw = Math.round((parsedKm - wholeKm) * 1000);
      const snappedMeters = Math.min(975, Math.max(0, Math.round(remainingMetersRaw / 25) * 25));
      setDraftDistanceWhole(String(wholeKm));
      setDraftDistanceMeters(String(snappedMeters));
    }
    setOpenPicker("distance");
  };

  const openPacePicker = () => {
    const raw = (formData.pace_general || "").trim();
    const mmss = raw.match(/(\d{1,2}):(\d{2})/);
    const min = mmss ? Number.parseInt(mmss[1], 10) : 5;
    const sec = mmss ? Number.parseInt(mmss[2], 10) : 30;
    setDraftPaceMin(String(Math.max(0, Math.min(59, min))));
    setDraftPaceSec(String(Math.max(0, Math.min(59, sec))));
    setOpenPicker("pace");
  };

  const openElevationPicker = () => {
    setDraftElevation(String(Math.max(0, Number.parseInt(formData.elevation_gain || "0", 10) || 0)));
    setOpenPicker("elevation");
  };

  const openParticipantsPicker = () => {
    setDraftParticipants(String(Math.max(1, Number.parseInt(formData.max_participants || "20", 10) || 20)));
    setOpenPicker("participants");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn('flex min-h-0 w-full flex-col', !hideNavigation && 'flex-1')}
    >
      <div className={cn('space-y-4', hideNavigation ? 'pb-0' : 'flex-1 overflow-y-auto pb-4')}>
        {/* Session identity — aligné sur le style coaching (CreateCoachingSessionDialog) */}
        <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Sport</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(v) => onFormDataChange({ activity_type: v })}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-card">
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
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Nom de la séance</Label>
              <Input
                value={formData.title}
                onChange={(e) => onFormDataChange({ title: e.target.value })}
                placeholder="Footing matinal..."
                className="h-11 rounded-xl border-border bg-card"
              />
            </div>
          </div>

          {showEnduranceFields && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('simple')}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  formData.session_mode === 'simple'
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/70"
                )}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('structured')}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  formData.session_mode === 'structured'
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/70"
                )}
              >
                Avec blocs
              </button>
            </div>
          )}
        </div>

        {/* Simple Mode Content */}
        {(formData.session_mode === 'simple' || !showEnduranceFields) && showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4 space-y-4">
            {/* General Pace */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-blue-500" />
                Allure générale
              </Label>
              <Input
                value={formData.pace_general || ''}
                readOnly
                onClick={openPacePicker}
                placeholder={pacePlaceholder}
                className="h-11 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Structured Mode - Block Builder */}
        {formData.session_mode === 'structured' && showEnduranceFields && (
          <div className="space-y-3 rounded-[28px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <SessionBlockBuilder
              blocks={resolvedBlocks}
              activityType={formData.activity_type}
              onBlocksChange={handleBlocksChange}
            />
          </div>
        )}

        {/* Route Selector - For endurance sports */}
        {showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4">
            <RouteSelector
              selectedRouteId={formData.route_id}
              onRouteSelect={(route) => onFormDataChange({ route_id: route?.id || null })}
              onAutoFill={handleRouteAutoFill}
            />
          </div>
        )}

        {/* Distance, Elevation, Terrain */}
        {showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4 space-y-4">
            {/* Distance & Elevation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="distance_km" className="text-sm font-medium flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-primary" />
                  Distance ({distanceUnit})
                  {isStructured && (
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground uppercase tracking-wide">
                      auto
                    </span>
                  )}
                </Label>
                <Input
                  id="distance_km"
                  value={formData.distance_km}
                  readOnly
                  onClick={isStructured ? undefined : openDistancePicker}
                  placeholder={isStructured ? '—' : (isSwimmingActivity(formData.activity_type) ? "1500" : "10")}
                  className={cn(
                    "h-11 mt-1.5",
                    isStructured ? "cursor-not-allowed bg-muted/50" : "cursor-pointer"
                  )}
                  title={isStructured ? "Calculée automatiquement à partir de la structure de la séance" : undefined}
                />
                {isStructured && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Calculée à partir de la structure
                  </p>
                )}
              </div>
              {showElevationField && (
                <div>
                  <Label htmlFor="elevation_gain" className="text-sm font-medium flex items-center gap-1.5">
                    <Mountain className="w-4 h-4 text-green-600" />
                    D+ (m)
                  </Label>
                  <Input
                    id="elevation_gain"
                    value={formData.elevation_gain}
                    readOnly
                    onClick={openElevationPicker}
                    placeholder="150"
                    className="h-11 mt-1.5 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Terrain Type */}
            {showTerrainField && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <Mountain className="w-4 h-4 text-amber-600" />
                  Type de terrain
                </Label>
                <Select value={formData.terrain_type} onValueChange={(v) => onFormDataChange({ terrain_type: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sélectionner le terrain" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Visibility & Participants */}
        <div className="bg-card rounded-2xl p-4 space-y-4">
          {/* Max participants */}
          <div>
            <Label htmlFor="max_participants" className="text-sm font-medium flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Participants max
            </Label>
            <Input
              id="max_participants"
              value={formData.max_participants}
              readOnly
              onClick={openParticipantsPicker}
              placeholder="Illimité"
              className="h-11 mt-1.5 cursor-pointer"
            />
          </div>

          {/* Club selector - moved before visibility */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              Club (optionnel)
            </Label>
            <ClubSelector
              selectedClubId={formData.club_id}
              onClubSelect={(clubId) => {
                onFormDataChange({ club_id: clubId });
                // Auto-switch to club visibility if a club is selected
                if (clubId && formData.visibility_type !== 'club') {
                  onFormDataChange({ visibility_type: 'club' });
                }
              }}
            />
          </div>

          {/* Live Tracking Toggle — avertissement avant activation */}
          <div className="rounded-[14px] border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-[10px] bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/25">
                  <Radio className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <Label className="text-[15px] font-semibold text-foreground">Live tracking</Label>
                  <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                    Optionnel : les participants pourront partager leur position sur la carte pendant la séance.
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.live_tracking_enabled}
                onCheckedChange={(checked) => {
                  if (checked) setLiveTrackingWarningOpen(true);
                  else onFormDataChange({ live_tracking_enabled: false });
                }}
              />
            </div>
          </div>

          <AlertDialog open={liveTrackingWarningOpen} onOpenChange={setLiveTrackingWarningOpen}>
            <AlertDialogContent className="rounded-[14px] max-w-[320px] p-0 gap-0 border-border/80 shadow-xl">
              <AlertDialogHeader className="p-5 pb-3 space-y-2">
                <AlertDialogTitle className="text-[17px] font-semibold text-center">
                  Activer le live tracking ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-muted-foreground text-center leading-relaxed">
                  Si vous activez cette option, chaque participant pourra choisir de partager sa position en direct
                  sur la carte pendant le créneau de la séance. Ce n’est pas obligatoire : le partage se fait depuis{' '}
                  <span className="font-medium text-foreground">Mes séances</span> pour chacun. Vous pouvez l’arrêter à
                  tout moment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="border-t border-border">
                <AlertDialogCancel className="w-full h-12 border-0 rounded-none text-[17px] font-normal text-primary hover:bg-secondary/60">
                  Annuler
                </AlertDialogCancel>
              </div>
              <div className="border-t border-border">
                <AlertDialogAction
                  className="w-full h-12 border-0 rounded-none bg-transparent hover:bg-secondary/60 text-[17px] font-semibold text-emerald-600"
                  onClick={() => onFormDataChange({ live_tracking_enabled: true })}
                >
                  Activer pour cette séance
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>


        {/* Image & Notes */}
        <div className="bg-card rounded-2xl p-4 space-y-4">
          {/* Image */}
          <div>
            <Label className="text-sm font-medium">Image (optionnel)</Label>
            {!imagePreview ? (
              <label className="mt-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageSelect}
                  className="hidden"
                />
                <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Ajouter une photo</span>
              </label>
            ) : (
              <div className="relative mt-2">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={onImageRemove}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">Notes (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ description: e.target.value })}
              placeholder="Niveau requis, matériel recommandé..."
              rows={3}
              className="mt-1.5"
            />
          </div>
        </div>
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
          onFormDataChange({ pace_general: `${draftPaceMin}:${draftPaceSec.padStart(2, '0')}/km` });
          setOpenPicker(null);
        }}
      />
      <WheelValuePickerModal
        open={openPicker === 'distance'}
        onClose={() => setOpenPicker(null)}
        title={`Distance (${distanceUnit})`}
        columns={distanceUnit === 'm'
          ? [{ items: distanceMetersOnlyOptions, value: draftDistanceWhole, onChange: setDraftDistanceWhole, suffix: 'm' }]
          : distanceUnit === 'mi'
            ? [
                { items: distanceWholeOptions, value: draftDistanceWhole, onChange: setDraftDistanceWhole, suffix: 'mi' },
                { items: distanceMilesDecOptions, value: draftDistanceMeters, onChange: setDraftDistanceMeters },
              ]
            : [
                { items: distanceWholeOptions, value: draftDistanceWhole, onChange: setDraftDistanceWhole },
                { items: distanceMetersOptions, value: draftDistanceMeters, onChange: setDraftDistanceMeters, suffix: 'm' },
              ]}
        onConfirm={() => {
          let totalKm = 0;
          if (distanceUnit === 'mi') {
            const wholeMi = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            const decMi = Math.max(0, Math.min(99, Number.parseInt(draftDistanceMeters, 10) || 0));
            totalKm = (wholeMi + decMi / 100) * 1.60934;
          } else if (distanceUnit === 'm') {
            const meters = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            totalKm = meters / 1000;
          } else {
            const wholeKm = Math.max(0, Number.parseInt(draftDistanceWhole, 10) || 0);
            const meters = Math.min(975, Math.max(0, Number.parseInt(draftDistanceMeters, 10) || 0));
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
          { items: elevationOptions, value: draftElevation, onChange: setDraftElevation, suffix: 'm' },
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
          { items: participantsOptions, value: draftParticipants, onChange: setDraftParticipants, suffix: 'pers.' },
        ]}
        onConfirm={() => {
          onFormDataChange({ max_participants: draftParticipants });
          setOpenPicker(null);
        }}
      />

      {!hideNavigation && (
        <div className="flex gap-3 mt-auto pt-4">
          <Button variant="outline" onClick={onBack} className="h-14 px-5">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={onNext}
            disabled={!formData.activity_type || !selectedLocation}
            className="flex-1 h-14 text-lg font-semibold"
          >
            Aperçu
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};
