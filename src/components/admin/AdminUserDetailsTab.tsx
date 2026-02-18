import { useState, useEffect } from "react";
import { ChevronLeft, Loader2, Shield, Smartphone, Link2, Trophy, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserResult } from "../AdminPremiumManager";

export const AdminUserDetailsTab = ({
  selectedUser,
  onBack,
  invokeAdmin,
}: {
  selectedUser: UserResult | null;
  onBack: () => void;
  invokeAdmin: (body: Record<string, unknown>) => Promise<any>;
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedUser) loadDetails();
    else setDetails(null);
  }, [selectedUser]);

  const loadDetails = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: "get_user_details", target_user_id: selectedUser.user_id });
      setDetails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[14px] p-8">
        Sélectionnez un utilisateur ci-dessus
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!details) return null;

  const { auth, profile, subscriber, scores, stats, badges, sessionsCreated, sessionsJoined, followersCount, followingCount } = details;

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="flex justify-between py-1.5 border-b border-border/30">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] text-foreground font-medium truncate max-w-[55%] text-right">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-primary text-[14px]">
        <ChevronLeft className="h-4 w-4" /> Retour
      </button>

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={selectedUser.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {(selectedUser.display_name || selectedUser.username)?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[15px] font-semibold text-foreground">{selectedUser.display_name || selectedUser.username}</p>
          <p className="text-[12px] text-muted-foreground">@{selectedUser.username}</p>
        </div>
      </div>

      {/* Profil */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Profil</p>
        <InfoRow label="Email" value={auth?.email} />
        <InfoRow label="Inscrit le" value={auth?.created_at ? new Date(auth.created_at).toLocaleDateString("fr-FR") : null} />
        <InfoRow label="Dernière connexion" value={auth?.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleDateString("fr-FR") : null} />
        <InfoRow label="Âge" value={profile?.age} />
        <InfoRow label="Bio" value={profile?.bio} />
        <InfoRow label="Langue" value={profile?.preferred_language} />
        {auth?.banned_until && (
          <div className="mt-1.5">
            <Badge variant="destructive" className="text-[10px]">BANNI</Badge>
          </div>
        )}
      </div>

      {/* Compte */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
          <Shield className="h-3 w-3 inline mr-1" /> Compte
        </p>
        <InfoRow label="Premium" value={profile?.is_premium ? "Oui" : "Non"} />
        <InfoRow label="Tier" value={subscriber?.subscription_tier} />
        <InfoRow label="Statut abo" value={subscriber?.subscription_status} />
        <InfoRow label="Expire" value={subscriber?.subscription_end ? new Date(subscriber.subscription_end).toLocaleDateString("fr-FR") : null} />
        <InfoRow label="RGPD accepté" value={profile?.rgpd_accepted ? "✅" : "❌"} />
        <InfoRow label="Compte privé" value={profile?.is_private ? "Oui" : "Non"} />
      </div>

      {/* Connexions */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
          <Link2 className="h-3 w-3 inline mr-1" /> Connexions
        </p>
        <InfoRow label="Strava" value={profile?.strava_connected ? "✅ Connecté" : "❌"} />
        <InfoRow label="Instagram" value={profile?.instagram_connected ? `✅ @${profile.instagram_username}` : "❌"} />
      </div>

      {/* Stats */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
          <Trophy className="h-3 w-3 inline mr-1" /> Statistiques
        </p>
        <InfoRow label="Sessions créées" value={sessionsCreated} />
        <InfoRow label="Sessions rejointes" value={sessionsJoined} />
        <InfoRow label="Abonnés" value={followersCount} />
        <InfoRow label="Abonnements" value={followingCount} />
        <InfoRow label="Points total" value={scores?.total_points} />
        <InfoRow label="Points saisonnier" value={scores?.seasonal_points} />
        <InfoRow label="Points semaine" value={scores?.weekly_points} />
        <InfoRow label="Fiabilité" value={stats?.reliability_rate ? `${Math.round(stats.reliability_rate)}%` : null} />
        <InfoRow label="Streak" value={stats?.streak_weeks ? `${stats.streak_weeks} semaines` : null} />
      </div>

      {/* Notifications */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
          <Bell className="h-3 w-3 inline mr-1" /> Notifications
        </p>
        <InfoRow label="Push token" value={profile?.push_token ? "✅ Présent" : "❌ Absent"} />
        <InfoRow label="Plateforme" value={profile?.push_token_platform} />
        <InfoRow label="Notifs activées" value={profile?.notifications_enabled ? "✅" : "❌"} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-secondary rounded-[10px] p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
            Badges ({badges.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b: any) => (
              <Badge key={b.id} variant="outline" className="text-[10px] gap-1">
                {b.badge_icon} {b.badge_name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
