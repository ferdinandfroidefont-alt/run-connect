import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';
import { Input } from '@/components/ui/input';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
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
  const [isClosing, setIsClosing] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => navigate(-1), 250);
  };

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
        className={`fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-secondary ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
      >
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={
            <>
              <header className="shrink-0 border-b border-border bg-card px-ios-4 pb-ios-3 pt-ios-4">
                <IosPageHeaderBar
                  className="px-0 py-0 min-h-[44px]"
                  titleClassName="text-ios-headline"
                  left={
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex min-w-0 items-center gap-ios-1 text-primary active:opacity-70"
                    >
                      <ChevronLeft className="h-6 w-6 shrink-0" />
                      <span className="truncate text-ios-headline">Retour</span>
                    </button>
                  }
                title="Rechercher"
                />
                <div className="relative mt-ios-3">
                  <SearchIcon className="absolute left-ios-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSearchQuery(activeTab === "clubs" ? v.toUpperCase() : v);
                    }}
                    placeholder={getPlaceholder()}
                    className="h-[44px] rounded-ios-md border-0 bg-secondary pl-ios-6 text-ios-subheadline"
                  />
                </div>
              </header>
              <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </>
          }
          scrollClassName="flex min-h-0 flex-col bg-secondary"
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