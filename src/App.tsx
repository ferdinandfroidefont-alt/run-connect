import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import { requestNativePermissionsOnce } from "@/lib/native";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MySessions from "./pages/MySessions";
import Messages from "./pages/Messages";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import DonationSuccess from "./pages/DonationSuccess";
import DonationCanceled from "./pages/DonationCanceled";
import NotFound from "./pages/NotFound";
import { SecurityDashboard } from "./components/SecurityDashboard";
import { AndroidTestPage } from "./components/AndroidTestPage";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialiser les permissions natives au démarrage pour AAB/Play Store
    requestNativePermissionsOnce().then((result) => {
      if (result) {
        console.log('🔧 Permissions natives initialisées:', result);
      }
    }).catch((error) => {
      console.error('❌ Erreur initialisation permissions:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
            <AdMobInitializer />
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout><Index /></Layout>} />
              <Route path="/my-sessions" element={<Layout><MySessions /></Layout>} />
              <Route path="/messages" element={<Layout><Messages /></Layout>} />
              <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/profile/:userId" element={<Layout><Profile /></Layout>} />
              <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
              <Route path="/security" element={<Layout><SecurityDashboard /></Layout>} />
              <Route path="/android-test" element={<Layout><AndroidTestPage /></Layout>} />
              <Route path="/donation-success" element={<DonationSuccess />} />
              <Route path="/donation-canceled" element={<DonationCanceled />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
  );
};

export default App;
