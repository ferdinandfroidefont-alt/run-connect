import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Crown, User, Wrench, BarChart3, Flag, ChevronLeft, Shield } from "lucide-react";
import { AdminSearchBar } from "./admin/AdminSearchBar";
import { AdminUserList } from "./admin/AdminUserList";
import { AdminPremiumTab } from "./admin/AdminPremiumTab";
import { AdminUserDetailsTab } from "./admin/AdminUserDetailsTab";
import { AdminSupportTab } from "./admin/AdminSupportTab";
import { AdminStatsTab } from "./admin/AdminStatsTab";
import { AdminReportsTab } from "./admin/AdminReportsTab";

export interface UserResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean | null;
}

export const AdminPremiumManager = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [activeTab, setActiveTab] = useState("premium");

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

  const invokeAdmin = useCallback(async (body: Record<string, unknown>) => {
    if (!session) throw new Error("No session");
    const { data, error } = await supabase.functions.invoke("admin-manage-premium", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [session]);

  const handleClose = () => {
    setSearch("");
    setResults([]);
    setSelectedUser(null);
    setActiveTab("premium");
    onOpenChange(false);
  };

  const needsUser = activeTab === "premium" || activeTab === "details" || activeTab === "support";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="gap-0 overflow-hidden border-0 bg-secondary p-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-secondary">
          {/* Header iOS — plein écran */}
          <header className="shrink-0 border-b border-border/60 bg-card/95 shadow-sm backdrop-blur-xl">
            <div
              className="flex items-start gap-2 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,12px))]"
            >
              <button
                type="button"
                onClick={handleClose}
                className="mt-0.5 flex h-11 min-w-[44px] shrink-0 items-center gap-0.5 rounded-full px-1 text-primary transition-opacity active:opacity-60"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="text-[17px] font-normal">Fermer</span>
              </button>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-[17px] font-semibold leading-tight text-foreground">
                      Support créateur
                    </h1>
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      Outils internes RunConnect
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Rappel RGPD — zone données personnelles */}
          <div className="shrink-0 px-4 pt-3">
            <div
              className="flex gap-2.5 rounded-[14px] border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-3 dark:border-amber-500/20 dark:bg-amber-500/[0.1]"
              role="note"
            >
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Données personnelles (RGPD).</span>{" "}
                Accès réservé au support. Consultez uniquement ce qui est nécessaire, ne partagez pas
                d’informations hors finalité d’assistance, et respectez la politique de confidentialité de
                l’app.
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-2"
          >
            <TabsList className="mb-2 flex h-auto w-full shrink-0 flex-nowrap justify-start gap-1 overflow-x-auto rounded-[14px] border border-border/50 bg-card/90 p-1.5 shadow-sm backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger
                value="premium"
                className="min-h-[44px] shrink-0 gap-1.5 rounded-[10px] px-3.5 text-[12px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <Crown className="h-3.5 w-3.5" />
                Premium
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="min-h-[44px] shrink-0 gap-1.5 rounded-[10px] px-3.5 text-[12px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <User className="h-3.5 w-3.5" />
                Fiche
              </TabsTrigger>
              <TabsTrigger
                value="support"
                className="min-h-[44px] shrink-0 gap-1.5 rounded-[10px] px-3.5 text-[12px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <Wrench className="h-3.5 w-3.5" />
                Support
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="min-h-[44px] shrink-0 gap-1.5 rounded-[10px] px-3.5 text-[12px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Stats
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="min-h-[44px] shrink-0 gap-1.5 rounded-[10px] px-3.5 text-[12px] font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                <Flag className="h-3.5 w-3.5" />
                Signalements
              </TabsTrigger>
            </TabsList>

            {needsUser && (
              <div className="shrink-0 space-y-0 rounded-[14px] border border-border/40 bg-card/80 shadow-sm">
                <AdminSearchBar search={search} setSearch={setSearch} />
                {!selectedUser && (
                  <AdminUserList
                    results={results}
                    searching={searching}
                    search={search}
                    onSelect={(u) => setSelectedUser(u)}
                  />
                )}
              </div>
            )}

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-[14px] border border-border/40 bg-card/50 [-webkit-overflow-scrolling:touch]">
              <TabsContent value="premium" className="m-0 min-h-[120px]">
                <AdminPremiumTab
                  selectedUser={selectedUser}
                  onBack={() => setSelectedUser(null)}
                  invokeAdmin={invokeAdmin}
                />
              </TabsContent>
              <TabsContent value="details" className="m-0 min-h-[120px]">
                <AdminUserDetailsTab
                  selectedUser={selectedUser}
                  onBack={() => setSelectedUser(null)}
                  invokeAdmin={invokeAdmin}
                />
              </TabsContent>
              <TabsContent value="support" className="m-0 min-h-[120px]">
                <AdminSupportTab
                  selectedUser={selectedUser}
                  onBack={() => setSelectedUser(null)}
                  invokeAdmin={invokeAdmin}
                />
              </TabsContent>
              <TabsContent value="stats" className="m-0 min-h-[120px]">
                <AdminStatsTab invokeAdmin={invokeAdmin} />
              </TabsContent>
              <TabsContent value="reports" className="m-0 min-h-[120px]">
                <AdminReportsTab invokeAdmin={invokeAdmin} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
