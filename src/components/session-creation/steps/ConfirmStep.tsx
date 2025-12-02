import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, MapPin, Calendar, Users, Ruler, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionFormData, SelectedLocation, ACTIVITY_TYPES } from '../types';
import { cn } from '@/lib/utils';

interface ConfirmStepProps {
  formData: SessionFormData;
  selectedLocation: SelectedLocation | null;
  imagePreview: string | null;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  formData,
  selectedLocation,
  imagePreview,
  loading,
  onSubmit,
  onBack,
}) => {
  const activity = ACTIVITY_TYPES.find(a => a.value === formData.activity_type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <span className="text-4xl">{activity?.icon || '🏃'}</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">Prêt à créer ?</h2>
        <p className="text-muted-foreground mt-2">Vérifiez les détails de votre séance</p>
      </div>

      {/* Session preview card */}
      <motion.div
        className="flex-1 overflow-y-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden">
          {/* Image */}
          {imagePreview && (
            <div className="relative h-40">
              <img src={imagePreview} alt="Session" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Title & Activity */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{activity?.icon}</span>
                <span className="text-sm text-muted-foreground">
                  {activity?.label.replace(/^[^\s]+\s/, '')}
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground">{formData.title}</h3>
            </div>

            {/* Location */}
            {selectedLocation && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="text-sm text-foreground truncate">{selectedLocation.name}</p>
                </div>
              </div>
            )}

            {/* Date/Time */}
            {formData.scheduled_at && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
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
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{formData.max_participants} max</span>
                </div>
              )}
              {formData.distance_km && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span>{formData.distance_km} km</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span>{formData.friends_only ? 'Amis' : 'Public'}</span>
              </div>
            </div>

            {/* Description */}
            {formData.description && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-sm text-muted-foreground">{formData.description}</p>
              </div>
            )}
          </div>
        </div>
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
              Créer la séance
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
