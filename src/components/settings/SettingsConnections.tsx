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
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/50"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Connexions</h2>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {/* External connections */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Connexions externes
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
              <div className="p-4 space-y-6">
                <StravaConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
                <InstagramConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
              </div>
            </div>
          </div>

          {/* Social & sharing */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Social & Partage
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
              {/* Friend Suggestions */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Suggestions d'amis</label>
                    <p className="text-xs text-muted-foreground">Autoriser les suggestions</p>
                  </div>
                </div>
                <Switch
                  checked={profile?.allow_friend_suggestions !== false}
                  onCheckedChange={(checked) => updatePrivacySettings('allow_friend_suggestions', checked)}
                />
              </div>

              {/* Share Profile */}
              <div 
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
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
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                    <Share2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Partager mon profil</label>
                    <p className="text-xs text-muted-foreground">QR code, Story Instagram...</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Contacts */}
              <div className="p-4">
                <ContactsPermissionButton />
              </div>

              {/* Conversation Themes */}
              <div 
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setShowConversationThemes(true)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Thèmes de conversation</label>
                    <p className="text-xs text-muted-foreground">Personnaliser l'apparence</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Referral */}
              <div 
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setShowReferralDialog(true)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Parrainage</label>
                    <p className="text-xs text-muted-foreground">Invitez vos amis et gagnez du premium</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Premium */}
              <div 
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={onNavigateToSubscription}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Soutenir l'application</label>
                    <p className="text-xs text-muted-foreground">Don ou abonnement premium</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
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
