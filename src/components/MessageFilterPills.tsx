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
    <div className="sticky top-[72px] z-30 px-4 py-3 overflow-x-auto scrollbar-hide bg-background/80 backdrop-blur-xl">
      <div className="flex gap-3 min-w-max pb-1">
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
                  background: 'linear-gradient(135deg, rgba(61, 139, 242, 0.25) 0%, rgba(108, 99, 255, 0.2) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(61, 139, 242, 0.4)',
                  boxShadow: '0 0 40px rgba(61, 139, 242, 0.6), 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  textShadow: '0 0 20px rgba(61, 139, 242, 0.8)'
                } : {
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                })
              }}
              className={`
                flex items-center gap-2 px-8 py-4 rounded-2xl min-w-[140px] whitespace-nowrap
                transition-all duration-300 ease-out
                hover:scale-[1.03] active:scale-[0.98]
                animate-scale-in
                ${isActive 
                  ? 'text-white font-bold hover:shadow-[0_0_50px_rgba(61,139,242,0.7),0_8px_32px_rgba(0,0,0,0.5)]' 
                  : 'text-white/70 font-semibold hover:shadow-[0_0_30px_rgba(61,139,242,0.3),0_8px_32px_rgba(0,0,0,0.4)]'
                }
              `}
            >
              {Icon ? (
                <Icon className="h-5 w-5" />
              ) : filter.svgPath ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d={filter.svgPath} />
                </svg>
              ) : null}
              <span className="text-base">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
