import { User, Users, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FilterType = 'users' | 'clubs' | 'strava' | 'contacts';

interface MessageFilterPillsProps {
  activeFilter?: FilterType;
}

export const MessageFilterPills = ({ activeFilter }: MessageFilterPillsProps) => {
  const navigate = useNavigate();

  const filters = [
    { id: 'users' as FilterType, label: 'Utilisateurs', icon: User, path: '/search?tab=profiles' },
    { id: 'clubs' as FilterType, label: 'Clubs', icon: Users, path: '/search?tab=clubs' },
    { 
      id: 'strava' as FilterType, 
      label: 'Strava', 
      icon: null,
      svgPath: "M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171",
      path: '/search?tab=strava'
    },
    { id: 'contacts' as FilterType, label: 'Contacts', icon: Phone, path: '/search?tab=contacts' },
  ];

  return (
    <div className="flex-shrink-0 px-4 py-3 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-1">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          
          return (
            <button
              key={filter.id}
              onClick={() => navigate(filter.path)}
              className={`
                px-4 py-2.5 rounded-2xl whitespace-nowrap text-sm font-medium
                backdrop-blur-xl border transition-all
                hover:scale-105 active:scale-95
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border-white/20 text-white shadow-[0_0_20px_rgba(61,139,242,0.4)]'
                  : 'bg-white/[0.07] border-white/[0.15] text-gray-400 shadow-[0_4px_15px_rgba(0,0,0,0.4)] hover:bg-white/10 hover:text-gray-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {Icon ? (
                  <Icon className="h-4 w-4" />
                ) : filter.svgPath ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d={filter.svgPath} />
                  </svg>
                ) : null}
                <span>{filter.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
