import { useState, useEffect, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageTransition } from "@/components/PageTransition";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentBanner";
import { RouteAnalytics } from "@/components/RouteAnalytics";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { supabase } from "@/integrations/supabase/client";
import { resolveIncomingAppUrl } from "@/lib/appLinks";
import { SessionExperienceFeedbackHost } from "@/components/SessionExperienceFeedbackHost";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Feed = lazy(() => import("./pages/Feed"));
const MySessions = lazy(() => import("./pages/MySessions"));
const Messages = lazy(() => import("./pages/Messages"));
const Coaching = lazy(() => import("./pages/Coaching"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
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
const ItineraryHub = lazy(() => import("./pages/ItineraryHub"));
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

/** Un Suspense par route : évite de remplacer tout l’écran au chargement d’un chunk. */
function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RoutePageFallback />}>{children}</Suspense>;
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
  // Show loading screen on all platforms
  const [isAppLoaded, setIsAppLoaded] = useState(false);

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
          if (import.meta.env.DEV) {
            console.log('🍎 [GLOBAL] appUrlOpen:', url);
          } else {
            console.log('🍎 [GLOBAL] appUrlOpen (redacted in prod)');
          }

          const isAuthCallback =
            url.startsWith('runconnect://auth/callback') ||
            url.startsWith('app.runconnect://auth/callback');

          if (!isAuthCallback) {
            const targetRoute = resolveIncomingAppUrl(url);
            if (targetRoute && `${window.location.pathname}${window.location.search}` !== targetRoute) {
              console.log('🍎 [GLOBAL] Navigating from deep/universal link to:', targetRoute);
              window.location.href = targetRoute;
            }
            return;
          }

          try {
            const params = new URLSearchParams(url.split('?')[1] || '');
            const code = params.get('code');
            const error = params.get('error');
            const errorDesc = params.get('error_description');

            // Close Safari immediately
            try { await Browser.close(); } catch {}

            if (error) {
              console.error('🍎 [GLOBAL] OAuth error:', error, errorDesc);
              return;
            }

            if (!code) {
              console.error('🍎 [GLOBAL] No authorization code received');
              return;
            }

            console.log('🍎 [GLOBAL] Exchanging PKCE code for session...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error('🍎 [GLOBAL] Exchange error:', exchangeError);
              return;
            }

            console.log('🍎 [GLOBAL] Session established, navigating to /');
            window.location.href = '/';
          } catch (err) {
            console.error('🍎 [GLOBAL] Deep link handling error:', err);
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
        const launchData = await CapApp.getLaunchUrl();
        const incomingUrl = launchData?.url;
        if (!incomingUrl) return;
        const targetRoute = resolveIncomingAppUrl(incomingUrl);
        if (targetRoute && `${window.location.pathname}${window.location.search}` !== targetRoute) {
          console.log('🍎 [GLOBAL] Cold start deep/universal link ->', targetRoute);
          window.location.href = targetRoute;
        }
      } catch (e) {
        console.warn('🍎 [GLOBAL] Could not resolve launch URL:', e);
      }
    };

    void handleLaunchUrl();
  }, []);

  /* Pas de ThemeProvider ici : sinon ThemeMetaSync écrase le fond bleu du splash */
  if (!isAppLoaded) {
    return <LoadingScreen onLoadingComplete={() => setIsAppLoaded(true)} />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <QueryClientProvider client={queryClient}>
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
                <AnimatePresence mode="wait">
                  <Routes>
                  <Route path="/auth" element={<PageTransition><PageSuspense><Auth /></PageSuspense></PageTransition>} />
                  <Route path="/auth/callback" element={<PageSuspense><AuthCallback /></PageSuspense>} />
                  <Route path="/" element={<Layout><PageTransition><PageSuspense><Index /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/feed" element={<Layout><PageTransition><PageSuspense><Feed /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/my-sessions" element={<Layout><PageTransition><PageSuspense><MySessions /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/messages" element={<Layout><PageTransition><PageSuspense><Messages /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/coaching" element={<Layout><PageTransition><PageSuspense><Coaching /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/leaderboard" element={<Layout><PageTransition><PageSuspense><Leaderboard /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile/records" element={<Layout><PageTransition><PageSuspense><ProfileSportRecordsEdit /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile" element={<Layout><PageTransition><PageSuspense><ProfileEntry /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/profile/:userId" element={<Layout><PageTransition><PageSuspense><ProfileByUserIdPage /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/subscription" element={<Layout><PageTransition><PageSuspense><Subscription /></PageSuspense></PageTransition></Layout>} />
                  <Route path="/search" element={<PageTransition><PageSuspense><Search /></PageSuspense></PageTransition>} />
                  <Route path="/itinerary" element={<Layout><PageTransition><PageSuspense><ItineraryHub /></PageSuspense></PageTransition></Layout>} />
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
                  
                  <Route path="/donation-success" element={<PageTransition><PageSuspense><DonationSuccess /></PageSuspense></PageTransition>} />
                  <Route path="/donation-canceled" element={<PageTransition><PageSuspense><DonationCanceled /></PageSuspense></PageTransition>} />
                  {/* Route profil public (AVANT *) */}
                  <Route path="/p/:username" element={<PageTransition><PageSuspense><PublicProfile /></PageSuspense></PageTransition>} />
                  <Route path="*" element={<PageTransition><PageSuspense><NotFound /></PageSuspense></PageTransition>} />
                  </Routes>
                </AnimatePresence>
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
