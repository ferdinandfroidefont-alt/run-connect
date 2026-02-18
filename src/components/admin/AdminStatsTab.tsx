import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Crown, Calendar, MessageSquare, Activity, Building2, CreditCard } from "lucide-react";

export const AdminStatsTab = ({
  invokeAdmin,
}: {
  invokeAdmin: (body: Record<string, unknown>) => Promise<any>;
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: "get_stats" });
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className="bg-secondary rounded-[10px] p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[18px] font-bold text-foreground">{value.toLocaleString("fr-FR")}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Vue d'ensemble</p>

      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Users} label="Utilisateurs" value={stats.totalUsers} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Crown} label="Premium" value={stats.premiumUsers} color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={CreditCard} label="Abonnés actifs" value={stats.totalSubscribers} color="bg-green-100 text-green-600" />
        <StatCard icon={Activity} label="Actifs (7j)" value={stats.activeUsers} color="bg-purple-100 text-purple-600" />
        <StatCard icon={Calendar} label="Sessions total" value={stats.totalSessions} color="bg-orange-100 text-orange-600" />
        <StatCard icon={Calendar} label="Sessions (7j)" value={stats.sessionsThisWeek} color="bg-red-100 text-red-600" />
        <StatCard icon={MessageSquare} label="Messages" value={stats.totalMessages} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Building2} label="Clubs" value={stats.totalClubs} color="bg-teal-100 text-teal-600" />
      </div>

      <Button onClick={loadStats} variant="outline" size="sm" className="w-full text-[13px]">
        Actualiser
      </Button>
    </div>
  );
};
