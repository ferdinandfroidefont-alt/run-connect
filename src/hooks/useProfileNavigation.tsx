import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const useProfileNavigation = () => {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  const navigateToProfile = (userId: string) => {
    console.log('🔍 navigateToProfile called with userId:', userId);
    console.log('🔍 Current user ID:', user?.id);
    
    // Ne pas ouvrir le profil si c'est l'utilisateur actuel
    if (userId === user?.id) {
      console.log('🔍 Blocked: trying to view own profile');
      return;
    }
    
    console.log('🔍 Setting selectedUserId to:', userId);
    setSelectedUserId(userId);
    console.log('🔍 Setting showProfilePreview to true');
    setShowProfilePreview(true);
  };

  const closeProfilePreview = () => {
    setShowProfilePreview(false);
    setSelectedUserId(null);
  };

  return {
    selectedUserId,
    showProfilePreview,
    navigateToProfile,
    closeProfilePreview
  };
};