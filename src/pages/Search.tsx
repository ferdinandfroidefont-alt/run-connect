import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Input } from '@/components/ui/input';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';

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

  // Focus automatique
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleOpenSettings = (focus?: string) => {
    setSettingsFocus(focus || "");
    setShowSettingsDialog(true);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-[60] bg-secondary flex flex-col ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {/* Header iOS style */}
        <header className="bg-card border-b border-border px-4 pt-4 pb-3">
          <div className="relative flex items-center justify-center min-h-[44px]">
            {/* Bouton retour */}
            <button
              onClick={handleClose}
              className="absolute left-0 flex items-center gap-1 text-primary active:opacity-70"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="text-[17px]">Retour</span>
            </button>

            {/* Titre centré */}
            <h1 className="text-[17px] font-semibold">Rechercher</h1>
          </div>

          {/* Champ de recherche */}
          <div className="mt-3 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getPlaceholder()}
              className="pl-10 bg-secondary border-0 h-10 rounded-[10px]"
            />
          </div>
        </header>

        {/* Onglets segmentés */}
        <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Zone scrollable des résultats */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profiles' && (
            <ProfilesTab searchQuery={searchQuery} />
          )}
          {activeTab === 'clubs' && (
            <ClubsTab searchQuery={searchQuery} />
          )}
          {activeTab === 'strava' && (
            <StravaTab 
              searchQuery={searchQuery} 
              onOpenSettings={handleOpenSettings}
            />
          )}
          {activeTab === 'contacts' && (
            <ContactsTab searchQuery={searchQuery} />
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        initialSearch={settingsFocus}
      />
    </>
  );
}