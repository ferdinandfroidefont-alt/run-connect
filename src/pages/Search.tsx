import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search as SearchIcon, Users } from 'lucide-react';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { MainTopHeader } from '@/components/layout/MainTopHeader';
import { resetBodyInteractionLocks } from '@/lib/bodyInteractionLocks';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';
const SettingsDialog = lazy(() =>
  import('@/components/SettingsDialog').then((m) => ({ default: m.SettingsDialog }))
);

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'profiles';
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const q = searchParams.get('tab') as TabType | null;
    if (q === 'profiles' || q === 'clubs' || q === 'strava' || q === 'contacts') {
      setActiveTab(q);
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");

  // Placeholder adaptatif selon l'onglet actif
  const getPlaceholder = () => {
    switch (activeTab) {
      case 'profiles': return 'Rechercher un utilisateur...';
      case 'clubs': return 'Code du club ou laissez vide...';
      case 'strava': return 'Amis Strava connectés...';
      case 'contacts': return 'Rechercher dans vos contacts...';
    }
  };

  /**
   * Pas de verrou `body.style.overflow` : seul cas dans l’app ; sur iOS WebKit ça peut perturber
   * le viewport / les insets avec `position:fixed` + clavier. Le conteneur `fixed inset-0 overflow-hidden`
   * suffit à isoler le scroll.
   * À la sortie : même réinitialisation que le Layout pour éviter un état body/html incohérent.
   */
  useEffect(() => {
    return () => {
      resetBodyInteractionLocks();
    };
  }, []);

  // Focus automatique - délai plus long pour laisser le layout se stabiliser sur iOS
  useEffect(() => {
    const timer = setTimeout(() => {
      // Empêcher le scroll lors du focus
      inputRef.current?.focus({ preventScroll: true });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenSettings = (focus?: string) => {
    setSettingsFocus(focus || "");
    setShowSettingsDialog(true);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-white animate-slide-up"
      >
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="z-50 shrink-0 bg-card"
          header={
            <>
              <div className="pt-[var(--safe-area-top)]">
                <MainTopHeader
                  title="Messages"
                  tabsAriaLabel="Navigation messages"
                  tabs={[
                    { id: "conversations", label: "Conversations", active: false, onClick: () => navigate("/messages") },
                    { id: "search", label: "Recherche", active: true },
                    { id: "create-club", label: "Créer un club", active: false, onClick: () => navigate("/messages?tab=create-club") },
                  ]}
                  right={
                    <>
                      <button
                        type="button"
                        onClick={() => navigate("/messages?tab=create-club")}
                        className="flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[12px] border border-[#E5E5EA] bg-white text-[#1A1A1A] shadow-none transition-[opacity,transform] duration-200 active:scale-[0.97] active:opacity-80 dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:text-foreground"
                        aria-label="Créer un club"
                      >
                        <Users className="h-5 w-5" />
                      </button>
                      <Button
                        type="button"
                        onClick={() => navigate("/messages", { state: { openNewConversation: true } })}
                        size="sm"
                        variant="ghost"
                        className="flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[12px] border border-[#E5E5EA] bg-white text-[#1A1A1A] shadow-none transition-[opacity,transform] duration-200 active:scale-[0.97] active:opacity-80 dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:text-foreground"
                        aria-label="Nouvelle conversation"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </>
                  }
                />
              </div>
              <div className="border-b border-[#ECECEE] bg-card px-4 pb-3 pt-2.5 dark:border-[#1f1f1f]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSearchQuery(activeTab === "clubs" ? v.toUpperCase() : v);
                    }}
                    placeholder={getPlaceholder()}
                    className="h-[44px] rounded-ios-md border-0 bg-[#F1F5F9] pl-10 text-ios-subheadline"
                  />
                </div>
              </div>
              <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </>
          }
          scrollClassName="flex min-h-0 flex-col bg-white"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {activeTab === 'profiles' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <ProfilesTab searchQuery={searchQuery} />
              </div>
            )}
            {activeTab === 'clubs' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <ClubsTab searchQuery={searchQuery} />
              </div>
            )}
            {activeTab === 'strava' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <StravaTab searchQuery={searchQuery} onOpenSettings={handleOpenSettings} />
              </div>
            )}
            {activeTab === 'contacts' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <ContactsTab searchQuery={searchQuery} />
              </div>
            )}
          </div>
        </IosFixedPageHeaderShell>
      </div>

      {/* Settings Dialog */}
      <Suspense fallback={null}>
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          initialSearch={settingsFocus}
        />
      </Suspense>
    </>
  );
}