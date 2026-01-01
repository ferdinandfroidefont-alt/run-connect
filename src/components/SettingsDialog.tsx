import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Link2, Shield, HelpCircle, ChevronRight, Loader2, ArrowLeft, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// Sub-pages
import { SettingsGeneral } from "./settings/SettingsGeneral";
import { SettingsNotifications } from "./settings/SettingsNotifications";
import { SettingsConnections } from "./settings/SettingsConnections";
import { SettingsPrivacy } from "./settings/SettingsPrivacy";
import { SettingsSupport } from "./settings/SettingsSupport";

type SettingsPage = 'hub' | 'general' | 'notifications' | 'connections' | 'privacy' | 'support';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
}

const settingsCategories = [
  {
    id: 'general' as const,
    title: 'Général',
    description: 'Langue, thème, mot de passe',
    icon: Settings,
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Push, alertes, préférences',
    icon: Bell,
  },
  {
    id: 'connections' as const,
    title: 'Connexions',
    description: 'Strava, Instagram, partage',
    icon: Link2,
  },
  {
    id: 'privacy' as const,
    title: 'Confidentialité',
    description: 'RGPD, sécurité, données',
    icon: Shield,
  },
  {
    id: 'support' as const,
    title: 'Aide & Support',
    description: 'Contact, déconnexion, compte',
    icon: HelpCircle,
  },
];

export const SettingsDialog = ({ open, onOpenChange, initialSearch }: SettingsDialogProps) => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<SettingsPage>('hub');
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Reset to hub when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => setCurrentPage('hub'), 300);
    }
  }, [open]);

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    return normalizedText.includes(normalizedQuery);
  };

  const filteredCategories = settingsCategories.filter(cat => 
    matchesSearch(cat.title) || matchesSearch(cat.description)
  );

  const handleNavigateToSubscription = () => {
    onOpenChange(false);
    window.location.href = '/subscription';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'general':
        return <SettingsGeneral onBack={() => setCurrentPage('hub')} />;
      case 'notifications':
        return <SettingsNotifications onBack={() => setCurrentPage('hub')} />;
      case 'connections':
        return (
          <SettingsConnections 
            onBack={() => setCurrentPage('hub')} 
            onNavigateToSubscription={handleNavigateToSubscription}
          />
        );
      case 'privacy':
        return (
          <SettingsPrivacy 
            onBack={() => setCurrentPage('hub')} 
            onClose={() => onOpenChange(false)}
          />
        );
      case 'support':
        return (
          <SettingsSupport 
            onBack={() => setCurrentPage('hub')} 
            onClose={() => onOpenChange(false)}
          />
        );
      default:
        return null;
    }
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen sm:max-w-md sm:h-auto sm:max-h-[85vh] p-0 flex flex-col bg-background overflow-hidden">
        <AnimatePresence mode="wait">
          {currentPage === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border">
                <div className="flex items-center gap-3 p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => onOpenChange(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-lg font-semibold">Paramètres</h2>
                </div>
                
                {/* Search bar */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un paramètre"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-1">
                  {filteredCategories.map((category, index) => (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setCurrentPage(category.id)}
                      className="w-full flex items-center gap-4 py-4 px-3 rounded-xl hover:bg-muted transition-colors duration-150 group"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-sm font-medium">{category.title}</h3>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </motion.button>
                  ))}

                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Aucun paramètre trouvé</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div
              key={currentPage}
              className="flex-1 h-full"
            >
              {renderPage()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
