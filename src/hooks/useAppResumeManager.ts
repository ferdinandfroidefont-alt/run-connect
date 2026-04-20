import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/** Au-delà : revalidation discrète des requêtes React Query actives (onglets montés). */
export const RESUME_STALE_REFETCH_MS = 5 * 60_000;

/**
 * Foreground / resume : garde l’UI, pas de splash, rafraîchissement ciblé.
 * - Court background : `getSession()` uniquement (aligne JWT sans toucher au cache UI).
 * - Long background : invalide les queries **actives** pour refetch en arrière-plan.
 */
export function useAppResumeManager(enabled: boolean) {
  const queryClient = useQueryClient();
  const wentBackgroundAt = useRef<number | null>(null);
  const lastForegroundHandled = useRef<number>(0);

  const onForeground = useCallback(async () => {
    const now = Date.now();
    if (now - lastForegroundHandled.current < 400) return;
    lastForegroundHandled.current = now;

    try {
      await supabase.auth.getSession();
    } catch {
      /* réseau / storage — on ne bloque pas l’UI */
    }

    const bg = wentBackgroundAt.current;
    wentBackgroundAt.current = null;
    if (bg == null) return;

    const elapsed = now - bg;
    if (elapsed >= RESUME_STALE_REFETCH_MS) {
      void queryClient.invalidateQueries({ refetchType: "active" });
    }
  }, [queryClient]);

  const onBackground = useCallback(() => {
    wentBackgroundAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onBackground();
      else if (document.visibilityState === "visible") void onForeground();
    };

    document.addEventListener("visibilitychange", onVisibility);

    let cancelled = false;
    let removeCap: (() => void) | null = null;

    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/app").then(({ App }) => {
        if (cancelled) return;
        void App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void onForeground();
          else onBackground();
        }).then((handle) => {
          if (cancelled) {
            void handle.remove();
            return;
          }
          removeCap = () => {
            void handle.remove();
          };
        });
      });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      removeCap?.();
    };
  }, [enabled, onBackground, onForeground]);
}
