import { useAppResumeManager } from "@/hooks/useAppResumeManager";

/**
 * Monte sous QueryClientProvider : écoute foreground / appStateChange natif.
 */
export function AppResumeCoordinator() {
  useAppResumeManager(true);
  return null;
}
