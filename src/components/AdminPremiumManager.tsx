import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Crown, User, Wrench, BarChart3, Flag } from "lucide-react";
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h2 className="text-[17px] font-semibold text-foreground flex-1">Dashboard Créateur</h2>
        </div>

        {/* Tabs navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b border-border bg-background h-auto p-0 shrink-0">
            <TabsTrigger value="premium" className="flex-1 gap-1 text-[11px] py-2 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Crown className="h-3.5 w-3.5" />
              Premium
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1 gap-1 text-[11px] py-2 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <User className="h-3.5 w-3.5" />
              Fiche
            </TabsTrigger>
            <TabsTrigger value="support" className="flex-1 gap-1 text-[11px] py-2 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Wrench className="h-3.5 w-3.5" />
              Support
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 gap-1 text-[11px] py-2 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 gap-1 text-[11px] py-2 rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Flag className="h-3.5 w-3.5" />
              Signalements
            </TabsTrigger>
          </TabsList>

          {/* Search bar for user-related tabs */}
          {needsUser && (
            <div className="shrink-0">
              <AdminSearchBar search={search} setSearch={setSearch} />
              {!selectedUser && (
                <AdminUserList
                  results={results}
                  searching={searching}
                  search={search}
                  onSelect={(user) => setSelectedUser(user)}
                />
              )}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="premium" className="m-0 h-full">
              <AdminPremiumTab
                selectedUser={selectedUser}
                onBack={() => setSelectedUser(null)}
                invokeAdmin={invokeAdmin}
              />
            </TabsContent>
            <TabsContent value="details" className="m-0 h-full">
              <AdminUserDetailsTab
                selectedUser={selectedUser}
                onBack={() => setSelectedUser(null)}
                invokeAdmin={invokeAdmin}
              />
            </TabsContent>
            <TabsContent value="support" className="m-0 h-full">
              <AdminSupportTab
                selectedUser={selectedUser}
                onBack={() => setSelectedUser(null)}
                invokeAdmin={invokeAdmin}
              />
            </TabsContent>
            <TabsContent value="stats" className="m-0 h-full">
              <AdminStatsTab invokeAdmin={invokeAdmin} />
            </TabsContent>
            <TabsContent value="reports" className="m-0 h-full">
              <AdminReportsTab invokeAdmin={invokeAdmin} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
