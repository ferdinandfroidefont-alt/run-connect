import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleHelp, Copy, Gift, Loader2, Share2, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Share } from "@capacitor/share";

type ReferralStats = {
  referral_code: string;
  total_referrals: number;
  total_rewards: number;
};

export default function Referral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showMissingHelp, setShowMissingHelp] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("referral_code, favorite_sport, country, avatar_url, phone")
          .eq("user_id", user.id)
          .single();
        if (profileError) throw profileError;
        const nextMissing: string[] = [];
        if (!profileData?.favorite_sport) nextMissing.push("Sport favori");
        if (!profileData?.country) nextMissing.push("Pays");
        if (!profileData?.avatar_url) nextMissing.push("Photo de profil");
        if (!profileData?.phone) nextMissing.push("Numero de telephone");
        setMissingFields(nextMissing);

        const { data: statsData, error: statsError } = await supabase.rpc("get_referral_stats", {
          user_id_param: user.id,
        });
        if (statsError) throw statsError;

        if (statsData && statsData.length > 0) {
          setStats(statsData[0]);
        } else {
          setStats({
            referral_code: profileData?.referral_code || "",
            total_referrals: 0,
            total_rewards: 0,
          });
        }
      } catch (error) {
        console.error("Referral page load error:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la page de parrainage.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [toast, user]);

  const shareText = useMemo(() => {
    if (!stats?.referral_code) return "";
    return `Offrez 2 semaines gratuites a un ami avec mon code RunConnect : ${stats.referral_code}`;
  }, [stats?.referral_code]);
  const canShareReferral = missingFields.length === 0;

  const copyCode = async () => {
    if (!stats?.referral_code) return;
    try {
      await navigator.clipboard.writeText(stats.referral_code);
      toast({ title: "Code copie", description: "Le code de parrainage est dans le presse-papiers." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le code.", variant: "destructive" });
    }
  };

  const shareCode = async () => {
    if (!shareText) return;
    try {
      const isNative = !!(window as any).Capacitor;
      if (isNative) {
        await Share.share({
          title: "Parrainer quelqu'un sur RunConnect",
          text: shareText,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "Parrainer quelqu'un sur RunConnect",
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Message copie", description: "Le message de partage est copie." });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de partager le code.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
      <div className="shrink-0 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
        <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-medium text-primary active:opacity-70"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <h1 className="truncate text-center text-[17px] font-semibold text-foreground">Parrainer quelqu&apos;un</h1>
          <div />
        </div>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-4">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !canShareReferral ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowMissingHelp((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground active:opacity-70"
                aria-label="Voir les informations manquantes"
                title="Voir les informations manquantes"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-[18px] font-semibold text-foreground">Finalise ton profil pour parrainer</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Le parrainage est disponible apres avoir complete les informations requises dans Modifier le profil.
            </p>
            {showMissingHelp && (
              <div className="mt-3 rounded-xl bg-secondary px-3 py-2 text-[13px] text-muted-foreground">
                <p className="font-medium text-foreground">Il manque :</p>
                <p className="mt-1">{missingFields.join(" · ")}</p>
              </div>
            )}
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => navigate("/profile/edit")}
            >
              Ouvrir Modifier mon profil
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-primary/20 bg-card p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
                <Gift className="h-3.5 w-3.5" />
                Invitation RunConnect
              </div>
              <h2 className="mt-3 text-[20px] font-bold text-foreground">Offrez 2 semaines gratuites a un ami</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                En utilisant le code ci-dessous, votre ami recoit 2 semaines Premium offertes lors de son inscription.
              </p>

              <div className="mt-4 rounded-xl border border-border bg-secondary px-3 py-4 text-center">
                <p className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Code de parrainage</p>
                <p className="mt-1 font-mono text-[30px] font-bold leading-none tracking-[0.08em] text-foreground">
                  {stats?.referral_code || "----"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                  Copier
                </Button>
                <Button type="button" className="gap-2" onClick={shareCode}>
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Comment ca marche ?
              </h3>
              <div className="mt-2 space-y-1 text-[14px] text-muted-foreground">
                <p>1. Partage ton code avec un ami.</p>
                <p>2. Il cree son compte RunConnect avec ce code.</p>
                <p>3. Il debloque 2 semaines Premium gratuites.</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-secondary px-2 py-3">
                  <p className="text-[20px] font-bold text-foreground">{stats?.total_referrals || 0}</p>
                  <p className="text-[12px] text-muted-foreground">Amis invites</p>
                </div>
                <div className="rounded-xl bg-secondary px-2 py-3">
                  <p className="text-[20px] font-bold text-foreground">{stats?.total_rewards || 0}</p>
                  <p className="text-[12px] text-muted-foreground">Jours Premium gagnes</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
