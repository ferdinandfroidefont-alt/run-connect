import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Users, Ruler, ImagePlus, X, Gauge, Mountain, Flame, Radio } from 'lucide-react';
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
  INTENSITY_LEVELS, 
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
import { SessionModeSwitch } from '../SessionModeSwitch';
import { SessionBlockBuilder } from '../SessionBlockBuilder';
import { RouteSelector } from '../RouteSelector';
import { cn } from '@/lib/utils';

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
}) => {
  const [liveTrackingWarningOpen, setLiveTrackingWarningOpen] = useState(false);
  // Auto-generate title suggestion
  useEffect(() => {
    if (!formData.title && formData.activity_type && selectedLocation) {
      const activity = ACTIVITY_TYPES.find(a => a.value === formData.activity_type);
      const locationShort = selectedLocation.name.split(',')[0];
      const activityLabel = activity?.label?.replace(/^[^\s]+\s/, '');
      const suggestion = `${activityLabel || 'Séance'} à ${locationShort}`;
      onFormDataChange({ title: suggestion });
    }
  }, [formData.activity_type, selectedLocation]);

  const showEnduranceFields = isEnduranceActivity(formData.activity_type);
  const showTerrainField = isRunningActivity(formData.activity_type) || isCyclingActivity(formData.activity_type);
  const showElevationField = showTerrainField;
  const distanceUnit = getDistanceUnit(formData.activity_type);
  const pacePlaceholder = getPacePlaceholder(formData.activity_type);

  const handleModeChange = (mode: SessionMode) => {
    onFormDataChange({ session_mode: mode });
    // Clear blocks when switching to simple mode
    if (mode === 'simple') {
      onFormDataChange({ blocks: [] });
    }
  };

  const handleBlocksChange = (blocks: SessionBlock[]) => {
    onFormDataChange({ blocks });
  };

  const handleRouteAutoFill = (data: { distance_km: string; elevation_gain: string }) => {
    onFormDataChange(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Title - Always first */}
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Titre de la séance *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onFormDataChange({ title: e.target.value })}
              placeholder="ex: Footing matinal au parc"
              className="h-12 mt-1.5"
              required
            />
          </div>
        </div>

        {/* Mode Switch - Only for endurance sports */}
        {showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4">
            <Label className="text-sm font-medium mb-3 block">Type de séance</Label>
            <SessionModeSwitch 
              mode={formData.session_mode} 
              onChange={handleModeChange}
            />
          </div>
        )}

        {/* Simple Mode Content */}
        {(formData.session_mode === 'simple' || !showEnduranceFields) && showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4 space-y-4">
            {/* Intensity Level */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Intensité
              </Label>
              <div className="grid grid-cols-5 gap-1.5">
                {INTENSITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => onFormDataChange({ intensity: level.value })}
                    className={cn(
                      "py-2.5 px-1 rounded-xl text-xs font-semibold transition-all text-center",
                      formData.intensity === level.value
                        ? `${level.color} text-white shadow-sm`
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {level.label.split(' - ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* General Pace */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-blue-500" />
                Allure générale
              </Label>
              <Input
                value={formData.pace_general}
                onChange={(e) => onFormDataChange({ pace_general: e.target.value })}
                placeholder={pacePlaceholder}
                className="h-11"
              />
            </div>
          </div>
        )}

        {/* Structured Mode - Block Builder */}
        {formData.session_mode === 'structured' && showEnduranceFields && (
          <div className="bg-card rounded-2xl p-4">
            <SessionBlockBuilder
              blocks={formData.blocks}
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
                </Label>
                <Input
                  id="distance_km"
                  type="number"
                  step="0.1"
                  value={formData.distance_km}
                  onChange={(e) => onFormDataChange({ distance_km: e.target.value })}
                  placeholder={isSwimmingActivity(formData.activity_type) ? "1500" : "10"}
                  className="h-11 mt-1.5"
                />
              </div>
              {showElevationField && (
                <div>
                  <Label htmlFor="elevation_gain" className="text-sm font-medium flex items-center gap-1.5">
                    <Mountain className="w-4 h-4 text-green-600" />
                    D+ (m)
                  </Label>
                  <Input
                    id="elevation_gain"
                    type="number"
                    value={formData.elevation_gain}
                    onChange={(e) => onFormDataChange({ elevation_gain: e.target.value })}
                    placeholder="150"
                    className="h-11 mt-1.5"
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
              type="number"
              value={formData.max_participants}
              onChange={(e) => onFormDataChange({ max_participants: e.target.value })}
              placeholder="Illimité"
              min="1"
              className="h-11 mt-1.5"
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

      {/* Navigation */}
      <div className="flex gap-3 mt-auto pt-4">
        <Button variant="outline" onClick={onBack} className="h-14 px-5">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          onClick={onNext}
          disabled={!formData.title}
          className="flex-1 h-14 text-lg font-semibold"
        >
          Aperçu
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};
