import { useState, useCallback } from 'react';
import { SessionFormData, SelectedLocation, WizardStep, WIZARD_STEPS, DEFAULT_FORM_DATA } from './types';

interface UseSessionWizardProps {
  presetLocation?: { lat: number; lng: number } | null;
}

export const useSessionWizard = ({ presetLocation }: UseSessionWizardProps = {}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('location');
  const [formData, setFormData] = useState<SessionFormData>(DEFAULT_FORM_DATA);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routeMode, setRouteMode] = useState<'new' | 'existing'>('new');

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

  const resetWizard = useCallback(() => {
    setCurrentStep('location');
    setFormData(DEFAULT_FORM_DATA);
    setSelectedLocation(null);
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedRoute('');
    setRouteMode('new');
  }, []);

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
    resetWizard,
    canProceed,
  };
};
