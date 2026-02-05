import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, MapPin, Calendar, Users, Ruler, EyeOff, Building2, Globe, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SessionFormData, SelectedLocation, ACTIVITY_TYPES, VisibilityType, RecurrenceType } from '../types';
import { VisibilitySelector } from '../VisibilitySelector';
import { RecurrenceSelector } from '../RecurrenceSelector';
import { cn } from '@/lib/utils';

interface ConfirmStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  loading: boolean;
  isPremium: boolean;
  onFormDataChange: (updates: Partial<SessionFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const getVisibilityLabel = (type: VisibilityType, hiddenCount: number) => {
  switch (type) {
    case 'friends':
      return hiddenCount > 0 ? `Amis (${hiddenCount} masqué${hiddenCount > 1 ? 's' : ''})` : 'Amis';
    case 'club':
      return 'Club';
    case 'public':
      return 'Public';
    default:
      return 'Amis';
  }
};

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
}) => {
  const navigate = useNavigate();
  const activity = ACTIVITY_TYPES.find(a => a.value === formData.activity_type);

  const handleVisibilityChange = (type: VisibilityType) => {
    // If user selects public and is not premium, redirect to subscription page
    if (type === 'public' && !isPremium) {
      navigate('/subscription');
      return;
    }
    onFormDataChange({ visibility_type: type });
    // Sync friends_only for backwards compatibility
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <motion.div
          className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <span className="text-3xl">{activity?.icon || '🏃'}</span>
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">Prêt à créer ?</h2>
        <p className="text-sm text-muted-foreground mt-1">Vérifiez les détails et la visibilité</p>
      </div>

      {/* Content */}
      <motion.div
        className="flex-1 overflow-y-auto space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Session preview card */}
        <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden">
          {/* Image */}
          {imagePreview && (
            <div className="relative h-32">
              <img src={imagePreview} alt="Session" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title & Activity */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{activity?.icon}</span>
                <span className="text-xs text-muted-foreground">
                  {activity?.label.replace(/^[^\s]+\s/, '')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{formData.title}</h3>
            </div>

            {/* Location */}
            {selectedLocation && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="text-sm text-foreground truncate">{selectedLocation.name}</p>
                </div>
              </div>
            )}

            {/* Date/Time */}
            {formData.scheduled_at && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Date & Heure</p>
                  <p className="text-sm text-foreground">
                    {new Date(formData.scheduled_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })} à {new Date(formData.scheduled_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-4 pt-2 border-t border-white/10">
              {formData.max_participants && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{formData.max_participants} max</span>
                </div>
              )}
              {formData.distance_km && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{formData.distance_km} km</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visibility Selector - iOS Style */}
        <div className="bg-card rounded-2xl p-4">
          <VisibilitySelector
            visibilityType={formData.visibility_type}
            hiddenFromUsers={formData.hidden_from_users}
            isPremium={isPremium}
            onVisibilityChange={handleVisibilityChange}
            onHiddenUsersChange={handleHiddenUsersChange}
            clubId={formData.club_id}
          />
        </div>

        {/* Hidden users warning */}
        {formData.visibility_type === 'friends' && formData.hidden_from_users?.length > 0 && (
          <div className="px-2 flex items-center gap-2 text-xs text-amber-500">
            <EyeOff className="w-3.5 h-3.5" />
            <span>{formData.hidden_from_users.length} ami{formData.hidden_from_users.length > 1 ? 's' : ''} ne verra pas cette séance</span>
          </div>
        )}

        {/* Recurrence Selector - iOS Style */}
        <div className="bg-card rounded-2xl p-4">
          <RecurrenceSelector
            recurrenceType={formData.recurrence_type}
            recurrenceCount={formData.recurrence_count}
            onRecurrenceTypeChange={handleRecurrenceTypeChange}
            onRecurrenceCountChange={handleRecurrenceCountChange}
          />
        </div>

        {/* Recurrence info */}
        {formData.recurrence_type === 'weekly' && (
          <div className="px-2 flex items-center gap-2 text-xs text-primary">
            <Repeat className="w-3.5 h-3.5" />
            <span>{formData.recurrence_count} séances seront créées automatiquement</span>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 mt-auto pt-4">
        <Button variant="outline" onClick={onBack} className="h-14" disabled={loading}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {formData.recurrence_type === 'weekly' 
                ? `Créer ${formData.recurrence_count} séances`
                : 'Créer la séance'
              }
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
