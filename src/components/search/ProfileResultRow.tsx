import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ProfileSearchHit } from "@/components/search/searchQueries";
import { formatCompactFollowerCount } from "@/components/search/searchQueries";

type FollowStatus = "none" | "pending" | "accepted";

export function ProfileResultRow({ profile }: { profile: ProfileSearchHit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user?.id || user.id === profile.user_id) return;
    const { data, error } = await supabase
      .from("user_follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", profile.user_id)
      .maybeSingle();
    if (error || !data?.status) {
      setFollowStatus("none");
      return;
    }
    const st = data.status as string;
    if (st === "pending") setFollowStatus("pending");
    else if (st === "accepted") setFollowStatus("accepted");
    else setFollowStatus("none");
  }, [user?.id, profile.user_id]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const locationLine = profile.country_label ? `Athlète • ${profile.country_label}` : "Athlète";

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Connexion requise", description: "Connecte-toi pour suivre un profil.", variant: "destructive" });
      return;
    }
    if (user.id === profile.user_id) return;

    setLoading(true);
    try {
      if (followStatus === "accepted" || followStatus === "pending") {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.user_id);
        if (error) throw error;
        setFollowStatus("none");
        toast({ title: followStatus === "pending" ? "Demande annulée" : "Tu ne suis plus ce profil" });
      } else {
        const { error } = await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: profile.user_id,
          status: "accepted",
        });
        if (error) throw error;
        setFollowStatus("accepted");
        toast({ title: "Tu suis ce profil" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de modifier le suivi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const labelSuivre =
    followStatus === "accepted" ? "Suivi" : followStatus === "pending" ? "Demandé" : "Suivre";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/profile/${profile.user_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/profile/${profile.user_id}`);
        }
      }}
      className="flex min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40"
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={profile.avatar_url || undefined} alt="" />
        <AvatarFallback className="text-sm font-semibold">
          {profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[16px] font-semibold text-foreground">{profile.display_name}</span>
          {profile.is_premium && (
            <BadgeCheck className="h-4 w-4 shrink-0 fill-[#0066FF] text-white" aria-label="Vérifié" />
          )}
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{locationLine}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {formatCompactFollowerCount(profile.follower_count)} abonnés
        </p>
      </div>
      {user?.id !== profile.user_id && (
        <Button
          type="button"
          size="sm"
          disabled={loading}
          onClick={handleFollow}
          className={cn(
            "h-9 shrink-0 rounded-lg px-4 text-[13px] font-semibold",
            followStatus === "accepted" && "bg-secondary text-foreground hover:bg-secondary/90"
          )}
          variant={followStatus === "accepted" ? "secondary" : "default"}
        >
          {labelSuivre}
        </Button>
      )}
    </div>
  );
}
