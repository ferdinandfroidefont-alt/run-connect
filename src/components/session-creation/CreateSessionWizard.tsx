import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdMob } from '@/hooks/useAdMob';
import { supabase } from '@/integrations/supabase/client';
import { useSendNotification } from '@/hooks/useSendNotification';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { calculateSessionLevel } from '@/lib/sessionLevelCalculator';

import { useSessionWizard } from './useSessionWizard';
import { ProgressIndicator } from './ProgressIndicator';
import { LocationStep } from './steps/LocationStep';
import { ActivityStep } from './steps/ActivityStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { DetailsStep } from './steps/DetailsStep';
import { ConfirmStep } from './steps/ConfirmStep';

declare global {
  interface Window {
    currentRoutePolyline: google.maps.Polyline | null;
  }
}

interface CreateSessionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId?: string) => void;
  map: google.maps.Map | null;
  presetLocation?: { lat: number; lng: number } | null;
  onCreateRoute?: () => void;
  // Edit mode props
  editSession?: any;
  isEditMode?: boolean;
}

export const CreateSessionWizard: React.FC<CreateSessionWizardProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
  map,
  presetLocation,
  onCreateRoute,
  editSession,
  isEditMode = false,
}) => {
  const { user, subscriptionInfo } = useAuth();
  const { showAdAfterSessionCreation } = useAdMob(subscriptionInfo?.subscribed || false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const wizard = useSessionWizard({ presetLocation, initialSession: editSession, isEditMode });

  // Handle preset location
  useEffect(() => {
    if (presetLocation && isOpen) {
      handleReverseGeocode(presetLocation.lat, presetLocation.lng);
    }
  }, [presetLocation, isOpen]);

  // Reset wizard when closing
  useEffect(() => {
    if (!isOpen) {
      wizard.resetWizard();
    }
  }, [isOpen]);

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: { lat, lng, type: 'reverse' }
      });

      if (error) throw error;

      if (data?.status === 'OK' && data?.results?.[0]) {
        wizard.updateLocation({
          lat,
          lng,
          name: data.results[0].formatted_address
        });
      }
    } catch (error) {
      console.error('Geocode error:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Erreur", description: "Image max 5MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Erreur", description: "Fichier invalide", variant: "destructive" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        wizard.setImage(file, e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    wizard.setImage(null, null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('session-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('session-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erreur", description: "Upload échoué", variant: "destructive" });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !wizard.selectedLocation) return;

    const { formData, selectedLocation, selectedImage, selectedRoute, routeMode } = wizard;

    // Check premium for public sessions
    if (formData.visibility_type === 'public' && !subscriptionInfo?.subscribed) {
      toast({
        title: "Abonnement requis",
        description: "Les séances publiques nécessitent un abonnement premium",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let imageUrl = formData.image_url || null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      // Calculate session level automatically (only for endurance sports)
      const calculatedLevel = calculateSessionLevel(formData);

      const sessionPayload = {
        title: formData.title,
        description: formData.description,
        activity_type: formData.activity_type,
        session_type: formData.session_type,
        location_lat: selectedLocation.lat,
        location_lng: selectedLocation.lng,
        location_name: formData.location_name,
        scheduled_at: formData.scheduled_at,
        max_participants: parseInt(formData.max_participants) || null,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
        pace_general: formData.pace_general || null,
        pace_unit: formData.pace_unit || 'speed',
        interval_distance: formData.interval_distance ? parseFloat(formData.interval_distance) : null,
        interval_pace: formData.interval_pace || null,
        interval_pace_unit: formData.pace_unit || 'speed',
        interval_count: formData.interval_count ? parseInt(formData.interval_count) : null,
        friends_only: formData.visibility_type === 'friends',
        image_url: imageUrl,
        route_id: formData.route_id || (routeMode === 'existing' && selectedRoute ? selectedRoute : null),
        club_id: formData.club_id,
        calculated_level: calculatedLevel,
        session_mode: formData.session_mode || 'simple',
        session_blocks: formData.blocks && formData.blocks.length > 0 
          ? JSON.parse(JSON.stringify(formData.blocks)) 
          : null,
        visibility_type: formData.visibility_type || 'friends',
        hidden_from_users: formData.hidden_from_users || [],
        intensity: formData.intensity || null,
      };

      let sessionData;

      if (isEditMode && editSession) {
        // UPDATE existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionPayload)
          .eq('id', editSession.id)
          .select()
          .single();

        if (error) throw error;
        sessionData = data;

        toast({ title: "Séance modifiée avec succès ! ✅" });
      } else {
        // INSERT new session
        const { data, error } = await supabase
          .from('sessions')
          .insert([{
            ...sessionPayload,
            organizer_id: user.id,
            current_participants: 0,
          }])
          .select()
          .single();

        if (error) throw error;
        sessionData = data;

        toast({ title: "Séance créée avec succès ! 🎉" });
        showAdAfterSessionCreation();
      }

      if (!sessionData) throw new Error("Session data not returned");

      // Send notifications to friends (only for new sessions)
      if (!isEditMode && formData.friends_only && sessionData) {
        try {
          const { data: followers } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', user.id)
            .eq('status', 'accepted');

          if (followers?.length) {
            for (const follower of followers) {
              await sendPushNotification(
                follower.follower_id,
                'Nouvelle séance d\'ami',
                `${user.email?.split('@')[0] || 'Un ami'} a créé une séance: ${formData.title}`,
                'friend_session',
                {
                  organizer_name: user.email?.split('@')[0] || 'Un ami',
                  session_title: formData.title,
                  session_id: sessionData.id,
                  activity_type: formData.activity_type,
                  scheduled_at: formData.scheduled_at
                }
              );
            }
          }
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      }

      // Call session created callback immediately with session ID
      console.log('🎯 Calling onSessionCreated with sessionId:', sessionData.id);
      onSessionCreated(sessionData.id);

      // Force multiple refreshes for Android WebView reliability
      // WebSockets can be unreliable on mobile WebViews
      const forceRefreshDelays = [100, 500, 1500, 3000];
      forceRefreshDelays.forEach((delay) => {
        setTimeout(() => {
          console.log(`🔄 Force refresh at ${delay}ms for Android compatibility`);
          onSessionCreated(sessionData.id);
        }, delay);
      });

      // Center map on new session location
      if (map && selectedLocation) {
        setTimeout(() => {
          map.setCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
          map.setZoom(15);
        }, 200);
      }

      onClose();
      wizard.resetWizard();

      // Clean up route polyline
      if (window.currentRoutePolyline) {
        window.currentRoutePolyline.setMap(null);
        window.currentRoutePolyline = null;
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'location':
        return (
          <LocationStep
            map={map}
            selectedLocation={wizard.selectedLocation}
            onLocationSelect={wizard.updateLocation}
            onNext={wizard.goToNextStep}
          />
        );
      case 'activity':
        return (
          <ActivityStep
            activityType={wizard.formData.activity_type}
            sessionType={wizard.formData.session_type}
            onActivityChange={(activity) => wizard.updateFormData({ activity_type: activity })}
            onSessionTypeChange={(type) => wizard.updateFormData({ session_type: type })}
            onNext={wizard.goToNextStep}
            onBack={wizard.goToPreviousStep}
          />
        );
      case 'datetime':
        return (
          <DateTimeStep
            scheduledAt={wizard.formData.scheduled_at}
            onScheduledAtChange={(value) => wizard.updateFormData({ scheduled_at: value })}
            onNext={wizard.goToNextStep}
            onBack={wizard.goToPreviousStep}
          />
        );
      case 'details':
        return (
          <DetailsStep
            formData={wizard.formData}
            selectedLocation={wizard.selectedLocation}
            imagePreview={wizard.imagePreview}
            isPremium={subscriptionInfo?.subscribed || false}
            onFormDataChange={wizard.updateFormData}
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
            onNext={wizard.goToNextStep}
            onBack={wizard.goToPreviousStep}
          />
        );
      case 'confirm':
        return (
          <ConfirmStep
            formData={wizard.formData}
            selectedLocation={wizard.selectedLocation}
            imagePreview={wizard.imagePreview}
            loading={loading || uploadingImage}
            isPremium={subscriptionInfo?.subscribed || false}
            onFormDataChange={wizard.updateFormData}
            onSubmit={handleSubmit}
            onBack={wizard.goToPreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-md sm:max-h-[90vh] rounded-none sm:rounded-lg p-0 overflow-hidden flex flex-col border-0 sm:border bg-secondary">
        {/* iOS Header */}
        <div className="sticky top-0 z-40 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-primary"
            >
              <X className="h-5 w-5" />
              <span className="text-[17px]">Fermer</span>
            </button>
            <h1 className="text-[17px] font-semibold text-foreground">
              {isEditMode ? 'Modifier la séance' : 'Créer une séance'}
            </h1>
            <div className="w-16" />
          </div>
        </div>
        
        {/* Progress indicator */}
        <ProgressIndicator currentStep={wizard.currentStep} progress={wizard.progress} />

        {/* Step content */}
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export as default for backward compatibility
export default CreateSessionWizard;
