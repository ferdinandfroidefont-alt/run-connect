import { Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';

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
    <header className="sticky top-0 z-20 bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar & Welcome */}
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-10 w-10 cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-secondary text-foreground">
              {profile.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[12px] text-muted-foreground">Bienvenue</p>
            <p className="font-semibold text-[15px]">@{profile.username || 'user'}</p>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[17px] font-semibold">
          Feed
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={onSearch}
          >
            <Search className="h-5 w-5" />
          </Button>
          <NotificationCenter />
        </div>
      </div>

      {/* iOS-style hairline separator */}
      <div className="h-px bg-border" />
    </header>
  );
};
