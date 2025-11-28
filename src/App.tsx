import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { AdMobInitializer } from "@/components/AdMobInitializer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import ConfirmPresence from "./pages/ConfirmPresence";
import { SecurityDashboard } from "./components/SecurityDashboard";
import { AndroidTestPage } from "./components/AndroidTestPage";
const queryClient = new QueryClient();
const App = () => {
  return <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppProvider>
          <TooltipProvider>
            <AdMobInitializer />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Layout><Index /></Layout>} />
                <Route path="/my-sessions" element={<Layout><MySessions /></Layout>} className="bg-[#10c8d5]" />
                <Route path="/messages" element={<Layout><Messages /></Layout>} />
                <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/profile/:userId" element={<Layout><Profile /></Layout>} />
                <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
                <Route path="/search" element={<Search />} />
                <Route path="/route-create" element={<RouteCreation />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/confirm-presence" element={<ConfirmPresence />} />
                <Route path="/confirm-presence/:sessionId" element={<ConfirmPresence />} />
                <Route path="/security" element={<Layout><SecurityDashboard /></Layout>} />
                <Route path="/android-test" element={<Layout><AndroidTestPage /></Layout>} />
                <Route path="/donation-success" element={<DonationSuccess />} />
            <Route path="/donation-canceled" element={<DonationCanceled />} />
            {/* Route profil public (AVANT *) */}
            <Route path="/p/:username" element={<PublicProfile />} />
            <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </QueryClientProvider>;
};
export default App;