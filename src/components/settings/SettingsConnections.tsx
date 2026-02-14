import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link2, Users, Share2, Palette, Gift, ChevronRight, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StravaConnect } from "@/components/StravaConnect";
import { InstagramConnect } from "@/components/InstagramConnect";
import { ContactsPermissionButton } from "@/components/ContactsPermissionButton";
import { ConversationThemeSelector } from "@/components/ConversationThemeSelector";
import { QRShareDialog } from "@/components/QRShareDialog";
import { ReferralDialog } from "@/components/ReferralDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { useConversationTheme } from "@/hooks/useConversationTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  allow_friend_suggestions?: boolean;
  strava_connected?: boolean;
  instagram_connected?: boolean;
}

interface SettingsConnectionsProps {
  onBack: () => void;
  onNavigateToSubscription: () => void;
}

export const SettingsConnections = ({ onBack, onNavigateToSubscription }: SettingsConnectionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { shareProfile, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const { conversationTheme, setConversationTheme } = useConversationTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConversationThemes, setShowConversationThemes] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      
      toast({
        title: "Paramètres mis à jour",
        description: "Vos préférences ont été sauvegardées."
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
    }
  };

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-secondary"
    >
      {/* iOS Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-[56px]">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[17px] font-semibold">Connexions</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-pattern">
        <div className="py-6 space-y-6">
          {/* External Connections */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Connexions externes
            </h3>
            <div className="bg-card overflow-hidden p-4 space-y-4">
              <StravaConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
              <InstagramConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
            </div>
          </div>

          {/* Social & Sharing */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Social & Partage
            </h3>
            <div className="bg-card overflow-hidden">
              {/* Friend Suggestions */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                  <Users className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Suggestions d'amis</p>
                  <p className="text-[13px] text-muted-foreground">Autoriser les suggestions</p>
                </div>
                <Switch
                  checked={profile?.allow_friend_suggestions !== false}
                  onCheckedChange={(checked) => updatePrivacySettings('allow_friend_suggestions', checked)}
                />
              </div>

              <div className="h-px bg-border ml-[54px]" />

              {/* Share Profile */}
              <button 
                onClick={async () => {
                  if (profile) {
                    const { data: profileData } = await supabase
                      .from('profiles')
                      .select('referral_code, avatar_url')
                      .eq('user_id', user?.id)
                      .single();
                    
                    shareProfile({
                      username: profile.username,
                      displayName: profile.display_name,
                      bio: profile.bio,
                      avatarUrl: profileData?.avatar_url || profile.avatar_url,
                      referralCode: profileData?.referral_code
                    });
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
                  <Share2 className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Partager mon profil</p>
                  <p className="text-[13px] text-muted-foreground">QR code, Story Instagram...</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              {/* Contacts */}
              <div className="px-4 py-3">
                <ContactsPermissionButton />
              </div>

              <div className="h-px bg-border ml-[54px]" />

              {/* Conversation Themes */}
              <button 
                onClick={() => setShowConversationThemes(true)}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                  <Palette className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Thèmes de conversation</p>
                  <p className="text-[13px] text-muted-foreground">Personnaliser l'apparence</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              {/* Referral */}
              <button 
                onClick={() => setShowReferralDialog(true)}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                  <Gift className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Parrainage</p>
                  <p className="text-[13px] text-muted-foreground">Invitez vos amis</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              {/* Premium */}
              <button 
                onClick={onNavigateToSubscription}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FFCC00] flex items-center justify-center">
                  <Gift className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Soutenir l'application</p>
                  <p className="text-[13px] text-muted-foreground">Don ou abonnement premium</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <ReferralDialog 
        isOpen={showReferralDialog}
        onClose={() => setShowReferralDialog(false)}
      />

      <Dialog open={showConversationThemes} onOpenChange={setShowConversationThemes}>
        <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="text-center text-2xl font-bold">
              Thèmes de conversation
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <ConversationThemeSelector 
              currentTheme={conversationTheme}
              onThemeSelect={(themeId) => {
                setConversationTheme(themeId);
                setShowConversationThemes(false);
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {qrData && (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
        />
      )}
    </motion.div>
  );
};
