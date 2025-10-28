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
      <div className="flex gap-3 pb-1">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          
          return (
            <button
              key={filter.id}
              onClick={() => navigate(filter.path)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap text-sm font-medium
                text-white transition-all
                hover:scale-[1.02] active:scale-98
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30 shadow-[0_0_30px_rgba(61,139,242,0.5),0_8px_20px_rgba(0,0,0,0.4)]'
                  : 'glass-premium hover:shadow-[0_0_20px_rgba(61,139,242,0.2),0_8px_20px_rgba(0,0,0,0.4)]'
                }
              `}
              style={!isActive ? {
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)'
              } : undefined}
            >
              {Icon ? (
                <Icon className="h-4 w-4" />
              ) : filter.svgPath ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d={filter.svgPath} />
                </svg>
              ) : null}
              <span className="text-white/90">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
