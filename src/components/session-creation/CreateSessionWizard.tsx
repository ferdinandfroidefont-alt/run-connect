import React, { useState, useEffect, useRef } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveSubscriptionInfo } from '@/hooks/useEffectiveSubscription';
import { useAppPreview } from '@/contexts/AppPreviewContext';
import { useAdMob } from '@/hooks/useAdMob';
import { supabase } from '@/integrations/supabase/client';
import { useSendNotification } from '@/hooks/useSendNotification';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { calculateSessionLevel } from '@/lib/sessionLevelCalculator';
import { reverseGeocodeMapbox } from '@/lib/mapboxGeocode';
import { resolveSessionTitle } from '@/lib/sessionTitleDefaults';
import { DEFAULT_SESSION_CALENDAR_DURATION_MIN, estimateSessionDurationMinutes } from '@/lib/estimateSessionDurationMinutes';
import { normalizeBlocksForStorage, resolveSessionTotals } from '@/lib/sessionBlockCalculations';

import { useSessionWizard, CoachingSessionPrefill } from './useSessionWizard';
// ProgressIndicator (legacy) remplacé par les dots in-header dans AppleStepHeader.
import { LocationStep } from './steps/LocationStep';
import { ActivityStep } from './steps/ActivityStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { DetailsStep } from './steps/DetailsStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { BoostSessionDialog } from '@/components/sessions/BoostSessionDialog';
import {
  FREE_VISIBILITY_RADIUS_KM,
  PREMIUM_VISIBILITY_RADIUS_KM,
  isPostgrestMissingSessionsVisibilitySnapshot,
  stripSessionsVisibilitySnapshot,
} from '@/lib/sessionVisibility';

declare global {
  interface Window {
    /** Ancienne surcouche route (écran session) — optionnel. */
    __runconnectClearSessionRouteOverlay?: (() => void) | undefined;
  }
}

interface CreateSessionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId?: string) => void;
  map: MapboxMap | null;
  presetLocation?: { lat: number; lng: number } | null;
  /** Pré-sélectionne un itinéraire enregistré (query `?presetRoute=` sur l’accueil). */
  presetRouteId?: string | null;
  onCreateRoute?: () => void;
  // Edit mode props
  editSession?: any;
  isEditMode?: boolean;
  // Coaching mode — pre-fill from coaching session
  coachingSession?: CoachingSessionPrefill | null;
  onCoachingScheduled?: () => void;
}

export const CreateSessionWizard: React.FC<CreateSessionWizardProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
  map,
  presetLocation,
  presetRouteId = null,
  onCreateRoute,
  editSession,
  isEditMode = false,
  coachingSession,
  onCoachingScheduled,
}) => {
  const { user } = useAuth();
  const { isPreviewMode } = useAppPreview();
  const subscriptionInfo = useEffectiveSubscriptionInfo();
  const { showAdAfterSessionCreation, showRewardedBoostAd } = useAdMob(subscriptionInfo?.subscribed || false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [boostingSessionId, setBoostingSessionId] = useState<string | null>(null);

  const wizard = useSessionWizard({
    presetLocation,
    initialSession: editSession,
    isEditMode,
    coachingSession,
  });
  const lastAppliedPresetRouteRef = useRef<string | null>(null);

  // Handle preset location
  useEffect(() => {
    if (presetLocation && isOpen) {
      handleReverseGeocode(presetLocation.lat, presetLocation.lng);
    }
  }, [presetLocation, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      lastAppliedPresetRouteRef.current = null;
      return;
    }
    if (!presetRouteId || lastAppliedPresetRouteRef.current === presetRouteId) return;
    lastAppliedPresetRouteRef.current = presetRouteId;
    wizard.applyExistingRoutePreset(presetRouteId);
  }, [isOpen, presetRouteId, wizard.applyExistingRoutePreset]);

  // Reset wizard when closing
  useEffect(() => {
    if (!isOpen) {
      wizard.resetWizard();
    }
  }, [isOpen, wizard.resetWizard]);

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const name = await reverseGeocodeMapbox(lat, lng);
      if (name) {
        wizard.updateLocation({ lat, lng, name });
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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "La création ou modification de séance est désactivée.",
        variant: "destructive",
      });
      return;
    }

    const { formData, selectedLocation, selectedImage, selectedRoute, routeMode } = wizard;
    const isPremiumUser = !!subscriptionInfo?.subscribed;
    const isPublicSession = formData.visibility_type === 'public';
    const visibilityTier = isPublicSession ? (isPremiumUser ? 'premium' : 'free') : 'free';
    const visibilityRadiusKm =
      !isPublicSession ? FREE_VISIBILITY_RADIUS_KM :
      isPremiumUser ? PREMIUM_VISIBILITY_RADIUS_KM :
      FREE_VISIBILITY_RADIUS_KM;
    const discoveryScore = isPublicSession ? (isPremiumUser ? 300 : 0) : 0;

    setLoading(true);
    try {
      let imageUrl = formData.image_url || null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const resolvedTitle = resolveSessionTitle({
        title: formData.title,
        activity_type: formData.activity_type,
        locationName: formData.location_name || selectedLocation.name,
      });

      // Calculate session level automatically (only for endurance sports)
      const normalizedBlocks = normalizeBlocksForStorage(formData.blocks);
      const resolvedTotals = resolveSessionTotals(normalizedBlocks);
      const calculatedLevel = calculateSessionLevel({ ...formData, title: resolvedTitle, blocks: normalizedBlocks, distance_km: resolvedTotals.distanceKm?.toString() ?? formData.distance_km });

      const sessionPayloadCore = {
        title: resolvedTitle,
        description: formData.description,
        activity_type: formData.activity_type,
        session_type: formData.session_type,
        location_lat: selectedLocation.lat,
        location_lng: selectedLocation.lng,
        location_name: formData.location_name,
        scheduled_at: formData.scheduled_at,
        max_participants: parseInt(formData.max_participants) || null,
        distance_km: resolvedTotals.distanceKm ?? (formData.distance_km ? parseFloat(formData.distance_km) : null),
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
        session_blocks: normalizedBlocks.length > 0 
          ? JSON.parse(JSON.stringify(normalizedBlocks)) 
          : null,
        visibility_type: formData.visibility_type || 'friends',
        hidden_from_users: formData.hidden_from_users || [],
        intensity: formData.intensity || null,
        coaching_session_id: coachingSession?.id || null,
      };

      const visibilitySnapshot = {
        visibility_tier: visibilityTier,
        visibility_radius_km: Number.isFinite(visibilityRadiusKm) ? visibilityRadiusKm : 999999,
        discovery_score: discoveryScore,
      };

      const sessionPayload = { ...sessionPayloadCore, ...visibilitySnapshot };

      let sessionData;

      if (isEditMode && editSession) {
        // UPDATE existing session
        let { data, error } = await supabase
          .from('sessions')
          .update(sessionPayload)
          .eq('id', editSession.id)
          .select()
          .single();

        if (error && isPostgrestMissingSessionsVisibilitySnapshot(error)) {
          if (isPublicSession && isPremiumUser) {
            toast({
              title: "Base de données à jour requise",
              description:
                "Appliquez la migration Supabase « sessions_visibility_tiers » (fichier 20260405132000_sessions_visibility_tiers.sql) pour les séances publiques premium.",
              variant: "destructive",
            });
            throw error;
          }
          ({ data, error } = await supabase
            .from('sessions')
            .update(sessionPayloadCore)
            .eq('id', editSession.id)
            .select()
            .single());
        }

        if (error) throw error;
        sessionData = data;

        toast({ title: "Séance modifiée avec succès ! ✅" });
      } else {
        // INSERT new session(s) - handle recurrence
        const isRecurring = formData.recurrence_type === 'weekly' && formData.recurrence_count > 1;
        const sessionsToCreate = [];
        
        // Base session
        const baseDate = new Date(formData.scheduled_at);
        
        if (isRecurring) {
          // Create multiple sessions for each week
          for (let i = 0; i < formData.recurrence_count; i++) {
            const sessionDate = new Date(baseDate);
            sessionDate.setDate(sessionDate.getDate() + (i * 7)); // Add weeks
            
            sessionsToCreate.push({
              ...sessionPayload,
              scheduled_at: sessionDate.toISOString(),
              title: i === 0 ? resolvedTitle : `${resolvedTitle} (${i + 1}/${formData.recurrence_count})`,
              organizer_id: user.id,
              current_participants: 0,
            });
          }
        } else {
          // Single session
          sessionsToCreate.push({
            ...sessionPayload,
            organizer_id: user.id,
            current_participants: 0,
          });
        }

        let { data, error } = await supabase
          .from('sessions')
          .insert(sessionsToCreate)
          .select();

        if (error && isPostgrestMissingSessionsVisibilitySnapshot(error)) {
          if (isPublicSession && isPremiumUser) {
            toast({
              title: "Base de données à jour requise",
              description:
                "Appliquez la migration Supabase « sessions_visibility_tiers » (fichier 20260405132000_sessions_visibility_tiers.sql) pour les séances publiques premium.",
              variant: "destructive",
            });
            throw error;
          }
          const legacyRows = sessionsToCreate.map((row) => stripSessionsVisibilitySnapshot(row));
          ({ data, error } = await supabase.from('sessions').insert(legacyRows).select());
        }

        if (error) throw error;
        sessionData = data?.[0]; // Use first session for callbacks

        if (isRecurring) {
          toast({ 
            title: `${formData.recurrence_count} séances créées ! 🎉`,
            description: `Récurrence hebdomadaire configurée`
          });
        } else {
          toast({ title: "Séance créée avec succès ! 🎉" });
        }
        showAdAfterSessionCreation();
        if (sessionData?.id && !isPremiumUser) {
          setBoostingSessionId(sessionData.id);
          setBoostDialogOpen(true);
        }
      }

      if (!sessionData) throw new Error("Session data not returned");

      // If this is a coaching session, create/update coaching_participation
      if (coachingSession && !isEditMode) {
        try {
          const { data: existingParticipation } = await supabase
            .from("coaching_participations")
            .select("id")
            .eq("coaching_session_id", coachingSession.id)
            .eq("user_id", user.id)
            .maybeSingle();

          const participationData = {
            scheduled_at: new Date(formData.scheduled_at).toISOString(),
            location_name: formData.location_name,
            map_session_id: sessionData.id,
            status: "scheduled",
          };

          if (existingParticipation) {
            await supabase
              .from("coaching_participations")
              .update(participationData)
              .eq("id", existingParticipation.id);
          } else {
            await supabase.from("coaching_participations").insert({
              coaching_session_id: coachingSession.id,
              user_id: user.id,
              ...participationData,
            });
          }

          // Notify coach
          const { data: athleteProfile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", user.id)
            .single();
          const athleteName = athleteProfile?.display_name || athleteProfile?.username || "Un athlète";

          sendPushNotification(
            coachingSession.coach_id,
            `📍 ${athleteName} a programmé sa séance`,
            coachingSession.title,
            "coaching_scheduled"
          );

          onCoachingScheduled?.();
          toast({ title: "Séance programmée ! 📋", description: "Elle apparaît maintenant sur la carte" });
        } catch (coachErr) {
          console.error('Coaching participation error:', coachErr);
        }
      }

      // Send notifications to friends (only for new non-coaching sessions)
      if (!isEditMode && !coachingSession && formData.friends_only && sessionData) {
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
                `${user.email?.split('@')[0] || 'Un ami'} a créé une séance: ${resolvedTitle}`,
                'friend_session',
                {
                  organizer_name: user.email?.split('@')[0] || 'Un ami',
                  session_title: resolvedTitle,
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
          map.easeTo({
            center: [selectedLocation.lng, selectedLocation.lat],
            zoom: 15,
            duration: 650,
            essential: true,
          });
        }, 200);
      }

      onClose();
      wizard.resetWizard();

      window.__runconnectClearSessionRouteOverlay?.();
      window.__runconnectClearSessionRouteOverlay = undefined;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBoostWatchVideo = async () => {
    if (!boostingSessionId) return;
    const adResult = await showRewardedBoostAd();
    if (adResult !== 'completed') {
      toast({ title: "Boost annulé", description: "Aucune vidéo validée", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('activate-session-boost', {
        body: {
          session_id: boostingSessionId,
          reward_satisfied: true,
        },
      });
      if (error) throw error;
      toast({ title: "Boost activé", description: "Ta séance est mise en avant pendant 1h" });
      setBoostDialogOpen(false);
      onSessionCreated(boostingSessionId);
      setBoostingSessionId(null);
    } catch (error: any) {
      toast({ title: "Boost impossible", description: error?.message || "Réessayez plus tard", variant: "destructive" });
    }
  };

  const renderStep = () => {
    const resolvedTotals = resolveSessionTotals(normalizeBlocksForStorage(wizard.formData.blocks));
    const estimatedDurationMin = estimateSessionDurationMinutes({
      session_blocks: wizard.formData.blocks,
      distance_km: resolvedTotals.distanceKm ?? (wizard.formData.distance_km ? Number.parseFloat(wizard.formData.distance_km) : null),
      interval_distance: wizard.formData.interval_distance ? Number.parseFloat(wizard.formData.interval_distance) : null,
      interval_count: wizard.formData.interval_count ? Number.parseInt(wizard.formData.interval_count, 10) : null,
      interval_pace: wizard.formData.interval_pace || null,
      pace_general: wizard.formData.pace_general || null,
    });
    const usedFallbackDuration = estimatedDurationMin == null;
    const safeDurationMin = estimatedDurationMin ?? DEFAULT_SESSION_CALENDAR_DURATION_MIN;
    const estimatedEndTimeLabel = wizard.formData.scheduled_at
      ? new Date(new Date(wizard.formData.scheduled_at).getTime() + safeDurationMin * 60_000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

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
            estimatedEndTimeLabel={estimatedEndTimeLabel}
            isEstimatedEndTimeProvisional={usedFallbackDuration}
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
            isCoachingMode={!!coachingSession}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex h-full max-h-full w-full max-w-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-secondary p-0 sm:max-h-[90vh] sm:max-w-md sm:rounded-lg sm:border">
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            headerWrapperClassName="z-40 shrink-0 border-b border-border bg-card"
            header={
              // Refonte handoff (mockup `StepHeader` 08–12) :
              // NavBar slim — chevron-back (étape > 1) ou Fermer (étape 1) à gauche, titre centré,
              // « Étape n/N » muted à droite. Les dots de progression sont déplacés dans
              // AppleStepHeader (au-dessus du grand titre de chaque étape).
              <IosPageHeaderBar
                className="py-3"
                left={
                  wizard.wizardSteps.indexOf(wizard.currentStep) > 0 ? (
                    <button
                      type="button"
                      onClick={() => wizard.goToPreviousStep()}
                      aria-label="Étape précédente"
                      className="flex min-w-0 items-center gap-0.5 text-primary active:opacity-60"
                    >
                      <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                      <span className="truncate text-[17px]">Retour</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Fermer"
                      className="flex min-w-0 items-center gap-1 text-primary active:opacity-60"
                    >
                      <X className="h-5 w-5 shrink-0" />
                      <span className="truncate text-[17px]">Fermer</span>
                    </button>
                  )
                }
                title={
                  isEditMode ? 'Modifier la séance' : coachingSession ? 'Programmer ma séance' : 'Créer une séance'
                }
                right={
                  wizard.wizardSteps.length > 1 ? (
                    <span className="truncate text-[15px] text-muted-foreground">
                      Étape {Math.max(1, wizard.wizardSteps.indexOf(wizard.currentStep) + 1)}/{wizard.wizardSteps.length}
                    </span>
                  ) : undefined
                }
              />
            }
            scrollClassName="bg-secondary"
          >
            {/* h-full : permet au step « Lieu » de remplir la zone scroll et de centrer le bloc entre header et pied */}
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden px-4 pb-4">
              <AnimatePresence mode="wait">
                <div key={wizard.currentStep} className="flex min-h-0 flex-1 flex-col">
                  {renderStep()}
                </div>
              </AnimatePresence>
            </div>
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>
      <BoostSessionDialog
        open={boostDialogOpen}
        onClose={() => {
          setBoostDialogOpen(false);
          setBoostingSessionId(null);
        }}
        onWatchVideo={() => void handleBoostWatchVideo()}
        loading={loading}
      />
    </>
  );
};

// Export as default for backward compatibility
export default CreateSessionWizard;
