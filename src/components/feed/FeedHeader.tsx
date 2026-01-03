import { Search, Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface FeedHeaderProps {
  onSearch?: () => void;
}

export const FeedHeader = ({ onSearch }: FeedHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string | null }>({ 
    avatar_url: null, 
    username: null 
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('user_id', user.id)
        .single();
      
      if (data) setProfile(data);
    };

    fetchProfile();
  }, [user]);

  return (
    <header className="sticky top-0 z-20 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        {/* Avatar */}
        <button 
          onClick={() => navigate('/profile')}
          className="active:opacity-70 transition-opacity w-16"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
              {profile.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Title - Centered */}
        <h1 className="text-[17px] font-semibold text-foreground">
          Feed
        </h1>

        {/* Actions */}
        <div className="flex items-center justify-end w-16">
          <button
            onClick={onSearch}
            className="h-9 w-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors"
          >
            <Search className="h-[22px] w-[22px] text-primary" />
          </button>
        </div>
      </div>
    </header>
  );
};