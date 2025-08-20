import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Route, MapPin, Calendar, Trash2, ArrowLeft, TrendingUp, Mountain, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";

interface UserRoute {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  total_elevation_loss: number | null;
  min_elevation: number | null;
  max_elevation: number | null;
  created_at: string;
  coordinates: any;
}

const MyRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRoutes();
    }
  }, [user]);

  const fetchRoutes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos itinéraires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)
        .eq('created_by', user?.id);

      if (error) throw error;

      setRoutes(prev => prev.filter(route => route.id !== routeId));
      toast({
        title: "Itinéraire supprimé",
        description: "L'itinéraire a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'itinéraire",
        variant: "destructive",
      });
    }
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return "N/A";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${Math.round(meters / 1000 * 10) / 10} km`;
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return "N/A";
    return `${Math.round(meters)} m`;
  };

  const getRoutePoints = (coordinates: any) => {
    if (!coordinates || !Array.isArray(coordinates)) return 0;
    return coordinates.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/profile')}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mes Itinéraires</h1>
              <p className="text-sm text-muted-foreground">{routes.length} itinéraire{routes.length > 1 ? 's' : ''} créé{routes.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Route className="h-4 w-4" />
            Créer un itinéraire
          </Button>
        </div>

        {/* Routes Grid */}
        {routes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Route className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun itinéraire créé</h3>
              <p className="text-muted-foreground mb-4">
                Utilisez le bouton crayon sur la carte pour créer votre premier itinéraire
              </p>
              <Button onClick={() => navigate('/')} className="gap-2">
                <MapPin className="h-4 w-4" />
                Aller à la carte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <Card key={route.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{route.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(route.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteRoute(route.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {route.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {route.description}
                    </p>
                  )}

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="text-sm font-semibold">{formatDistance(route.total_distance)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dénivelé +</p>
                        <p className="text-sm font-semibold">{formatElevation(route.total_elevation_gain)}</p>
                      </div>
                    </div>

                    {route.min_elevation && route.max_elevation && (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <Mountain className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Alt. min</p>
                            <p className="text-sm font-semibold">{formatElevation(route.min_elevation)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <Mountain className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Alt. max</p>
                            <p className="text-sm font-semibold">{formatElevation(route.max_elevation)}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {getRoutePoints(route.coordinates)} points
                    </div>
                    {route.total_elevation_loss && (
                      <Badge variant="secondary" className="text-xs">
                        ↘️ {formatElevation(route.total_elevation_loss)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRoutes;