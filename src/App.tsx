import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageTransition } from "@/components/PageTransition";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentBanner";
import { RouteAnalytics } from "@/components/RouteAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { resolveIncomingAppUrl } from "@/lib/appLinks";
import {
  finalizeSupabaseOAuthFromDeepLink,
  isAuthCallbackDeepLink,
} from "@/lib/oauthMobile";
import { SessionExperienceFeedbackHost } from "@/components/SessionExperienceFeedbackHost";
import { AppResumeCoordinator } from "@/components/AppResumeCoordinator";
import { MainTabsSwipeHost } from "@/components/MainTabsSwipeHost";
import { restoreChromeAfterRuconnectSplash } from "@/lib/ruconnectSplashChrome";

const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Feed = lazy(() => import("./pages/Feed"));
const ProfileEntry = lazy(() => import("./pages/ProfileEntry"));
const ProfileByUserIdPage = lazy(() => import("./pages/ProfileByUserIdPage"));
const ProfileSportRecordsEdit = lazy(() => import("./pages/ProfileSportRecordsEdit"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const DonationSuccess = lazy(() => import("./pages/DonationSuccess"));
const DonationCanceled = lazy(() => import("./pages/DonationCanceled"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Search = lazy(() => import("./pages/Search"));
const RouteCreation = lazy(() => import("./pages/RouteCreation"));
const ItineraryMyRoutes = lazy(() => import("./pages/ItineraryMyRoutes"));
const ItineraryRouteDetail = lazy(() => import("./pages/ItineraryRouteDetail"));
const Itinerary3D = lazy(() => import("./pages/Itinerary3D"));
const ItineraryTraining = lazy(() => import("./pages/ItineraryTraining"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const ConfirmPresence = lazy(() => import("./pages/ConfirmPresence"));
const ConfirmPresenceHelp = lazy(() => import("./pages/ConfirmPresenceHelp"));
const TrainingMode = lazy(() => import("./pages/TrainingMode"));
const SessionTracking = lazy(() => import("./pages/SessionTracking"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const StoryCreate = lazy(() => import("./pages/StoryCreate"));
const Drafts = lazy(() => import("./pages/Drafts"));
const OpenSessionLink = lazy(() => import("./pages/OpenSessionLink"));
const ShortSessionLinkRedirect = lazy(() => import("./pages/ShortSessionLinkRedirect"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const Referral = lazy(() => import("./pages/Referral"));
const StoryDeleteConfirm = lazy(() => import("./pages/StoryDeleteConfirm"));
const Participants = lazy(() => import("./pages/Participants"));

/** Un Suspense par route : évite de remplacer tout l’écran au chargement d’un chunk. */
function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: (i) => Math.min(1500 * 2 ** i, 12_000),
      refetchOnWindowFocus: false,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  /** Toujours afficher le splash au lancement de l'app (minimum géré dans LoadingScreen). */
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  const handleShellBootComplete = useCallback(() => {
    setIsAppLoaded(true);
  }, []);

  // Si le shell a déjà booté (localStorage), rétablit tout de suite le chrome (pas de passage par LoadingScreen).
  useEffect(() => {
    if (!isAppLoaded) return;
    void restoreChromeAfterRuconnectSplash();
  }, [isAppLoaded]);

  // Route warmup disabled in production/native debug: it eagerly pulled heavy chart pages
  // and could crash the published boot before the auth/home UI appeared.
  useEffect(() => {
    if (!import.meta.env.DEV) {
      
      return;
    }

    const preload = () => {
      void Promise.allSettled([
        import("./components/MainTabsSwipeHost"),
        import("./pages/Auth"),
        import("./pages/Feed"),
        import("./pages/ProfileEntry"),
        import("./pages/ProfileByUserIdPage"),
        import("./pages/ProfileSportRecordsEdit"),
        import("./pages/PublicProfile"),
        import("./pages/Subscription"),
        import("./pages/DonationSuccess"),
        import("./pages/DonationCanceled"),
        import("./pages/NotFound"),
        import("./pages/Search"),
        import("./pages/RouteCreation"),
        import("./pages/ItineraryMyRoutes"),
        import("./pages/ItineraryRouteDetail"),
        import("./pages/Itinerary3D"),
        import("./pages/ItineraryTraining"),
        import("./pages/Privacy"),
        import("./pages/Terms"),
        import("./pages/About"),
        import("./pages/LegalNotice"),
        import("./pages/ConfirmPresence"),
        import("./pages/ConfirmPresenceHelp"),
        import("./pages/TrainingMode"),
        import("./pages/SessionTracking"),
        import("./pages/AuthCallback"),
        import("./pages/StoryCreate"),
        import("./pages/Drafts"),
        import("./pages/OpenSessionLink"),
        import("./pages/StoryDeleteConfirm"),
        import("./pages/Participants"),
      ]);
    };

    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;

    if (ric) {
      const id = ric(preload, { timeout: 600 });
      const onFocus = () => preload();
      const onOnline = () => preload();
      window.addEventListener("focus", onFocus);
      window.addEventListener("online", onOnline);
      return () => {
        const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        cic?.(id);
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("online", onOnline);
      };
    }

    const timer = window.setTimeout(preload, 0);
    const onFocus = () => preload();
    const onOnline = () => preload();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // 🍎 Global deep link listener for iOS OAuth callback
  useEffect(() => {
    const isNative = !!(window as any).CapacitorForceNative || !!(window as any).Capacitor;
    if (!isNative) return;

    let removed = false;

    const setupListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const { Browser } = await import('@capacitor/browser');

        const listener = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          console.log('[OAuth/App] appUrlOpen', {
            scheme: url?.split(':')[0],
            pathPrefix: url?.slice(0, 48),
          });

          if (!isAuthCallbackDeepLink(url)) {
            const targetRoute = resolveIncomingAppUrl(url);
            if (targetRoute && `${window.location.pathname}${window.location.search}` !== targetRoute) {
              console.log('[OAuth/App] deep link → in-app route', targetRoute);
              window.location.href = targetRoute;
            }
            return;
          }

          try {
            try {
              await Browser.close();
            } catch {
              /* Safari déjà fermé */
            }

            const result = await finalizeSupabaseOAuthFromDeepLink(supabase, url);
            if (!result.ok) {
              console.warn('[OAuth/App] finalize failed', result.reason);
              return;
            }

            // Voie rapide : `exchangeCodeForSession` a émis `SIGNED_IN`, `useAuth`
            // met à jour `user`, et `Auth.tsx` rend `<Navigate to="/" />` au prochain
            // render. Si ça suffit, le filet de sécurité ci-dessous ne déclenche pas.
            console.log('[OAuth/App] session OK → SPA navigation (Auth → "/")');

            // Filet de sécurité : si on est encore sur `/auth` après 800 ms,
            // on bascule HORS de Layout vers `/auth/callback`. Cette page n'est PAS
            // protégée par Layout (donc pas de redirection automatique vers `/auth`),
            // et elle attend explicitement la session (polling + listener) avant de
            // naviguer en SPA vers `/`. Cela neutralise les ~bouclages observés sur
            // Apple Sign-In iOS quand la mise à jour de `useAuth` rate la fenêtre de
            // re-render d'`Auth.tsx`.
            window.setTimeout(() => {
              const path = window.location.pathname;
              if (path === '/auth' || path === '/auth/') {
                console.warn('[OAuth/App] Auth toujours actif après 800 ms — fallback /auth/callback');
                window.location.replace(`${window.location.origin}/auth/callback`);
              }
            }, 800);
          } catch (err) {
            console.error('[OAuth/App] deep link handler error', err);
          }
        });

        // Cleanup on unmount
        return () => {
          if (!removed) {
            removed = true;
            listener.remove();
          }
        };
      } catch (e) {
        console.warn('🍎 [GLOBAL] Could not set up appUrlOpen listener:', e);
      }
    };

    const cleanupPromise = setupListener();
    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, []);

  // Handle cold start links (app opened directly from deep/universal link).
  useEffect(() => {
    const isNative = !!(window as any).CapacitorForceNative || !!(window as any).Capacitor;
    if (!isNative) return;

    const handleLaunchUrl = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const { Browser } = await import('@capacitor/browser');
        const launchData = await CapApp.getLaunchUrl();
        const incomingUrl = launchData?.url;
        if (!incomingUrl) return;

        if (isAuthCallbackDeepLink(incomingUrl)) {
          console.log('[OAuth/App] cold start auth callback');
          try {
            await Browser.close();
          } catch {
            /* no-op */
          }
          const result = await finalizeSupabaseOAuthFromDeepLink(supabase, incomingUrl);
          if (result.ok) {
            // Cold start : l'app vient de démarrer (typiquement sur `/`). Layout
            // peut être plus rapide que `useAuth.getSession()` à se rendre, et voir
            // brièvement `loading=false, user=null` → redirige sur `/auth` avant que
            // l'évènement `SIGNED_IN` arrive. Pour neutraliser ce flash, on bascule
            // explicitement sur `/auth/callback` (hors Layout) qui attend la session
            // avant de naviguer vers `/`.
            console.log('[OAuth/App] cold start session OK → /auth/callback (stabilise la session)');
            const path = window.location.pathname;
            if (path !== '/auth/callback' && path !== '/auth/callback/') {
              window.location.replace(`${window.location.origin}/auth/callback`);
            }
          }
          return;
        }

        const targetRoute = resolveIncomingAppUrl(incomingUrl);
        if (targetRoute && `${window.location.pathname}${window.location.search}` !== targetRoute) {
          console.log('[OAuth/App] cold start → route', targetRoute);
          window.location.href = targetRoute;
        }
      } catch (e) {
        console.warn('[OAuth/App] getLaunchUrl / cold start:', e);
      }
    };

    void handleLaunchUrl();
  }, []);

  /* Pas de ThemeProvider ici : sinon ThemeMetaSync écrase le fond bleu du splash */
  if (!isAppLoaded) {
    return (
      <>
        <LoadingScreen onLoadingComplete={handleShellBootComplete} />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <QueryClientProvider client={queryClient}>
        <AppResumeCoordinator />
        <AppErrorBoundary>
          <ThemeProvider>
            <AppProvider>
              <TooltipProvider>
                <AdMobInitializer />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                <RouteAnalytics />
                <AnalyticsConsentBanner />
                <NetworkStatusBanner />
                <SessionExperienceFeedbackHost />
                <div className="flex min-h-0 flex-1 flex-col">
                  <Routes>
                  <Route path="/welcome" element={<Navigate to="/auth" replace />} />
                  <Route path="/auth" element={<PageTransition><PageSuspense><Auth /></PageSuspense></PageTransition>} />
                  <Route path="/auth/callback" element={<PageSuspense><AuthCallback /></PageSuspense>} />
                  <Route path="/onboarding" element={<PageTransition><PageSuspense><Onboarding /></PageSuspense></PageTransition>} />
                  <Route path="/" element={<Layout><MainTabsSwipeHost /></Layout>} />
                  <Route path="/feed" element={<Layout><PageTransition><PageSuspense><Feed /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/my-sessions" element={<Layout><MainTabsSwipeHost /></Layout>} />
                  <Route path="/my-sessions/confirm/:sessionId" element={<Layout><PageTransition><PageSuspense><ConfirmPresence /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/messages" element={<Layout><MainTabsSwipeHost /></Layout>} />
                  <Route path="/coaching" element={<Layout><MainTabsSwipeHost /></Layout>} />
                  <Route path="/me" element={<Layout><MainTabsSwipeHost /></Layout>} />
                  <Route path="/leaderboard" element={<Navigate to="/route-create" replace />} />
                  <Route path="/profile/records" element={<Layout><PageTransition><PageSuspense><ProfileSportRecordsEdit /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile/edit" element={<PageTransition><PageSuspense><ProfileEdit /></PageSuspense></PageTransition>} />
                  <Route path="/referral" element={<Layout><PageTransition><PageSuspense><Referral /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile" element={<Layout><PageTransition><PageSuspense><ProfileEntry /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile/:userId" element={<Layout><PageTransition><PageSuspense><ProfileByUserIdPage /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/subscription" element={<Layout><PageTransition><PageSuspense><Subscription /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/search" element={<PageTransition><PageSuspense><Search /></PageSuspense></PageTransition>} />
                  <Route path="/itinerary" element={<Navigate to="/route-create" replace />} />
                  <Route path="/itinerary/my-routes" element={<Layout><PageTransition><PageSuspense><ItineraryMyRoutes /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/itinerary/route/:routeId" element={<Layout><PageTransition><PageSuspense><ItineraryRouteDetail /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/itinerary/3d" element={<Layout><PageTransition><PageSuspense><Itinerary3D /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/itinerary/training" element={<Layout><PageTransition><PageSuspense><ItineraryTraining /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/route-create" element={<Layout><PageTransition><PageSuspense><RouteCreation /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/route-creation" element={<Layout><PageTransition><PageSuspense><RouteCreation /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/privacy" element={<PageTransition><PageSuspense><Privacy /></PageSuspense></PageTransition>} />
                  <Route path="/legal" element={<PageTransition><PageSuspense><LegalNotice /></PageSuspense></PageTransition>} />
                  <Route path="/terms" element={<PageTransition><PageSuspense><Terms /></PageSuspense></PageTransition>} />
                  <Route path="/about" element={<PageTransition><PageSuspense><About /></PageSuspense></PageTransition>} />
                  <Route path="/confirm-presence" element={<Layout><PageTransition><PageSuspense><ConfirmPresence /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/confirm-presence/help" element={<Layout><PageTransition><PageSuspense><ConfirmPresenceHelp /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/confirm-presence/:sessionId" element={<Layout><PageTransition><PageSuspense><ConfirmPresence /></PageSuspense></PageTransition></Layout>} />
                  {/* /security route removed for production security */}
                  <Route path="/training/route/:routeId" element={<PageTransition><PageSuspense><TrainingMode /></PageSuspense></PageTransition>} />
                  <Route path="/training/:sessionId" element={<PageTransition><PageSuspense><TrainingMode /></PageSuspense></PageTransition>} />
                  <Route path="/session-tracking/:sessionId" element={<PageTransition><PageSuspense><SessionTracking /></PageSuspense></PageTransition>} />
                  <Route path="/participants" element={<PageTransition><PageSuspense><Participants /></PageSuspense></PageTransition>} />
                  <Route path="/stories/create" element={<PageTransition><PageSuspense><StoryCreate /></PageSuspense></PageTransition>} />
                  <Route path="/open/session/:sessionId" element={<PageTransition><PageSuspense><OpenSessionLink /></PageSuspense></PageTransition>} />
                  <Route path="/s/:sessionId" element={<PageTransition><PageSuspense><ShortSessionLinkRedirect /></PageSuspense></PageTransition>} />
                  <Route path="/drafts" element={<PageTransition><PageSuspense><Drafts /></PageSuspense></PageTransition>} />
                  <Route path="/drafts/stories" element={<PageTransition><PageSuspense><Drafts /></PageSuspense></PageTransition>} />
                  <Route path="/drafts/routes" element={<PageTransition><PageSuspense><Drafts /></PageSuspense></PageTransition>} />
                  <Route path="/stories/:storyId/delete" element={<PageTransition><PageSuspense><StoryDeleteConfirm /></PageSuspense></PageTransition>} />
                  
                  <Route path="/donation-success" element={<PageTransition><PageSuspense><DonationSuccess /></PageSuspense></PageTransition>} />
                  <Route path="/donation-canceled" element={<PageTransition><PageSuspense><DonationCanceled /></PageSuspense></PageTransition>} />
                  {/* Route profil public (AVANT *) */}
                  <Route path="/p/:username" element={<PageTransition><PageSuspense><PublicProfile /></PageSuspense></PageTransition>} />
                  <Route path="/u/:username" element={<PageTransition><PageSuspense><PublicProfile /></PageSuspense></PageTransition>} />
                  <Route path="*" element={<PageTransition><PageSuspense><NotFound /></PageSuspense></PageTransition>} />
                  </Routes>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </AppProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </QueryClientProvider>
    </div>
  );
};

export default App;
