import { useState, useCallback, useEffect } from 'react';
import { SessionFormData, SelectedLocation, WizardStep, WIZARD_STEPS, DEFAULT_FORM_DATA, SessionBlock, SessionMode } from './types';

interface UseSessionWizardProps {
  presetLocation?: { lat: number; lng: number } | null;
  initialSession?: any; // Session data for edit mode
  isEditMode?: boolean;
}

export const useSessionWizard = ({ presetLocation, initialSession, isEditMode = false }: UseSessionWizardProps = {}) => {
  // In edit mode, start at activity step (skip location since it's already set)
  const [currentStep, setCurrentStep] = useState<WizardStep>(isEditMode ? 'activity' : 'location');
  const [formData, setFormData] = useState<SessionFormData>(DEFAULT_FORM_DATA);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routeMode, setRouteMode] = useState<'new' | 'existing'>('new');

  // Initialize with session data in edit mode
  useEffect(() => {
    if (isEditMode && initialSession) {
      // Convert scheduled_at to datetime-local format
      const scheduledDate = new Date(initialSession.scheduled_at);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: initialSession.title || '',
        description: initialSession.description || '',
        activity_type: initialSession.activity_type || '',
        session_type: initialSession.session_type || '',
        scheduled_at: localDateTime,
        max_participants: initialSession.max_participants?.toString() || '',
        distance_km: initialSession.distance_km?.toString() || '',
        pace_general: initialSession.pace_general || '',
        pace_unit: initialSession.pace_unit || 'speed',
        interval_unit: 'distance',
        interval_distance: initialSession.interval_distance?.toString() || '',
        interval_pace: initialSession.interval_pace || '',
        interval_count: initialSession.interval_count?.toString() || '',
        location_name: initialSession.location_name || '',
        friends_only: initialSession.friends_only ?? true,
        image_url: initialSession.image_url || '',
        club_id: initialSession.club_id || null,
        warmup_duration: '',
        warmup_pace: '',
        cooldown_duration: '',
        cooldown_pace: '',
        recovery_duration: '',
        recovery_type: 'trot',
        intensity: initialSession.intensity || '',
        terrain_type: '',
        elevation_gain: '',
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

  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const updateFormData = useCallback((updates: Partial<SessionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateLocation = useCallback((location: SelectedLocation | null) => {
    setSelectedLocation(location);
    if (location) {
      setFormData(prev => ({ ...prev, location_name: location.name }));
    }
  }, []);

  const setImage = useCallback((file: File | null, preview: string | null) => {
    setSelectedImage(file);
    setImagePreview(preview);
  }, []);

  // Block management functions
  const updateBlocks = useCallback((blocks: SessionBlock[]) => {
    setFormData(prev => ({ ...prev, blocks }));
  }, []);

  const setSessionMode = useCallback((mode: SessionMode) => {
    setFormData(prev => ({ 
      ...prev, 
      session_mode: mode,
      // Clear blocks when switching to simple mode
      blocks: mode === 'simple' ? [] : prev.blocks
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(isEditMode ? 'activity' : 'location');
    if (!isEditMode) {
      setFormData(DEFAULT_FORM_DATA);
      setSelectedLocation(null);
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedRoute('');
      setRouteMode('new');
    }
  }, [isEditMode]);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'location':
        return selectedLocation !== null;
      case 'activity':
        return !!formData.activity_type;
      case 'datetime':
        return !!formData.scheduled_at;
      case 'details':
        return !!formData.title;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedLocation, formData]);

  return {
    currentStep,
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
    canProceed,
  };
};
