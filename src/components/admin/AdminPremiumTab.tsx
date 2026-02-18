import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Gift, X, ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserResult } from "../AdminPremiumManager";

interface SubscriberInfo {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  subscription_status: string | null;
}

const DURATION_OPTIONS = [
  { label: "1 semaine", days: 7 },
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "1 an", days: 365 },
];

export const AdminPremiumTab = ({
  selectedUser,
  onBack,
  invokeAdmin,
}: {
  selectedUser: UserResult | null;
  onBack: () => void;
  invokeAdmin: (body: Record<string, unknown>) => Promise<any>;
}) => {
  const { toast } = useToast();
  const [subscriberInfo, setSubscriberInfo] = useState<SubscriberInfo | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  useEffect(() => {
    if (selectedUser) fetchSub();
  }, [selectedUser]);

  const fetchSub = async () => {
    if (!selectedUser) return;
    setLoadingSub(true);
    try {
      const { data } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end, subscription_status")
        .eq("user_id", selectedUser.user_id)
        .maybeSingle();
      setSubscriberInfo(data);
    } catch {
      setSubscriberInfo(null);
    } finally {
      setLoadingSub(false);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[14px] p-8">
        Sélectionnez un utilisateur ci-dessus
      </div>
    );
  }

  const grantPremium = async () => {
    if (!selectedDuration) return;
    setProcessing(true);
    try {
      const data = await invokeAdmin({
        action: "grant",
        target_user_id: selectedUser.user_id,
        target_email: (selectedUser.username || "user") + "@creator-gift",
        duration_days: selectedDuration,
      });
      toast({
        title: "Premium accordé ✨",
        description: `Jusqu'au ${new Date(data.subscription_end).toLocaleDateString("fr-FR")}`,
      });
      await fetchSub();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const revokePremium = async () => {
    setProcessing(true);
    try {
      await invokeAdmin({ action: "revoke", target_user_id: selectedUser.user_id });
      toast({ title: "Premium retiré" });
      setSubscriberInfo(null);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

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

      {/* Current status */}
      <div className="bg-secondary rounded-[10px] p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Statut actuel</p>
        {loadingSub ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : subscriberInfo?.subscribed ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[14px] font-medium text-foreground">Premium actif</span>
            </div>
            <p className="text-[12px] text-muted-foreground">Tier : {subscriberInfo.subscription_tier || "N/A"}</p>
            {subscriberInfo.subscription_end && (
              <p className="text-[12px] text-muted-foreground">
                Expire le : {new Date(subscriberInfo.subscription_end).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-[14px] text-muted-foreground">Gratuit</span>
          </div>
        )}
      </div>

      {/* Duration selector */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Offrir Premium</p>
        <div className="grid grid-cols-2 gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setSelectedDuration(opt.days)}
              className={`py-2 px-3 rounded-[8px] text-[14px] font-medium transition-colors ${
                selectedDuration === opt.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground active:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button onClick={grantPremium} disabled={!selectedDuration || processing} className="w-full mt-3 gap-2" size="sm">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          Offrir Premium
        </Button>
      </div>

      {subscriberInfo?.subscribed && (
        <Button onClick={revokePremium} disabled={processing} variant="destructive" className="w-full gap-2" size="sm">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Retirer Premium
        </Button>
      )}
    </div>
  );
};
