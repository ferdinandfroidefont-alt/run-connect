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
        ownMessage: 'glass-card bg-primary/90 text-primary-foreground backdrop-blur-md shadow-lg border border-primary/20',
        otherMessage: 'glass-card bg-muted/80 backdrop-blur-md shadow-md border border-border/30'
      },
      ocean: {
        background: 'bg-gradient-to-b from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
        ownMessage: 'glass-card bg-blue-600/90 text-white backdrop-blur-md shadow-lg border border-blue-400/30 hover:bg-blue-600/95',
        otherMessage: 'glass-card bg-blue-100/80 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 backdrop-blur-md shadow-md border border-blue-200/30'
      },
      sunset: {
        background: 'bg-gradient-to-br from-orange-50 via-pink-50 to-red-50 dark:from-orange-950/20 dark:via-pink-950/20 dark:to-red-950/20',
        ownMessage: 'glass-card bg-gradient-to-r from-orange-500/90 to-red-500/90 text-white backdrop-blur-md shadow-lg border border-orange-400/30 hover:from-orange-600/95 hover:to-red-600/95',
        otherMessage: 'glass-card bg-orange-100/80 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100 backdrop-blur-md shadow-md border border-orange-200/30'
      },
      forest: {
        background: 'bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
        ownMessage: 'glass-card bg-green-600/90 text-white backdrop-blur-md shadow-lg border border-green-400/30 hover:bg-green-600/95',
        otherMessage: 'glass-card bg-green-100/80 text-green-900 dark:bg-green-900/40 dark:text-green-100 backdrop-blur-md shadow-md border border-green-200/30'
      },
      night: {
        background: 'bg-gradient-to-b from-slate-900 to-slate-800',
        ownMessage: 'glass-card bg-purple-600/90 text-white backdrop-blur-md shadow-lg border border-purple-400/30 hover:bg-purple-600/95',
        otherMessage: 'glass-card bg-slate-700/80 text-slate-100 backdrop-blur-md shadow-md border border-slate-600/30 hover:bg-slate-700/85'
      },
      runner: {
        background: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:to-red-950/20',
        ownMessage: 'glass-card bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white backdrop-blur-md shadow-lg border border-yellow-400/30 hover:from-yellow-600/95 hover:to-orange-600/95',
        otherMessage: 'glass-card bg-yellow-100/80 text-orange-900 dark:bg-yellow-900/40 dark:text-orange-100 backdrop-blur-md shadow-md border border-yellow-200/30'
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