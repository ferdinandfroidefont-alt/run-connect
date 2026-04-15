import { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Bell,
  Link2,
  Shield,
  HelpCircle,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Search,
  Share2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { resetBodyInteractionLocks } from "@/lib/bodyInteractionLocks";
import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import {
  TUTORIAL_REPLAY_DEFINITIONS,
  requestTutorialReplay,
  notifyTutorialReplayQueued,
  type TutorialReplayId,
} from "@/lib/tutorials/registry";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";

// Sub-pages
const SettingsGeneral = lazy(() =>
  import("./settings/SettingsGeneral").then((m) => ({ default: m.SettingsGeneral }))
);
const SettingsNotifications = lazy(() =>
  import("./settings/SettingsNotifications").then((m) => ({ default: m.SettingsNotifications }))
);
const SettingsConnections = lazy(() =>
  import("./settings/SettingsConnections").then((m) => ({ default: m.SettingsConnections }))
);
const SettingsPrivacy = lazy(() =>
  import("./settings/SettingsPrivacy").then((m) => ({ default: m.SettingsPrivacy }))
);
const SettingsSupport = lazy(() =>
  import("./settings/SettingsSupport").then((m) => ({ default: m.SettingsSupport }))
);
const SettingsTutorialCatalog = lazy(() =>
  import("./settings/SettingsTutorialCatalog").then((m) => ({ default: m.SettingsTutorialCatalog }))
);

export type SettingsDialogPage =
  | "hub"
  | "general"
  | "notifications"
  | "connections"
  | "privacy"
  | "support"
  | "tutorial-catalog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  /** Ouvre directement une sous-page (ex. confidentialité depuis le profil). */
  initialPage?: SettingsDialogPage;
}

const settingsCategories = [
  {
    id: 'general' as const,
    title: 'Général',
    description: 'Langue, thème, distances, mot de passe',
    icon: Settings,
    color: 'bg-[#8E8E93]',
    searchItems: ['Langue', 'Thème', 'Mode sombre', 'Mode clair', 'Système', 'Apparence', 'Unités de distance', 'Kilomètres', 'Miles', 'Mot de passe', 'Carte', 'Appui long'],
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Push, alertes, préférences',
    icon: Bell,
    color: 'bg-[#FF3B30]',
    searchItems: ['Push', 'Alertes', 'Messages', 'Sessions', 'Amis', 'Invitation club', 'Présence confirmée', 'Demande de suivi', 'Coaching'],
  },
  {
    id: 'connections' as const,
    title: 'Connexions',
    description: 'Strava, Instagram, partage',
    icon: Link2,
    color: 'bg-[#007AFF]',
    searchItems: ['Strava', 'Instagram', 'Synchronisation', 'Import activités', 'Réseau social', 'Partage'],
  },
  {
    id: 'privacy' as const,
    title: 'Confidentialité',
    description: 'RGPD, sécurité, données',
    icon: Shield,
    color: 'bg-[#34C759]',
    searchItems: ['RGPD', 'Sécurité', 'Données', 'Profil privé', 'Visibilité', 'Bloquer', 'Signaler', 'Supprimer compte', 'Export données'],
  },
  {
    id: 'support' as const,
    title: 'Aide & Support',
    description: 'Contact, tutoriels, documents, compte',
    icon: HelpCircle,
    color: 'bg-[#FF9500]',
    searchItems: ['Contact', 'Tutoriel', 'Guide', 'FAQ', 'Bug', 'Signaler problème', 'Feedback', 'Version', 'À propos', 'Mentions légales', 'Conditions', 'Déconnexion', 'Supprimer compte'],
  },
];

/** Returns matching searchItems for a category given a query */
function getMatchingItems(items: string[], query: string): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return items.filter(item => item.toLowerCase().includes(q));
}

export const SettingsDialog = ({ open, onOpenChange, initialSearch, initialPage }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<SettingsDialogPage>("hub");
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [loading, setLoading] = useState(false);

  const goToSettingsHub = () => {
    setCurrentPage("hub");
  };

  const startTutorialReplay = (id: TutorialReplayId) => {
    const def = TUTORIAL_REPLAY_DEFINITIONS[id];
    if (!def) return;
    requestTutorialReplay(id);
    handleOpenChange(false);
    navigate(def.path);
    window.setTimeout(() => notifyTutorialReplayQueued(), 60);
  };
  
  const [showProfileShare, setShowProfileShare] = useState(false);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (open && initialPage && initialPage !== "hub") {
      setCurrentPage(initialPage);
    }
  }, [open, initialPage]);

  // Reset to hub when dialog closes
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Immédiat + après l’anim de sortie Radix : évite pointer-events / scroll-lock résiduels.
      resetBodyInteractionLocks();
      window.setTimeout(resetBodyInteractionLocks, 0);
      window.setTimeout(resetBodyInteractionLocks, 120);
      window.setTimeout(resetBodyInteractionLocks, 360);
    }
  };

  useEffect(() => {
    if (!open) {
      resetBodyInteractionLocks();
      window.setTimeout(resetBodyInteractionLocks, 0);
      window.setTimeout(resetBodyInteractionLocks, 360);
      setTimeout(() => {
        setCurrentPage("hub");
      }, 300);
    }
  }, [open]);

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    return normalizedText.includes(normalizedQuery);
  };

  const filteredCategories = settingsCategories.filter(cat => 
    matchesSearch(cat.title) || matchesSearch(cat.description) || cat.searchItems.some(item => item.toLowerCase().includes((searchQuery || '').toLowerCase().trim()))
  );

  const handleNavigateToSubscription = () => {
    handleOpenChange(false);
    window.location.href = '/subscription';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'general':
      return (
        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
          <SettingsGeneral onBack={goToSettingsHub} />
        </Suspense>
      );
      case 'notifications':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsNotifications onBack={goToSettingsHub} />
          </Suspense>
        );
      case 'connections':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsConnections 
              onBack={goToSettingsHub} 
              onNavigateToSubscription={handleNavigateToSubscription}
            />
          </Suspense>
        );
      case 'privacy':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsPrivacy 
              onBack={goToSettingsHub} 
              onClose={() => handleOpenChange(false)}
            />
          </Suspense>
        );
      case 'support':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsSupport 
              onBack={goToSettingsHub} 
              onClose={() => handleOpenChange(false)}
              onOpenTutorialCatalog={() => setCurrentPage("tutorial-catalog")}
            />
          </Suspense>
        );
      case "tutorial-catalog":
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsTutorialCatalog
              onBack={() => setCurrentPage("support")}
              onReplay={startTutorialReplay}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 left-0 right-0 top-0 z-[116] mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:z-[115] sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-lg sm:border"
      >
        <AnimatePresence mode="wait">
          {currentPage === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
            >
              <IosFixedPageHeaderShell
                className="min-h-0 flex-1"
                headerWrapperClassName="shrink-0"
                contentScroll
                scrollClassName="min-h-0 bg-secondary"
                header={
                  <div className="min-w-0 max-w-full border-b border-border bg-card/95">
                    <IosPageHeaderBar
                      left={
                        <button
                          type="button"
                          onClick={() => handleOpenChange(false)}
                          className="flex min-w-0 max-w-full items-center gap-1 text-primary"
                        >
                          <ArrowLeft className="h-5 w-5 shrink-0" />
                          <span className="truncate text-[17px]">Retour</span>
                        </button>
                      }
                      title="Paramètres"
                    />
                    <div className="min-w-0 px-4 pb-2.5 ios-shell:px-2.5">
                      <div className="relative min-w-0 max-w-full">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full min-w-0 max-w-full bg-background pl-10"
                        />
                      </div>
                    </div>
                  </div>
                }
              >
              <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
                <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
                  {/* iOS grouped list style — px sur le wrapper pour éviter w-full + mx = débordement iOS */}
                  <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
                    <div className="ios-card w-full min-w-0 overflow-hidden">
                    {filteredCategories.map((category, index) => (
                      <div key={category.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(category.id);
                          }}
                          className="flex w-full min-w-0 max-w-full items-center gap-2.5 px-4 py-2.5 transition-colors active:bg-secondary ios-shell:px-2.5"
                        >
                          {/* iOS colored icon square */}
                          <div className={`ios-list-row-icon ${category.color}`}>
                            <category.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <span className="truncate text-[17px]">{category.title}</span>
                            {searchQuery.trim() && (() => {
                              const matches = getMatchingItems(category.searchItems, searchQuery);
                              if (matches.length === 0) return null;
                              return (
                                <p className="truncate text-[13px] text-muted-foreground">
                                  {matches.join(', ')}
                                </p>
                              );
                            })()}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </button>
                        {/* Separator - iOS style (inset) */}
                        {index < filteredCategories.length - 1 && (
                          <div className="ios-list-row-inset-sep" />
                        )}
                      </div>
                    ))}
                    </div>
                  </div>

                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-[15px]">Aucun paramètre trouvé</p>
                    </div>
                  )}

                  {user && (
                    <div className="box-border w-full min-w-0 max-w-full px-4 ios-shell:px-2">
                      <div className="ios-card overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowProfileShare(true)}
                          className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary/60 ios-shell:px-2.5"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                            <Share2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-foreground">Partager mon profil</p>
                            <p className="text-[13px] text-muted-foreground">Story, lien, modèles…</p>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              </IosFixedPageHeaderShell>
            </motion.div>
          ) : (
            <motion.div
              key={currentPage}
              className="relative flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-background"
            >
              {renderPage()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
    <ProfileShareScreen open={showProfileShare} onClose={() => setShowProfileShare(false)} />
    </>
  );
};
