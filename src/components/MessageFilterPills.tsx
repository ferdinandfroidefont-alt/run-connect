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
    <div className="px-4 mt-6">
      <div className="glass-premium shadow-2xl rounded-2xl p-2">
        <div className="relative">
          {/* Effet lumineux subtil au fond */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
          
          <div className="grid grid-cols-4 gap-1">
            {filters.map((filter, index) => {
              const isActive = activeFilter === filter.id;
              const Icon = filter.icon;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => navigate(filter.path)}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  className={`
                    flex flex-col justify-start items-center gap-1 px-3 py-2 rounded-xl instant-button h-full transition-all duration-300 animate-scale-in
                    ${isActive 
                      ? 'text-primary bg-primary/20 shadow-glow scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5 hover:scale-105'
                    }
                  `}
                >
                  <span className="text-xl mt-1">
                    {Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : filter.svgPath ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d={filter.svgPath} />
                      </svg>
                    ) : null}
                  </span>
                  <span className="text-xs font-medium mt-1">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
