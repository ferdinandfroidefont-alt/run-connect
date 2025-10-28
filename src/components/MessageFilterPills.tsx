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
    <div className="px-4 py-3">
      <div className="flex gap-2">
        {filters.map((filter, index) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          
          return (
            <button
              key={filter.id}
              onClick={() => navigate(filter.path)}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                ...(isActive ? {
                  background: 'rgba(61, 139, 242, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(61, 139, 242, 0.3)'
                } : {
                  background: 'rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
                })
              }}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl whitespace-nowrap
                transition-all duration-300 ease-out
                hover:scale-[1.02] active:scale-[0.98]
                animate-scale-in
                ${isActive 
                  ? 'text-white font-semibold' 
                  : 'text-white/70 font-medium'
                }
              `}
            >
              {Icon ? (
                <Icon className="h-4 w-4" />
              ) : filter.svgPath ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d={filter.svgPath} />
                </svg>
              ) : null}
              <span className="text-xs">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
