import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
import { type PreviewIdentity } from "@/lib/previewIdentity";

const STORAGE_KEY = "rc_admin_app_preview_v1";

type StoredPreview = {
  realUserId: string;
  identity: PreviewIdentity;
};

interface AppPreviewContextValue {
  isPreviewMode: boolean;
  previewIdentity: PreviewIdentity | null;
  /**
   * Lance l’aperçu. `gate` doit inclure l’email / username du compte pour la vérif créateur.
   * Appelé depuis l’écran admin avec useAuth + useUserProfile.
   */
  enterPreview: (
    identity: PreviewIdentity,
    gate: { email?: string | null; username?: string | null }
  ) => boolean;
  exitPreview: () => void;
}

const AppPreviewContext = createContext<AppPreviewContextValue | undefined>(undefined);

function readStoredPreview(): StoredPreview | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPreview;
    if (!parsed?.realUserId || !parsed?.identity?.preview_mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredPreview(data: StoredPreview | null) {
  try {
    if (!data) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function AppPreviewProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [previewIdentity, setPreviewIdentity] = useState<PreviewIdentity | null>(null);

  const isPreviewMode = previewIdentity != null;

  const exitPreview = useCallback(() => {
    setPreviewIdentity(null);
    writeStoredPreview(null);
  }, []);

  const enterPreview = useCallback(
    (identity: PreviewIdentity, gate: { email?: string | null; username?: string | null }): boolean => {
      if (!user?.id) return false;
      if (!hasCreatorSupportAccess(gate.email ?? user.email, gate.username ?? null)) {
        return false;
      }
      const payload: StoredPreview = { realUserId: user.id, identity };
      setPreviewIdentity(identity);
      writeStoredPreview(payload);
      return true;
    },
    [user?.id, user?.email]
  );

  // Restaure la session d’aperçu au chargement (même onglet) — invalide si autre compte.
  useEffect(() => {
    if (!user?.id) {
      setPreviewIdentity(null);
      writeStoredPreview(null);
      return;
    }
    const stored = readStoredPreview();
    if (!stored) return;
    if (stored.realUserId !== user.id) {
      writeStoredPreview(null);
      return;
    }
    setPreviewIdentity(stored.identity);
  }, [user?.id, user?.email]);

  const value = useMemo(
    () => ({
      isPreviewMode,
      previewIdentity,
      enterPreview,
      exitPreview,
    }),
    [isPreviewMode, previewIdentity, enterPreview, exitPreview]
  );

  return <AppPreviewContext.Provider value={value}>{children}</AppPreviewContext.Provider>;
}

export function useAppPreview() {
  const ctx = useContext(AppPreviewContext);
  if (!ctx) {
    throw new Error("useAppPreview must be used within AppPreviewProvider");
  }
  return ctx;
}

/** Pour écrans hors arbre React (rare) — préférer useAppPreview. */
export function getPreviewIdentitySnapshot(): PreviewIdentity | null {
  const stored = readStoredPreview();
  return stored?.identity ?? null;
}
