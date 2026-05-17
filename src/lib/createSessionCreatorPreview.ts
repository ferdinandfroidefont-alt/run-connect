import { hasCreatorSupportAccess } from '@/lib/creatorSupportAccess';
import { datetimeLocalTomorrowMorning } from '@/lib/coachingSessionPrefill';
import type { SessionFormData, SelectedLocation } from '@/components/session-creation/types';

export type CreateSessionCreatorPreviewStep = 'essentials' | 'finalize';

export type CreateSessionCreatorPreviewRequest = {
  step: CreateSessionCreatorPreviewStep;
  /** Bloque la publication (aperçu UI uniquement). */
  readOnly: boolean;
};

export function canUseCreateSessionCreatorPreview(
  email: string | null | undefined,
  username: string | null | undefined
): boolean {
  return hasCreatorSupportAccess(email, username);
}

/** Données fictives pour prévisualiser l’étape 2 sans saisie manuelle. */
export function buildCreatorPreviewSessionSeed(): {
  location: SelectedLocation;
  formPatch: Partial<SessionFormData>;
} {
  return {
    location: {
      lat: 48.8566,
      lng: 2.3522,
      name: 'Paris, France',
    },
    formPatch: {
      activity_type: 'course',
      session_type: 'footing',
      scheduled_at: datetimeLocalTomorrowMorning(9),
      location_name: 'Paris, France',
      title: '',
      description: 'Aperçu support créateur — séance fictive.',
      visibility_type: 'friends',
      friends_only: true,
    },
  };
}
