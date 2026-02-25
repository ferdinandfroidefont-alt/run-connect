import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageTransition } from "@/components/PageTransition";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import MySessions from "./pages/MySessions";
import Messages from "./pages/Messages";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Subscription from "./pages/Subscription";
import DonationSuccess from "./pages/DonationSuccess";
import DonationCanceled from "./pages/DonationCanceled";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";
import RouteCreation from "./pages/RouteCreation";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import ConfirmPresence from "./pages/ConfirmPresence";
import TrainingMode from "./pages/TrainingMode";
import SessionTracking from "./pages/SessionTracking";
import AuthCallback from "./pages/AuthCallback";
import { SecurityDashboard } from "./components/SecurityDashboard";

const queryClient = new QueryClient();

const App = () => {
  // Show loading screen on all platforms
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  if (!isAppLoaded) {
    return (
      <ThemeProvider>
        <LoadingScreen onLoadingComplete={() => setIsAppLoaded(true)} />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppProvider>
          <TooltipProvider>
            <AdMobInitializer />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/" element={<Layout><PageTransition><Index /></PageTransition></Layout>} />
                  <Route path="/feed" element={<Layout><PageTransition><Feed /></PageTransition></Layout>} />
                  <Route path="/my-sessions" element={<Layout><PageTransition><MySessions /></PageTransition></Layout>} />
                  <Route path="/messages" element={<Layout><PageTransition><Messages /></PageTransition></Layout>} />
                  <Route path="/leaderboard" element={<Layout><PageTransition><Leaderboard /></PageTransition></Layout>} />
                  <Route path="/profile" element={<Layout><PageTransition><Profile /></PageTransition></Layout>} />
                  <Route path="/profile/:userId" element={<Layout><PageTransition><Profile /></PageTransition></Layout>} />
                  <Route path="/subscription" element={<Layout><PageTransition><Subscription /></PageTransition></Layout>} />
                  <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
                  <Route path="/route-create" element={<Layout><PageTransition><RouteCreation /></PageTransition></Layout>} />
                  <Route path="/route-creation" element={<Layout><PageTransition><RouteCreation /></PageTransition></Layout>} />
                  <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
                  <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
                  <Route path="/about" element={<PageTransition><About /></PageTransition>} />
                  <Route path="/confirm-presence" element={<Layout><PageTransition><ConfirmPresence /></PageTransition></Layout>} />
                  <Route path="/confirm-presence/:sessionId" element={<Layout><PageTransition><ConfirmPresence /></PageTransition></Layout>} />
                  <Route path="/security" element={<Layout><PageTransition><SecurityDashboard /></PageTransition></Layout>} />
                  <Route path="/training/route/:routeId" element={<PageTransition><TrainingMode /></PageTransition>} />
                  <Route path="/training/:sessionId" element={<PageTransition><TrainingMode /></PageTransition>} />
                  <Route path="/session-tracking/:sessionId" element={<PageTransition><SessionTracking /></PageTransition>} />
                  
                  <Route path="/donation-success" element={<PageTransition><DonationSuccess /></PageTransition>} />
                  <Route path="/donation-canceled" element={<PageTransition><DonationCanceled /></PageTransition>} />
                  {/* Route profil public (AVANT *) */}
                  <Route path="/p/:username" element={<PageTransition><PublicProfile /></PageTransition>} />
                  <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
