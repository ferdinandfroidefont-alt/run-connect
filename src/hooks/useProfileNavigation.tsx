import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const useProfileNavigation = () => {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  const navigateToProfile = (userId: string) => {
    // Ne pas ouvrir le profil si c'est l'utilisateur actuel
    if (userId === user?.id) return;
    
    setSelectedUserId(userId);
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