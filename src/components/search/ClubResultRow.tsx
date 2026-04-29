import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ClubSearchHit } from "@/components/search/searchQueries";
import { useState } from "react";

export function ClubResultRow({ club }: { club: ClubSearchHit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isMember, setIsMember] = useState(club.is_member);

  const loc = club.location?.trim() || "";
  const sub = loc ? `Club • ${loc}` : "Club";

  const joinClub = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connecte-toi pour rejoindre un club.",
        variant: "destructive",
      });
      return;
    }
    if (isMember) {
      navigate(`/messages?conversation=${club.id}`);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("group_members").insert({
        conversation_id: club.id,
        user_id: user.id,
        is_admin: false,
      });
      if (error) throw error;
      setIsMember(true);
      toast({ title: "Club rejoint" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de rejoindre ce club.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/messages?conversation=${club.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/messages?conversation=${club.id}`);
        }
      }}
      className="flex min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40"
    >
      <Avatar className="h-12 w-12 shrink-0 rounded-ios-lg">
        <AvatarImage src={club.group_avatar_url || undefined} alt="" />
        <AvatarFallback className="rounded-ios-lg">
          <Users className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-foreground">{club.group_name}</p>
        <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{club.member_count} membres</p>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={loading}
        onClick={joinClub}
        variant={isMember ? "secondary" : "default"}
        className="h-9 shrink-0 rounded-lg px-4 text-[13px] font-semibold"
      >
        {isMember ? "Ouvrir" : "Suivre"}
      </Button>
    </div>
  );
}
