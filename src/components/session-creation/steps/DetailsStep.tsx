import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, ChevronLeft, Users, Ruler, ImagePlus, X, UserCheck, Timer, Gauge, Mountain, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionFormData, SelectedLocation, ACTIVITY_TYPES, INTENSITY_LEVELS, TERRAIN_TYPES, RECOVERY_TYPES } from '../types';
import { ClubSelector } from '@/components/ClubSelector';
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
  // Auto-generate title suggestion
  useEffect(() => {
    if (!formData.title && formData.activity_type && selectedLocation) {
      const activity = ACTIVITY_TYPES.find(a => a.value === formData.activity_type);
      const locationShort = selectedLocation.name.split(',')[0];
      const suggestion = `${activity?.label.replace(/^[^\s]+\s/, '') || 'Séance'} à ${locationShort}`;
      onFormDataChange({ title: suggestion });
    }
  }, [formData.activity_type, selectedLocation]);

  const isRunningActivity = ['course', 'trail', 'marche'].includes(formData.activity_type);
  const isCyclingActivity = ['velo', 'vtt', 'gravel'].includes(formData.activity_type);
  const showPaceFields = isRunningActivity || isCyclingActivity || formData.activity_type === 'natation';
  const isIntervalSession = ['fractionne', 'cotes', 'fartlek'].includes(formData.session_type);
  const isStructuredSession = ['fractionne', 'seuil', 'cotes', 'fartlek', 'sortie_longue'].includes(formData.session_type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Détails</h2>
        <p className="text-muted-foreground mt-1">Personnalisez votre séance</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">Titre de la séance *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
            placeholder="ex: Footing matinal au parc"
            className="h-12"
            required
          />
        </div>

        {/* Intensity Level */}
        {showPaceFields && (
          <div>
            <Label className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Intensité
            </Label>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {INTENSITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => onFormDataChange({ intensity: level.value })}
                  className={cn(
                    "py-2 px-1 rounded-lg text-[10px] font-medium transition-all text-center",
                    formData.intensity === level.value
                      ? `${level.color} text-white`
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {level.label.split(' - ')[1]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Terrain Type */}
        {(isRunningActivity || isCyclingActivity) && (
          <div>
            <Label className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-green-600" />
              Type de terrain
            </Label>
            <Select value={formData.terrain_type} onValueChange={(v) => onFormDataChange({ terrain_type: v })}>
              <SelectTrigger className="h-10 mt-2">
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

        {/* Distance & Elevation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="distance_km">
              <Ruler className="w-4 h-4 inline mr-1" />
              Distance (km)
            </Label>
            <Input
              id="distance_km"
              type="number"
              step="0.1"
              value={formData.distance_km}
              onChange={(e) => onFormDataChange({ distance_km: e.target.value })}
              placeholder="ex: 10"
              className="h-10"
            />
          </div>
          {(isRunningActivity || isCyclingActivity) && (
            <div>
              <Label htmlFor="elevation_gain">
                <Mountain className="w-4 h-4 inline mr-1" />
                D+ (m)
              </Label>
              <Input
                id="elevation_gain"
                type="number"
                value={formData.elevation_gain}
                onChange={(e) => onFormDataChange({ elevation_gain: e.target.value })}
                placeholder="ex: 150"
                className="h-10"
              />
            </div>
          )}
        </div>

        {/* General Pace for footing/sortie longue */}
        {showPaceFields && !isIntervalSession && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-blue-500" />
              Allure générale
            </Label>
            <Input
              value={formData.pace_general}
              onChange={(e) => onFormDataChange({ pace_general: e.target.value })}
              placeholder={isRunningActivity ? "ex: 5:30 min/km" : isCyclingActivity ? "ex: 25 km/h" : "Allure"}
              className="h-10"
            />
          </div>
        )}

        {/* Warmup Section - for structured sessions */}
        {isStructuredSession && showPaceFields && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-green-500" />
              Échauffement
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Durée (min)</Label>
                <Input
                  type="number"
                  value={formData.warmup_duration}
                  onChange={(e) => onFormDataChange({ warmup_duration: e.target.value })}
                  placeholder="15"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={formData.warmup_pace}
                  onChange={(e) => onFormDataChange({ warmup_pace: e.target.value })}
                  placeholder="6:00 min/km"
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Interval fields */}
        {isIntervalSession && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              Paramètres fractionné
            </Label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nb fractions</Label>
                <Input
                  type="number"
                  value={formData.interval_count}
                  onChange={(e) => onFormDataChange({ interval_count: e.target.value })}
                  placeholder="10"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Distance (m)</Label>
                <Input
                  type="number"
                  value={formData.interval_distance}
                  onChange={(e) => onFormDataChange({ interval_distance: e.target.value })}
                  placeholder="400"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={formData.interval_pace}
                  onChange={(e) => onFormDataChange({ interval_pace: e.target.value })}
                  placeholder="4:00"
                  className="h-10"
                />
              </div>
            </div>

            {/* Recovery between intervals */}
            <div className="pt-3 border-t border-orange-500/20">
              <Label className="text-xs text-muted-foreground mb-2 block">Récupération entre fractions</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Durée (sec)</Label>
                  <Input
                    type="number"
                    value={formData.recovery_duration}
                    onChange={(e) => onFormDataChange({ recovery_duration: e.target.value })}
                    placeholder="90"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={formData.recovery_type} onValueChange={(v) => onFormDataChange({ recovery_type: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECOVERY_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cooldown Section - for structured sessions */}
        {isStructuredSession && showPaceFields && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-purple-500" />
              Retour au calme
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Durée (min)</Label>
                <Input
                  type="number"
                  value={formData.cooldown_duration}
                  onChange={(e) => onFormDataChange({ cooldown_duration: e.target.value })}
                  placeholder="10"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Allure</Label>
                <Input
                  value={formData.cooldown_pace}
                  onChange={(e) => onFormDataChange({ cooldown_pace: e.target.value })}
                  placeholder="6:30 min/km"
                  className="h-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Max participants */}
        <div>
          <Label htmlFor="max_participants">
            <Users className="w-4 h-4 inline mr-1" />
            Nombre max de participants
          </Label>
          <Input
            id="max_participants"
            type="number"
            value={formData.max_participants}
            onChange={(e) => onFormDataChange({ max_participants: e.target.value })}
            placeholder="Illimité"
            min="1"
            className="h-10"
          />
        </div>

        {/* Visibility toggles */}
        <div className="space-y-3">
          {/* Friends only */}
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Amis uniquement</span>
              </div>
              <Switch
                checked={formData.friends_only}
                onCheckedChange={(checked) => {
                  if (!checked && !isPremium) return;
                  onFormDataChange({ friends_only: checked });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.friends_only ? "Visible par vos amis uniquement" : isPremium ? "Visible par tous" : "Premium requis"}
            </p>
          </div>

          {/* Club */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Club (optionnel)</span>
            </div>
            <ClubSelector
              selectedClubId={formData.club_id}
              onClubSelect={(clubId) => onFormDataChange({ club_id: clubId })}
            />
          </div>
        </div>

        {/* Image */}
        <div>
          <Label>Image (optionnel)</Label>
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
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Notes additionnelles (optionnel)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            placeholder="Niveau requis, matériel recommandé, points de ravitaillement..."
            rows={3}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-auto pt-4">
        <Button variant="outline" onClick={onBack} className="h-14">
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
