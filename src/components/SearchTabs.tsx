import { User, Users, ContactRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';

interface SearchTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const SearchTabs = ({ activeTab, onTabChange }: SearchTabsProps) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; gradient: string; shadow: string }[] = [
    { 
      id: 'profiles', 
      label: 'Profils', 
      icon: <User className="h-4 w-4" />,
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/30'
    },
    { 
      id: 'clubs', 
      label: 'Clubs', 
      icon: <Users className="h-4 w-4" />,
      gradient: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/30'
    },
    { 
      id: 'strava', 
      label: 'Strava', 
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
        </svg>
      ),
      gradient: 'from-orange-500 to-amber-500',
      shadow: 'shadow-orange-500/30'
    },
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: <ContactRound className="h-4 w-4" />,
      gradient: 'from-green-500 to-emerald-500',
      shadow: 'shadow-green-500/30'
    }
  ];

  return (
    <div className="glass-card mx-4 mt-3 p-1.5 rounded-full flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap",
            activeTab === tab.id
              ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg ${tab.shadow} scale-[1.02]`
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          {tab.icon}
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
