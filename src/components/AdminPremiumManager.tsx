import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Search, Gift, X, ChevronLeft, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean | null;
}

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

export const AdminPremiumManager = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [subscriberInfo, setSubscriberInfo] = useState<SubscriberInfo | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const searchUsers = async (query: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, is_premium")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setResults((data as UserResult[]) || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: UserResult) => {
    setSelectedUser(user);
    setSelectedDuration(null);
    setLoadingSub(true);
    try {
      const { data, error } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end, subscription_status")
        .eq("user_id", user.user_id)
        .maybeSingle();

      if (error) throw error;
      setSubscriberInfo(data);
    } catch (error) {
      console.error("Error fetching subscriber info:", error);
      setSubscriberInfo(null);
    } finally {
      setLoadingSub(false);
    }
  };

  const grantPremium = async () => {
    if (!selectedUser || !selectedDuration || !session) return;
    setProcessing(true);
    try {
      // Get user email from auth (we need it for subscribers table)
      // We'll pass the user_id and let the edge function handle it
      const { data, error } = await supabase.functions.invoke("admin-manage-premium", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: "grant",
          target_user_id: selectedUser.user_id,
          target_email: selectedUser.username + "@creator-gift",
          duration_days: selectedDuration,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Premium accordé ✨",
        description: `${selectedUser.display_name || selectedUser.username} est maintenant premium jusqu'au ${new Date(data.subscription_end).toLocaleDateString("fr-FR")}`,
      });

      // Refresh
      setSelectedUser({ ...selectedUser, is_premium: true });
      await selectUser(selectedUser);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const revokePremium = async () => {
    if (!selectedUser || !session) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-premium", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: "revoke",
          target_user_id: selectedUser.user_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Premium retiré",
        description: `Le premium a été retiré de ${selectedUser.display_name || selectedUser.username}`,
      });

      setSelectedUser({ ...selectedUser, is_premium: false });
      setSubscriberInfo(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setSubscriberInfo(null);
    setSelectedDuration(null);
  };

  const handleClose = () => {
    setSearch("");
    setResults([]);
    setSelectedUser(null);
    setSubscriberInfo(null);
    setSelectedDuration(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {selectedUser ? (
            <button onClick={handleBack} className="text-primary">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <Crown className="h-5 w-5 text-yellow-500" />
          )}
          <h2 className="text-[17px] font-semibold text-foreground flex-1">
            {selectedUser ? (selectedUser.display_name || selectedUser.username) : "Gestion Premium"}
          </h2>
        </div>

        {!selectedUser ? (
          /* Search View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom ou pseudo..."
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!searching && results.length === 0 && search.trim().length >= 2 && (
                <p className="text-center text-muted-foreground py-8 text-[15px]">
                  Aucun utilisateur trouvé
                </p>
              )}

              {!searching && results.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => selectUser(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors border-b border-border/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {(user.display_name || user.username)?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-medium text-foreground truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-[13px] text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  {user.is_premium && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[11px] px-2 py-0.5">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* User Management View */
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={selectedUser.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {(selectedUser.display_name || selectedUser.username)?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[17px] font-semibold text-foreground">
                  {selectedUser.display_name || selectedUser.username}
                </p>
                <p className="text-[13px] text-muted-foreground">@{selectedUser.username}</p>
              </div>
            </div>

            {/* Current status */}
            <div className="bg-secondary rounded-[12px] p-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide mb-2">
                Statut actuel
              </p>
              {loadingSub ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : subscriberInfo?.subscribed ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-[15px] font-medium text-foreground">Premium actif</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Tier : {subscriberInfo.subscription_tier || "N/A"}
                  </p>
                  {subscriberInfo.subscription_end && (
                    <p className="text-[13px] text-muted-foreground">
                      Expire le : {new Date(subscriberInfo.subscription_end).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-[15px] text-muted-foreground">Gratuit</span>
                </div>
              )}
            </div>

            {/* Grant premium */}
            <div>
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide mb-3">
                Offrir Premium
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setSelectedDuration(opt.days)}
                    className={`py-2.5 px-3 rounded-[10px] text-[15px] font-medium transition-colors ${
                      selectedDuration === opt.days
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground active:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <Button
                onClick={grantPremium}
                disabled={!selectedDuration || processing}
                className="w-full mt-4 gap-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Offrir Premium
              </Button>
            </div>

            {/* Revoke premium */}
            {subscriberInfo?.subscribed && (
              <div>
                <Button
                  onClick={revokePremium}
                  disabled={processing}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Retirer Premium
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
