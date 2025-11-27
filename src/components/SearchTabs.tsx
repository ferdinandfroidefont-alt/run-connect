import { User, Users, ContactRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'profiles' | 'clubs' | 'strava' | 'contacts';

interface SearchTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const SearchTabs = ({ activeTab, onTabChange }: SearchTabsProps) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profiles', label: 'Profils', icon: <User className="h-4 w-4" /> },
    { id: 'clubs', label: 'Clubs', icon: <Users className="h-4 w-4" /> },
    { 
      id: 'strava', 
      label: 'Strava', 
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
        </svg>
      )
    },
    { id: 'contacts', label: 'Contacts', icon: <ContactRound className="h-4 w-4" /> }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 mx-4 mt-3 p-1 rounded-xl flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl transition-all whitespace-nowrap",
            activeTab === tab.id
              ? "bg-primary/80 text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10"
          )}
        >
          {tab.icon}
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
