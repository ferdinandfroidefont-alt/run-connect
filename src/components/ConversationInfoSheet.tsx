import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { OnlineStatus } from '@/components/OnlineStatus';
import { 
  Bell, BellOff, Pin, Trash2, User, Image as ImageIcon, 
  FileText, Link2, ChevronRight, Search, ArrowLeft, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ConversationInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    is_group: boolean;
    group_name?: string;
    group_avatar_url?: string;
    other_participant?: Profile;
    created_by?: string;
    updated_at: string;
  } | null;
  isMuted: boolean;
  onToggleMute: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
  notificationsEnabled: boolean;
  onGoToNotifSettings: () => void;
}

export const ConversationInfoSheet: React.FC<ConversationInfoSheetProps> = ({
  isOpen,
  onClose,
  conversation,
  isMuted,
  onToggleMute,
  isPinned,
  onTogglePin,
  onDelete,
  notificationsEnabled,
  onGoToNotifSettings,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [mediaCount, setMediaCount] = useState(0);

  useEffect(() => {
    if (isOpen && conversation) {
      fetchSharedMedia();
    }
  }, [isOpen, conversation?.id]);

  const fetchSharedMedia = async () => {
    if (!conversation) return;
    try {
      const { data, count } = await supabase
        .from('messages')
        .select('id, file_url, file_type, file_name, created_at', { count: 'exact' })
        .eq('conversation_id', conversation.id)
        .not('file_url', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(6);
      
      setSharedMedia(data || []);
      setMediaCount(count || 0);
    } catch (e) {
      console.error('Error fetching shared media:', e);
    }
  };

  const isDirectMessage = conversation ? !conversation.is_group : true;
  const displayName = conversation
    ? (isDirectMessage 
      ? (conversation.other_participant?.username || conversation.other_participant?.display_name || 'Utilisateur')
      : (conversation.group_name || 'Groupe'))
    : '';

  const avatarUrl = conversation
    ? (isDirectMessage
      ? conversation.other_participant?.avatar_url
      : conversation.group_avatar_url)
    : null;

  const handleNotifToggle = () => {
    if (!notificationsEnabled) {
      onGoToNotifSettings();
      onClose();
      return;
    }
    onToggleMute();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-secondary border-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center px-4 h-[56px]">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="flex-1 text-center text-[17px] font-semibold">Détails</SheetTitle>
            <div className="w-9" />
          </div>
        </div>

        <ScrollArea className="h-[calc(100dvh-56px)]">
          <div className="py-6 space-y-6">
            {/* Profile Card */}
            <div className="flex flex-col items-center px-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || ''} />
                  <AvatarFallback className="bg-border text-muted-foreground text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isDirectMessage && conversation.other_participant && (
                  <OnlineStatus userId={conversation.other_participant.user_id} className="w-3.5 h-3.5 border-2 border-card" />
                )}
              </div>
              <h2 className="text-[20px] font-bold mt-3">{displayName}</h2>
              {isDirectMessage && conversation.other_participant?.username && (
                <p className="text-[14px] text-muted-foreground">@{conversation.other_participant.username}</p>
              )}
              
              {isDirectMessage && (
                <Button 
                  variant="tinted" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => {
                    navigate(`/profile?user=${conversation.other_participant?.user_id}`);
                    onClose();
                  }}
                >
                  <User className="h-4 w-4 mr-1" />
                  Voir le profil
                </Button>
              )}
            </div>

            {/* Quick Settings */}
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Réglages
              </h3>
              <div className="bg-card overflow-hidden">
                {/* Notifications */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-[30px] w-[30px] rounded-[7px] flex items-center justify-center ${isMuted || !notificationsEnabled ? 'bg-muted' : 'bg-[#FF3B30]'}`}>
                    {isMuted || !notificationsEnabled 
                      ? <BellOff className="h-[18px] w-[18px] text-muted-foreground" />
                      : <Bell className="h-[18px] w-[18px] text-white" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">Notifications</p>
                    {!notificationsEnabled && (
                      <p className="text-[12px] text-orange-500">Activez d'abord dans les paramètres</p>
                    )}
                  </div>
                  {notificationsEnabled ? (
                    <Switch
                      checked={!isMuted}
                      onCheckedChange={handleNotifToggle}
                    />
                  ) : (
                    <button onClick={handleNotifToggle} className="text-primary text-[14px] font-medium">
                      Activer
                    </button>
                  )}
                </div>

                <div className="h-px bg-border ml-[54px]" />

                {/* Pin */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-[30px] w-[30px] rounded-[7px] flex items-center justify-center ${isPinned ? 'bg-primary' : 'bg-muted'}`}>
                    <Pin className={`h-[18px] w-[18px] ${isPinned ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">Épingler</p>
                  </div>
                  <Switch
                    checked={isPinned}
                    onCheckedChange={onTogglePin}
                  />
                </div>
              </div>
            </div>

            {/* Shared Media */}
            <div className="space-y-1">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Médias partagés ({mediaCount})
              </h3>
              <div className="bg-card overflow-hidden">
                {sharedMedia.length > 0 ? (
                  <div className="grid grid-cols-3 gap-px p-1">
                    {sharedMedia.map((media) => (
                      <div key={media.id} className="aspect-square bg-secondary rounded-lg overflow-hidden">
                        {media.file_type?.startsWith('image') ? (
                          <img 
                            src={media.file_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <FileText className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-[10px] text-muted-foreground text-center line-clamp-2">
                              {media.file_name || 'Fichier'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-[14px] text-muted-foreground">Aucun média partagé</p>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="px-4 pt-4">
              <button 
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full text-center text-destructive text-[15px] py-3"
              >
                Supprimer la conversation
              </button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
