import { lazy, Suspense, useState, useEffect } from "react";
import { ProfileSharePanel } from "@/components/profile-share/ProfileSharePanel";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Bell,
  Link2,
  Shield,
  HelpCircle,
  Loader2,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { resetBodyInteractionLocks } from "@/lib/bodyInteractionLocks";
import {
  TUTORIAL_REPLAY_DEFINITIONS,
  requestTutorialReplay,
  notifyTutorialReplayQueued,
  type TutorialReplayId,
} from "@/lib/tutorials/registry";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { Group, Cell } from "@/components/apple";
import { ChevronGlyph } from "@/components/apple/ChevronGlyph";

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
    iconBg: '#8E8E93',
    searchItems: ['Langue', 'Thème', 'Mode sombre', 'Mode clair', 'Système', 'Apparence', 'Unités de distance', 'Kilomètres', 'Miles', 'Mot de passe', 'Carte', 'Appui long'],
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Push, alertes, préférences',
    icon: Bell,
    iconBg: '#FF3B30',
    searchItems: ['Push', 'Alertes', 'Messages', 'Sessions', 'Amis', 'Invitation club', 'Présence confirmée', 'Demande de suivi', 'Coaching'],
  },
  {
    id: 'connections' as const,
    title: 'Connexions',
    description: 'Strava, Instagram, partage',
    icon: Link2,
    iconBg: '#007AFF',
    searchItems: ['Strava', 'Instagram', 'Synchronisation', 'Import activités', 'Réseau social', 'Partage'],
  },
  {
    id: 'privacy' as const,
    title: 'Confidentialité',
    description: 'RGPD, sécurité, données',
    icon: Shield,
    iconBg: '#34C759',
    searchItems: ['RGPD', 'Sécurité', 'Données', 'Profil privé', 'Visibilité', 'Bloquer', 'Signaler', 'Supprimer compte', 'Export données'],
  },
  {
    id: 'support' as const,
    title: 'Aide & Support',
    description: 'Contact, tutoriels, documents, compte',
    icon: HelpCircle,
    iconBg: '#FF9500',
    searchItems: ['Contact', 'Tutoriel', 'Guide', 'FAQ', 'Bug', 'Signaler problème', 'Feedback', 'Version', 'À propos', 'Mentions légales', 'Conditions', 'Déconnexion', 'Supprimer compte'],
  },
];

/** Returns matching searchItems for a category given a query */
function getMatchingItems(items: string[], query: string): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return items.filter(item => item.toLowerCase().includes(q));
}

const SETTINGS_BOTTOM_NAV_SUPPRESSOR_ID = "settings-dialog";

export const SettingsDialog = ({ open, onOpenChange, initialSearch, initialPage }: SettingsDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { setBottomNavSuppressed } = useAppContext();
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

  useEffect(() => {
    setBottomNavSuppressed(SETTINGS_BOTTOM_NAV_SUPPRESSOR_ID, open);
    return () => setBottomNavSuppressed(SETTINGS_BOTTOM_NAV_SUPPRESSOR_ID, false);
  }, [open, setBottomNavSuppressed]);

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
        className="fixed inset-0 left-0 right-0 top-0 z-[125] mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:z-[125] sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-lg sm:border"
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
                  // Refonte Apple Settings.app (mockup 20) :
                  // - bar 44h avec "Retour" bleu à gauche
                  // - large title 34px bold
                  // - SearchBar iOS pill (apple-search)
                  <div className="min-w-0 max-w-full bg-secondary">
                    <div className="flex h-11 items-center justify-between px-4 pt-[var(--safe-area-top)]">
                      <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="flex items-center gap-1 text-[17px] text-primary active:opacity-60"
                      >
                        <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
                        <span>Retour</span>
                      </button>
                      <div className="min-w-[60px]" />
                    </div>
                    <div className="px-4 pt-1 pb-3">
                      <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.5px] text-foreground">
                        Réglages
                      </h1>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="apple-search">
                        <Search className="h-3.5 w-3.5 shrink-0" />
                        <input
                          type="search"
                          placeholder="Rechercher"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-[17px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                }
              >
              <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
                <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
                  {userProfile ? (
                    <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenChange(false);
                          navigate("/profile");
                        }}
                        className="flex w-full min-w-0 items-center gap-3.5 rounded-[14px] border border-border/60 bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors active:bg-muted/40"
                      >
                        <Avatar className="h-[60px] w-[60px] shrink-0">
                          <AvatarImage src={userProfile.avatar_url || undefined} alt="" />
                          <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                            {(userProfile.display_name?.[0] || userProfile.username?.[0] || user?.email?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-display truncate text-[19px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                            {userProfile.display_name || userProfile.username || "Compte"}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            Compte
                            {userProfile.is_premium ? " · Premium" : ""}
                          </p>
                        </div>
                        <ChevronGlyph className="apple-cell-chevron shrink-0" />
                      </button>
                    </div>
                  ) : null}

                  <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
                    <Group inset={false} className="mb-0 shadow-[var(--shadow-card)]">
                      {filteredCategories.map((category, index) => {
                        const matches = searchQuery.trim()
                          ? getMatchingItems(category.searchItems, searchQuery)
                          : [];
                        const subtitle = matches.length > 0 ? matches.join(", ") : undefined;
                        return (
                          <Cell
                            key={category.id}
                            icon={
                              <category.icon className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                            }
                            iconBg={category.iconBg}
                            title={category.title}
                            subtitle={subtitle}
                            last={index === filteredCategories.length - 1}
                            onClick={() => setCurrentPage(category.id)}
                          />
                        );
                      })}
                    </Group>
                  </div>

                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-[15px]">Aucun paramètre trouvé</p>
                    </div>
                  )}

                  <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                      <ProfileSharePanel active compact />
                    </div>
                  </div>

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
    </>
  );
};
