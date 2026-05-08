import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CoachingFullscreenHeader } from "@/components/coaching/CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { Search, User, UserPlus, UserCheck, Lock, Loader2 } from "lucide-react";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
}

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId?: string;
  /** Ouvrir depuis une autre modale plein écran (z-index + voile au-dessus). */
  stackNested?: boolean;
  onMemberInvited?: (userId: string) => void;
}

export const InviteMembersDialog = ({
  open,
  onOpenChange,
  clubId,
  stackNested = false,
  onMemberInvited,
}: InviteMembersDialogProps) => {
  const { user } = useAuth();
  const { sendPushNotification } = useSendNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviteStates, setInviteStates] = useState<{ [key: string]: boolean }>({});

  const searchUsers = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);

      const { data: searchData, error: searchError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio, is_private")
        .neq("user_id", user?.id ?? "")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq("is_private", false)
        .limit(20);

      if (searchError) throw searchError;

      let filteredUsers = searchData || [];
      if (clubId) {
        const { data: membersData } = await supabase.from("group_members").select("user_id").eq("conversation_id", clubId);

        const existingMemberIds = membersData?.map((m) => m.user_id) || [];
        filteredUsers = filteredUsers.filter((u) => !existingMemberIds.includes(u.user_id));
      }

      setSearchResults(filteredUsers);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de rechercher des utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.id, clubId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => void searchUsers(), 300);
    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setInvitedUsers(new Set());
    }
  }, [open]);

  const inviteUser = async (profile: Profile) => {
    if (!user || !clubId) return;

    setInviteStates((prev) => ({ ...prev, [profile.user_id]: true }));

    try {
      const { error } = await supabase.from("club_invitations").insert({
        club_id: clubId,
        inviter_id: user.id,
        invited_user_id: profile.user_id,
        status: "pending",
      });

      if (error?.code === "23505") {
        toast({ title: "Déjà invité" });
        return;
      }
      if (error) throw error;

      const { data: clubData } = await supabase.from("conversations").select("group_name").eq("id", clubId).single();

      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (clubData && inviterProfile) {
        await sendPushNotification(
          profile.user_id,
          "Invitation à rejoindre un club",
          `${inviterProfile.display_name || inviterProfile.username} vous invite à rejoindre le club "${clubData.group_name || "Club"}"`,
          "club_invitation",
          {
            club_id: clubId,
            inviter_id: user.id,
            inviter_name: inviterProfile.display_name || inviterProfile.username,
            inviter_avatar: inviterProfile.avatar_url,
            club_name: clubData.group_name,
          }
        );
      }

      setInvitedUsers((prev) => new Set(prev).add(profile.user_id));
      onMemberInvited?.(profile.user_id);

      toast({
        title: "Invitation envoyée",
        description: `Invitation envoyée à ${profile.display_name || profile.username}`,
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    } finally {
      setInviteStates((prev) => ({ ...prev, [profile.user_id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreen
        hideCloseButton
        stackNested={stackNested}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Inviter des membres</DialogTitle>
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          contentTopOffsetPx={0}
          headerWrapperClassName="shrink-0"
          header={
            <>
              <div
                className="bg-white dark:bg-card"
                style={{ height: "max(env(safe-area-inset-top, 0px), 12px)" }}
                aria-hidden="true"
              />
              <CoachingFullscreenHeader title="Inviter des membres" onBack={() => onOpenChange(false)} />
            </>
          }
          scrollClassName="bg-secondary px-ios-4 pb-8"
        >
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher des utilisateurs à inviter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="mt-4 space-y-2 pb-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Recherche en cours…</span>
              </div>
            )}

            {!loading && searchResults.length === 0 && searchQuery && (
              <div className="py-12 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé</p>
                <p className="mt-1 text-xs text-muted-foreground">Essayez avec un autre terme de recherche</p>
              </div>
            )}

            {!loading && searchQuery === "" && (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Commencez à taper pour rechercher des utilisateurs</p>
              </div>
            )}

            {!loading &&
              searchResults.map((profile, index) => {
                const isInvited = invitedUsers.has(profile.user_id);
                const isInviting = inviteStates[profile.user_id];

                return (
                  <div
                    key={profile.user_id}
                    className="flex min-w-0 items-center gap-3 rounded-ios-lg border border-border bg-card p-3 transition-colors active:bg-secondary/80"
                    style={{
                      animationDelay: `${index * 40}ms`,
                      animation: "fadeInUp 0.3s ease-out forwards",
                    }}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback className="text-sm font-semibold">
                          {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineStatus userId={profile.user_id} className="h-3 w-3" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{profile.display_name || profile.username}</p>
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                        {profile.is_private && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      </div>
                      {profile.bio && (
                        <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">{profile.bio}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isInvited ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                          <UserCheck className="mr-1 h-3 w-3" />
                          Invité
                        </Badge>
                      ) : (
                        <Button onClick={() => void inviteUser(profile)} disabled={isInviting} size="sm" className="h-8 px-3">
                          {isInviting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-3 w-3" />
                              Inviter
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
