import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  datetimeLocalTomorrowMorning,
  inferSessionTypeFromCoachData,
  toDatetimeLocalInput,
} from '@/lib/coachingSessionPrefill';
import {
  SessionFormData,
  SelectedLocation,
  WizardStep,
  DEFAULT_FORM_DATA,
  SessionBlock,
  SessionMode,
  getWizardSteps,
} from './types';

export interface CoachingSessionPrefill {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  distance_km: number | null;
  pace_target: string | null;
  session_blocks?: any;
  club_id: string;
  coach_id: string;
  objective?: string | null;
  rcc_code?: string | null;
  coach_notes?: string | null;
  default_location_name?: string | null;
  default_location_lat?: number | null;
  default_location_lng?: number | null;
  scheduled_at?: string;
  suggestedDate?: string | null;
}

export type WizardFlow = 'quick' | 'full';

interface UseSessionWizardProps {
  presetLocation?: { lat: number; lng: number } | null;
  initialSession?: any;
  isEditMode?: boolean;
  coachingSession?: CoachingSessionPrefill | null;
  /** `quick` = 2 étapes (création standard). `full` = 5 étapes (édition, coaching). */
  wizardFlow?: WizardFlow;
}

const initialStepFor = (isEditMode: boolean, flow: WizardFlow): WizardStep => {
  if (isEditMode) return 'activity';
  return flow === 'quick' ? 'essentials' : 'location';
};

export const useSessionWizard = ({
  presetLocation,
  initialSession,
  isEditMode = false,
  coachingSession,
  wizardFlow = 'full',
}: UseSessionWizardProps = {}) => {
  const wizardSteps = useMemo(() => getWizardSteps(wizardFlow), [wizardFlow]);

  const [currentStep, setCurrentStep] = useState<WizardStep>(() => initialStepFor(isEditMode, wizardFlow));
  const [formData, setFormData] = useState<SessionFormData>(DEFAULT_FORM_DATA);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routeMode, setRouteMode] = useState<'new' | 'existing'>('new');

  useEffect(() => {
    if (!coachingSession) return;

    const blocks: SessionBlock[] =
      coachingSession.session_blocks && Array.isArray(coachingSession.session_blocks)
        ? (coachingSession.session_blocks as SessionBlock[])
        : [];

    const activityType = coachingSession.activity_type || 'course';
    const sessionType = inferSessionTypeFromCoachData(activityType, blocks);

    let scheduledAt = '';
    if (coachingSession.suggestedDate) {
      scheduledAt = toDatetimeLocalInput(coachingSession.suggestedDate);
    }
    if (!scheduledAt && coachingSession.scheduled_at) {
      scheduledAt = toDatetimeLocalInput(coachingSession.scheduled_at);
    }
    if (!scheduledAt) {
      scheduledAt = datetimeLocalTomorrowMorning(9);
    }

    const descParts: string[] = [];
    if (coachingSession.description?.trim()) descParts.push(coachingSession.description.trim());
    if (coachingSession.objective?.trim()) {
      descParts.push(`Objectif : ${coachingSession.objective.trim()}`);
    }
    if (coachingSession.coach_notes?.trim()) {
      descParts.push(`Note coach : ${coachingSession.coach_notes.trim()}`);
    }
    const mergedDescription = descParts.join('\n\n');

    setFormData((prev) => ({
      ...prev,
      title: `📋 ${coachingSession.objective?.trim() || coachingSession.title}`,
      description: mergedDescription,
      activity_type: activityType,
      session_type: sessionType,
      scheduled_at: scheduledAt,
      distance_km:
        coachingSession.distance_km != null ? String(coachingSession.distance_km) : '',
      pace_general: coachingSession.pace_target || '',
      club_id: coachingSession.club_id,
      session_mode: blocks.length > 0 ? 'structured' : 'simple',
      blocks,
      location_name: coachingSession.default_location_name || '',
      visibility_type: 'club',
    }));

    if (
      coachingSession.default_location_lat != null &&
      coachingSession.default_location_lng != null &&
      coachingSession.default_location_name
    ) {
      setSelectedLocation({
        lat: coachingSession.default_location_lat,
        lng: coachingSession.default_location_lng,
        name: coachingSession.default_location_name,
      });
    }
  }, [coachingSession]);

  useEffect(() => {
    if (isEditMode && initialSession) {
      const scheduledDate = new Date(initialSession.scheduled_at);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        ...DEFAULT_FORM_DATA,
        title: initialSession.title || '',
        description: initialSession.description || '',
        activity_type: initialSession.activity_type || '',
        session_type: initialSession.session_type || '',
        scheduled_at: localDateTime,
        max_participants: initialSession.max_participants?.toString() || '',
        distance_km: initialSession.distance_km?.toString() || '',
        pace_general: initialSession.pace_general || '',
        pace_unit: initialSession.pace_unit || 'speed',
        interval_distance: initialSession.interval_distance?.toString() || '',
        interval_pace: initialSession.interval_pace || '',
        interval_count: initialSession.interval_count?.toString() || '',
        location_name: initialSession.location_name || '',
        friends_only: initialSession.friends_only ?? true,
        image_url: initialSession.image_url || '',
        club_id: initialSession.club_id || null,
        intensity: initialSession.intensity || '',
        session_mode: initialSession.session_mode || 'simple',
        blocks: initialSession.session_blocks || [],
        route_id: initialSession.route_id || null,
        visibility_type: initialSession.visibility_type || 'friends',
        hidden_from_users: initialSession.hidden_from_users || [],
        recurrence_type: initialSession.recurrence_type || 'none',
        recurrence_count: initialSession.recurrence_count || 4,
        live_tracking_enabled: initialSession.live_tracking_enabled || false,
      });

      setSelectedLocation({
        lat: initialSession.location_lat,
        lng: initialSession.location_lng,
        name: initialSession.location_name,
      });

      if (initialSession.image_url) {
        setImagePreview(initialSession.image_url);
      }

      if (initialSession.route_id) {
        setSelectedRoute(initialSession.route_id);
        setRouteMode('existing');
      }
    }
  }, [isEditMode, initialSession]);

  const currentStepIndex = wizardSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= wizardSteps.length - 1;
  const progress = wizardSteps.length > 0 ? ((currentStepIndex + 1) / wizardSteps.length) * 100 : 0;

  const goToNextStep = useCallback(() => {
    const idx = wizardSteps.indexOf(currentStep);
    const nextIndex = idx + 1;
    if (nextIndex < wizardSteps.length) {
      setCurrentStep(wizardSteps[nextIndex]);
    }
  }, [currentStep, wizardSteps]);

  const goToPreviousStep = useCallback(() => {
    const idx = wizardSteps.indexOf(currentStep);
    const prevIndex = idx - 1;
    if (prevIndex >= 0) {
      setCurrentStep(wizardSteps[prevIndex]);
    }
  }, [currentStep, wizardSteps]);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const updateFormData = useCallback((updates: Partial<SessionFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateLocation = useCallback((location: SelectedLocation | null) => {
    setSelectedLocation(location);
    if (location) {
      setFormData((prev) => ({ ...prev, location_name: location.name }));
    }
  }, []);

  const setImage = useCallback((file: File | null, preview: string | null) => {
    setSelectedImage(file);
    setImagePreview(preview);
  }, []);

  const updateBlocks = useCallback((blocks: SessionBlock[]) => {
    setFormData((prev) => ({ ...prev, blocks }));
  }, []);

  const setSessionMode = useCallback((mode: SessionMode) => {
    setFormData((prev) => ({
      ...prev,
      session_mode: mode,
      blocks: mode === 'simple' ? [] : prev.blocks,
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(initialStepFor(isEditMode, wizardFlow));
    if (!isEditMode) {
      setFormData(DEFAULT_FORM_DATA);
      setSelectedLocation(null);
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedRoute('');
      setRouteMode('new');
    }
  }, [isEditMode, wizardFlow]);

  const applyExistingRoutePreset = useCallback((routeId: string) => {
    setFormData((prev) => ({ ...prev, route_id: routeId }));
    setSelectedRoute(routeId);
    setRouteMode('existing');
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'essentials':
        return !!selectedLocation && !!formData.scheduled_at && !!formData.activity_type;
      case 'finalize':
        return !!formData.activity_type && !!selectedLocation;
      case 'location':
        return selectedLocation !== null;
      case 'activity':
        return !!formData.activity_type;
      case 'datetime':
        return !!formData.scheduled_at;
      case 'details':
        return !!formData.activity_type && !!selectedLocation;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedLocation, formData]);

  return {
    currentStep,
    wizardSteps,
    wizardFlow,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    progress,
    formData,
    selectedLocation,
    selectedImage,
    imagePreview,
    selectedRoute,
    routeMode,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateFormData,
    updateLocation,
    setImage,
    setSelectedRoute,
    setRouteMode,
    updateBlocks,
    setSessionMode,
    resetWizard,
    applyExistingRoutePreset,
    canProceed,
  };
};
