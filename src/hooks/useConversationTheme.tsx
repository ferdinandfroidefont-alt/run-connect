import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useConversationTheme = () => {
  const { user, subscriptionInfo } = useAuth();
  const [conversationTheme, setConversationTheme] = useState('default');

  // Load theme from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    const savedTheme = localStorage.getItem(`conversation-theme-${user.id}`);
    if (savedTheme) {
      setConversationTheme(savedTheme);
    }
  }, [user]);

  // Save theme to localStorage when it changes
  const saveTheme = (themeId: string) => {
    if (!user) return;
    
    // Reset to default if user is not premium and trying to set premium theme
    const premiumThemes = ['ocean', 'sunset', 'forest', 'night', 'runner'];
    if (premiumThemes.includes(themeId) && !subscriptionInfo?.subscribed) {
      themeId = 'default';
    }
    
    setConversationTheme(themeId);
    localStorage.setItem(`conversation-theme-${user.id}`, themeId);
  };

  // Get theme classes for conversation background - iMessage style
  const getThemeClasses = () => {
    const themes: Record<string, { background: string; ownMessage: string; otherMessage: string }> = {
      default: {
        background: 'bg-secondary',
        ownMessage: 'bg-[#10B981] text-white',
        otherMessage: 'bg-[#E5E5EA] text-black dark:bg-[#38383A] dark:text-white'
      },
      ocean: {
        background: 'bg-secondary',
        ownMessage: 'bg-blue-600 text-white',
        otherMessage: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100'
      },
      sunset: {
        background: 'bg-secondary',
        ownMessage: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
        otherMessage: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100'
      },
      forest: {
        background: 'bg-secondary',
        ownMessage: 'bg-green-600 text-white',
        otherMessage: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100'
      },
      night: {
        background: 'bg-secondary',
        ownMessage: 'bg-purple-600 text-white',
        otherMessage: 'bg-slate-700 text-slate-100'
      },
      runner: {
        background: 'bg-secondary',
        ownMessage: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
        otherMessage: 'bg-yellow-100 text-orange-900 dark:bg-yellow-900/40 dark:text-orange-100'
      }
    };

    return themes[conversationTheme] || themes.default;
  };

  // Check if current theme is premium
  const isPremiumTheme = () => {
    const premiumThemes = ['ocean', 'sunset', 'forest', 'night', 'runner'];
    return premiumThemes.includes(conversationTheme);
  };

  return {
    conversationTheme,
    setConversationTheme: saveTheme,
    getThemeClasses,
    isPremiumTheme: isPremiumTheme()
  };
};