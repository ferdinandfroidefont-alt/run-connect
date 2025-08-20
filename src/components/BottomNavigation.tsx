import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
const navItems = [{
  path: '/',
  emoji: '🗺️',
  label: 'Carte'
}, {
  path: '/my-sessions',
  emoji: '⚽',
  label: 'Mes Séances'
}, {
  path: '/messages',
  emoji: '💬',
  label: 'Messages'
}, {
  path: '/leaderboard',
  emoji: '🏆',
  label: 'Classement'
}];
export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    openCreateSession
  } = useAppContext();
  return <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.slice(0, 2).map(({
        path,
        emoji,
        label
      }) => {
        const isActive = location.pathname === path;
        return <button key={path} onClick={() => navigate(path)} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors", isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>;
      })}
        
        {/* Bouton Créer au centre */}
        <button onClick={() => {
        if (location.pathname === '/') {
          openCreateSession();
        } else {
          navigate('/');
          setTimeout(() => openCreateSession(), 100);
        }
      }} className="flex flex-col items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-full transition-all hover:bg-primary/90 shadow-lg">
          <Plus size={24} />
          <span className="text-xs font-medium">CRÉER</span>
        </button>

        {navItems.slice(2).map(({
        path,
        emoji,
        label
      }) => {
        const isActive = location.pathname === path;
        return <button key={path} onClick={() => navigate(path)} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors", isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>;
      })}
      </div>
    </nav>;
};