import { useState, useEffect } from "react";
import { Loader2, Flag, AlertTriangle } from "lucide-react";

export const AdminReportsTab = ({
  invokeAdmin,
}: {
  invokeAdmin: (body: Record<string, unknown>) => Promise<any>;
}) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await invokeAdmin({ action: "get_reports" });
      setReports(data.reports || []);
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

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
        <Flag className="h-8 w-8" />
        <p className="text-[14px]">Aucun signalement</p>
        <p className="text-[12px] text-center">Les signalements d'utilisateurs apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
        Signalements récents ({reports.length})
      </p>
      {reports.map((report: any) => (
        <div key={report.id} className="bg-secondary rounded-[10px] p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <p className="text-[13px] font-medium text-foreground">
              {report.details?.reason || "Signalement"}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {report.timestamp ? new Date(report.timestamp).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) : "—"}
          </p>
          {report.details?.reported_user_id && (
            <p className="text-[11px] text-muted-foreground">
              ID: {report.details.reported_user_id}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
