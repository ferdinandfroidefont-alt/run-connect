import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Users, Activity, FileText, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SecurityAlert {
  alert_type: string;
  message: string;
  severity: string;
  count: number;
  last_occurrence: string;
}

interface SecurityReport {
  generated_at: string;
  generated_by: string;
  summary: {
    total_users: number;
    active_users_24h: number;
    blocked_users_24h: number;
    failed_attempts_24h: number;
  };
  security_status: string;
}

interface DashboardData {
  date: string;
  table_name: string;
  action: string;
  access_count: number;
  unique_users: number;
}

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(profile?.is_admin || false);
    };

    checkAdminStatus();
  }, [user]);

  // Charger les données de sécurité
  const loadSecurityData = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      // Charger les alertes de sécurité
      const { data: alertsData, error: alertsError } = await supabase
        .rpc('get_security_alerts');
      
      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Charger le rapport de sécurité
      const { data: reportData, error: reportError } = await supabase
        .rpc('generate_security_report');
      
      if (reportError) throw reportError;
      setReport(reportData as unknown as SecurityReport);

      // Charger le dashboard
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_security_dashboard');
      
      if (dashboardError) throw dashboardError;
      setDashboardData(dashboardData || []);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Effectuer la maintenance de sécurité
  const runSecurityMaintenance = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('security_maintenance');
      
      if (error) throw error;
      
      const maintenanceData = data as any;
      toast({
        title: "Maintenance effectuée",
        description: `${maintenanceData.cleaned_audit_logs} logs nettoyés, ${maintenanceData.expired_sessions_cleaned} sessions expirées supprimées`
      });
      
      // Recharger les données
      loadSecurityData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Forcer la déconnexion d'un utilisateur
  const forceUserLogout = async (userId: string) => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase.rpc('force_user_logout', { target_user_id: userId });
      
      if (error) throw error;
      
      toast({
        title: "Utilisateur déconnecté",
        description: "L'utilisateur a été forcé de se déconnecter"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSecurityData();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(loadSecurityData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous devez être administrateur pour accéder au tableau de bord de sécurité.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HIGH_RISK': return 'destructive';
      case 'MEDIUM_RISK': return 'secondary';
      case 'LOW_RISK': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tableau de Bord Sécurité</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadSecurityData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            onClick={runSecurityMaintenance} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Maintenance
          </Button>
        </div>
      </div>

      {/* Statut global de sécurité */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Statut Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{report.summary.total_users}</div>
                <div className="text-sm text-muted-foreground">Utilisateurs total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{report.summary.active_users_24h}</div>
                <div className="text-sm text-muted-foreground">Actifs 24h</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{report.summary.blocked_users_24h}</div>
                <div className="text-sm text-muted-foreground">Bloqués 24h</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{report.summary.failed_attempts_24h}</div>
                <div className="text-sm text-muted-foreground">Tentatives échouées</div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Badge variant={getStatusColor(report.security_status)}>
                {report.security_status === 'HIGH_RISK' && 'Risque Élevé'}
                {report.security_status === 'MEDIUM_RISK' && 'Risque Moyen'}
                {report.security_status === 'LOW_RISK' && 'Risque Faible'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes de sécurité */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertes de Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    {alert.message}
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {alert.count} occurrences - Dernière: {format(new Date(alert.last_occurrence), "d MMM 'à' HH:mm", { locale: fr })}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Données d'audit */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Activité Récente</TabsTrigger>
          <TabsTrigger value="admin">Actions Admin</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Activité des 30 derniers jours</CardTitle>
              <CardDescription>
                Accès aux données par table et action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dashboardData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{item.table_name}</span> - {item.action}
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(item.date), "d MMM yyyy", { locale: fr })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.access_count}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.unique_users} utilisateurs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Actions Administrateur</CardTitle>
              <CardDescription>
                Outils de gestion de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Zone Administrateur</AlertTitle>
                  <AlertDescription>
                    Ces actions sont irréversibles et sont enregistrées dans l'audit.
                  </AlertDescription>
                </Alert>
                
                {/* Ici on pourrait ajouter des outils admin spécifiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" disabled>
                    <Users className="h-4 w-4 mr-2" />
                    Gérer les Utilisateurs
                  </Button>
                  <Button variant="outline" disabled>
                    <FileText className="h-4 w-4 mr-2" />
                    Exporter les Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};