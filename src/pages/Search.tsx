import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';
import { Input } from '@/components/ui/input';

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

  // Désactiver le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Couleurs iOS Status Bar + WKWebView background
  useEffect(() => {
    document.documentElement.style.setProperty('--ios-top-color', '#FFFFFF');
    document.documentElement.style.backgroundColor = '#FFFFFF';
    document.body.style.backgroundColor = '#FFFFFF';
    return () => {
      document.documentElement.style.removeProperty('--ios-top-color');
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
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
        {/* Header iOS style with safe area */}
        <header className="shrink-0 border-b border-border bg-card px-ios-4 pb-ios-3 pt-ios-4">
          <div className="relative flex items-center justify-center min-h-[44px]">
            {/* Bouton retour */}
            <button
              onClick={handleClose}
              className="absolute left-0 flex items-center gap-ios-1 text-primary active:opacity-70"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="text-ios-headline">Retour</span>
            </button>

            {/* Titre centré */}
            <h1 className="text-ios-headline font-semibold">Rechercher</h1>
          </div>

          {/* Champ de recherche */}
          <div className="mt-ios-3 relative">
            <SearchIcon className="absolute left-ios-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getPlaceholder()}
              className="pl-ios-6 bg-secondary border-0 h-[44px] rounded-ios-md text-ios-subheadline"
            />
          </div>
        </header>

        {/* Onglets segmentés */}
        <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Zone scrollable des résultats */}
        <div className="ios-scroll-region flex flex-col bg-secondary">
          {activeTab === 'profiles' && (
            <div className="flex-1 flex flex-col min-h-0"><ProfilesTab searchQuery={searchQuery} /></div>
          )}
          {activeTab === 'clubs' && (
            <div className="flex-1 flex flex-col"><ClubsTab searchQuery={searchQuery} /></div>
          )}
          {activeTab === 'strava' && (
            <div className="flex-1 flex flex-col">
              <StravaTab 
                searchQuery={searchQuery} 
                onOpenSettings={handleOpenSettings}
              />
            </div>
          )}
          {activeTab === 'contacts' && (
            <div className="flex-1 flex flex-col"><ContactsTab searchQuery={searchQuery} /></div>
          )}
        </div>
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