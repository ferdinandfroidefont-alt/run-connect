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
  ChevronLeft,
  ChevronRight,
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
import { cn } from "@/lib/utils";

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
  /** Au-dessus d’un autre plein écran (ex. ProfileDialog) : z-index + voile empilés. */
  stackNested?: boolean;
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

const SETTINGS_BOTTOM_NAV_SUPPRESSOR_ID = "settings-dialog";

export const SettingsDialog = ({
  open,
  onOpenChange,
  initialSearch,
  initialPage,
  stackNested = false,
}: SettingsDialogProps) => {
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
        <DialogContent stackNested={stackNested} className="max-w-md max-h-[80vh] p-0">
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
        stackNested={stackNested}
        className={cn(
          "fixed inset-0 left-0 right-0 top-0 mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-lg sm:border",
          /* Avec stackNested, l’overlay est z-[130] : le contenu doit rester au même plan ou au-dessus (sinon le voile capte tous les touches). */
          stackNested ? "z-[130] sm:z-[130]" : "z-[125] sm:z-[125]"
        )}
      >
        <AnimatePresence mode="wait">
          {currentPage === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-[#F2F2F7]"
            >
              <IosFixedPageHeaderShell
                className="min-h-0 flex-1"
                headerWrapperClassName="shrink-0"
                contentScroll
                scrollClassName="min-h-0 bg-[#F2F2F7]"
                header={
                  <div className="min-w-0 max-w-full shrink-0 bg-[#F2F2F7] pb-0 [-webkit-font-smoothing:antialiased]">
                    <div className="px-5 pb-0 pt-[calc(var(--safe-area-top)+12px)]">
                      <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="-ml-0.5 mb-2 flex items-center gap-0 transition-opacity active:opacity-70"
                      >
                        <ChevronLeft className="h-6 w-6 shrink-0 text-[#007AFF]" strokeWidth={2.6} aria-hidden />
                        <span className="text-[17px] font-medium leading-none tracking-[-0.01em] text-[#007AFF]">
                          Retour
                        </span>
                      </button>
                      <h1 className="m-0 text-[44px] font-black leading-[1.05] tracking-[-0.03em] text-[#0A0F1F]">
                        Réglages
                      </h1>
                    </div>
                    <div className="mt-4 mb-4 px-5">
                      <label className="sr-only" htmlFor="settings-hub-search-input">
                        Rechercher dans les réglages
                      </label>
                      <div
                        className="flex items-center gap-2 rounded-[12px]"
                        style={{
                          background: "#E5E5EA",
                          padding: "10px 14px",
                        }}
                      >
                        <Search className="h-5 w-5 shrink-0 text-[#8E8E93]" strokeWidth={2.4} aria-hidden />
                        <input
                          id="settings-hub-search-input"
                          type="search"
                          placeholder="Rechercher"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-[16px] font-medium leading-snug tracking-normal text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]/70"
                        />
                      </div>
                    </div>
                  </div>
                }
              >
                <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
                  <div className="min-w-0 max-w-full overflow-x-hidden px-5 pb-[max(32px,env(safe-area-inset-bottom,0px))]">
                  {userProfile ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenChange(false);
                          navigate("/profile");
                        }}
                        className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors active:bg-[#F8F8F8]"
                        style={{
                          background: "white",
                          borderRadius: 16,
                          boxShadow:
                            "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                        }}
                      >
                        <Avatar className="h-14 w-14 shrink-0 rounded-full overflow-hidden">
                          <AvatarImage
                            src={userProfile.avatar_url || undefined}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                          <AvatarFallback
                            className="flex h-full w-full items-center justify-center rounded-full text-lg font-semibold text-white"
                            style={{
                              backgroundImage: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                              color: "#fff",
                            }}
                          >
                            {(userProfile.display_name?.[0] || userProfile.username?.[0] || user?.email?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-[20px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]">
                            {userProfile.display_name || userProfile.username || "Compte"}
                          </p>
                          <p className="m-0 mt-0.5 truncate text-[14px] text-[#8E8E93]">
                            Compte
                            {userProfile.is_premium ? " · Premium" : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden strokeWidth={2} />
                      </button>
                  ) : null}

                    <div
                      className="mt-5 overflow-hidden min-w-0"
                      style={{
                        background: "white",
                        borderRadius: 16,
                        boxShadow:
                          "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                      }}
                    >
                      {filteredCategories.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-[14px] text-[#8E8E93]">Aucun résultat</p>
                        </div>
                      ) : (
                        filteredCategories.map((category, index) => {
                          const Icon = category.icon;
                          return (
                            <div key={category.id}>
                              {index > 0 ? <div className="ml-[64px] h-px bg-[#E5E5EA]" aria-hidden /> : null}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(category.id)}
                                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-[#F8F8F8]"
                              >
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                                  style={{ backgroundColor: category.iconBg }}
                                >
                                  <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} aria-hidden />
                                </span>
                                <p className="m-0 flex-1 min-w-0 text-left text-[17px] font-bold tracking-[-0.01em] text-[#0A0F1F]" style={{ fontWeight: 700 }}>
                                  {category.title}
                                </p>
                                <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden strokeWidth={2} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {!searchQuery.trim() ? (
                      <div className="mt-6 min-w-0 max-w-full">
                        <ProfileSharePanel active compact />
                      </div>
                    ) : null}
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
