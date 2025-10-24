import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchHeader } from '@/components/SearchHeader';
import { SearchTabs } from '@/components/SearchTabs';
import { ProfilesTab } from '@/components/search/ProfilesTab';
import { ClubsTab } from '@/components/search/ClubsTab';
import { StravaTab } from '@/components/search/StravaTab';
import { ContactsTab } from '@/components/search/ContactsTab';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'profiles';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(0);

  // Gestion du swipe pour fermer
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    // Si swipe vers le bas de plus de 100px, fermer
    if (diff > 100) {
      handleClose();
    }
  };

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

  return (
    <div 
      className={`fixed inset-0 z-[60] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Fond glassmorphism */}
      <div className="absolute inset-0 glass-primary" />
      
      {/* Contenu */}
      <div className="relative h-full flex flex-col">
        {/* Header fixe */}
        <SearchHeader
          onBack={handleClose}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={getPlaceholder()}
        />

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
            <StravaTab searchQuery={searchQuery} />
          )}
          {activeTab === 'contacts' && (
            <ContactsTab searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </div>
  );
}
