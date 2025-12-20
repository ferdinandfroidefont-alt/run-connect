import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchHeader } from '@/components/SearchHeader';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';
import { SettingsDialog } from '@/components/SettingsDialog';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'profiles';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 100) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => navigate(-1), 250);
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'profiles': return 'Rechercher un utilisateur...';
      case 'clubs': return 'Code du club ou laissez vide...';
      case 'strava': return 'Amis Strava connectés...';
      case 'contacts': return 'Rechercher dans vos contacts...';
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleOpenSettings = (focus?: string) => {
    setSettingsFocus(focus || "");
    setShowSettingsDialog(true);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-[60] bg-background ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="h-full flex flex-col">
          <SearchHeader
            onBack={handleClose}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={getPlaceholder()}
          />

          <SearchTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 overflow-y-auto px-4 pb-4">
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
      </div>

      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        initialSearch={settingsFocus}
      />
    </>
  );
}
