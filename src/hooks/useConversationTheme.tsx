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

  // Get theme classes for conversation background
  const getThemeClasses = () => {
    const themes: Record<string, { background: string; ownMessage: string; otherMessage: string }> = {
      default: {
        background: 'bg-background',
        ownMessage: 'bg-primary text-primary-foreground',
        otherMessage: 'bg-muted'
      },
      ocean: {
        background: 'bg-gradient-to-b from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
        ownMessage: 'bg-blue-600 text-white hover:bg-blue-700',
        otherMessage: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
      },
      sunset: {
        background: 'bg-gradient-to-br from-orange-50 via-pink-50 to-red-50 dark:from-orange-950/20 dark:via-pink-950/20 dark:to-red-950/20',
        ownMessage: 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600',
        otherMessage: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100'
      },
      forest: {
        background: 'bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
        ownMessage: 'bg-green-600 text-white hover:bg-green-700',
        otherMessage: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100'
      },
      night: {
        background: 'bg-gradient-to-b from-slate-900 to-slate-800',
        ownMessage: 'bg-purple-600 text-white hover:bg-purple-700',
        otherMessage: 'bg-slate-700 text-slate-100 hover:bg-slate-600'
      },
      runner: {
        background: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:to-red-950/20',
        ownMessage: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600',
        otherMessage: 'bg-yellow-100 text-orange-900 dark:bg-yellow-900/30 dark:text-orange-100'
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