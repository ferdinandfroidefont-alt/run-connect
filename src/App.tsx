import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
// Plus d'useEffect pour permissions
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import { PermissionRequestDialog } from "@/components/PermissionRequestDialog";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MySessions from "./pages/MySessions";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import DonationSuccess from "./pages/DonationSuccess";
import DonationCanceled from "./pages/DonationCanceled";
import NotFound from "./pages/NotFound";
import { SecurityDashboard } from "./components/SecurityDashboard";
import { AndroidTestPage } from "./components/AndroidTestPage";

// Lazy load Messages with preload capability
const Messages = lazy(() => import("./pages/Messages"));

// Preload Messages component
const preloadMessages = () => {
  import("./pages/Messages");
};

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

// Component to handle preloading
const PreloadHandler = () => {
  useEffect(() => {
    // Preload Messages after 1 second of app load
    const timer = setTimeout(() => {
      preloadMessages();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return null;
};

const queryClient = new QueryClient();

const App = () => {
  // SUPPRIMÉ: Plus de demande automatique de permissions au démarrage
  // L'utilisateur en a marre qu'on lui demande sans arrêt !

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
            <PreloadHandler />
            <AdMobInitializer />
            <PermissionRequestDialog />
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout><Index /></Layout>} />
              <Route path="/my-sessions" element={<Layout><MySessions /></Layout>} />
              <Route 
                path="/messages" 
                element={
                  <Layout>
                    <Suspense fallback={<PageLoader />}>
                      <Messages />
                    </Suspense>
                  </Layout>
                } 
              />
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
