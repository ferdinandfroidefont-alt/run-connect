import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  InstagramConnectButton,
  InstagramGlyph,
  InstagramPoweredBy,
  InstagramProfileLink,
} from "@/components/instagram/InstagramBrand";

interface InstagramConnectProps {
  profile?: {
    instagram_connected?: boolean;
    instagram_verified_at?: string | null;
    instagram_username?: string | null;
  };
  onProfileUpdate?: () => void;
  isOwnProfile?: boolean;
}

export const InstagramConnect = ({ profile, onProfileUpdate, isOwnProfile }: InstagramConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const runAfterConnect = useCallback(() => {
    setTimeout(() => {
      if (onProfileUpdate) onProfileUpdate();
      else window.location.reload();
    }, 800);
  }, [onProfileUpdate]);

  useEffect(() => {
    const onInstagramAuthSuccess = () => {
      toast.success("Connexion Instagram réussie !");
      runAfterConnect();
    };
    window.addEventListener("instagramAuthSuccess", onInstagramAuthSuccess);
    return () => window.removeEventListener("instagramAuthSuccess", onInstagramAuthSuccess);
  }, [runAfterConnect]);

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const handleInstagramConnect = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        toast.error("Session expirée. Reconnecte-toi.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("instagram-connect", { headers });

      if (error) throw error;
      if (!data?.authUrl) {
        toast.error("URL d’authentification non reçue");
        return;
      }

      if (isNative) {
        await Browser.open({ url: data.authUrl, presentationStyle: "popover" });
      } else {
        window.open(data.authUrl, "instagram_auth", "width=600,height=700");
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "instagram_auth_success") {
            toast.success("Connexion Instagram réussie !");
            window.removeEventListener("message", handleMessage);
            runAfterConnect();
          }
        };
        window.addEventListener("message", handleMessage);
      }
    } catch {
      toast.error("Erreur lors de la connexion à Instagram");
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        toast.error("Session expirée. Reconnecte-toi.");
        return;
      }
      const { error } = await supabase.functions.invoke("instagram-disconnect", { headers });
      if (error) throw error;
      toast.success("Compte Instagram déconnecté");
      setTimeout(() => {
        if (onProfileUpdate) onProfileUpdate();
        else window.location.reload();
      }, 500);
    } catch {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setLoading(false);
    }
  };

  if (!isOwnProfile) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <InstagramGlyph className="h-4 w-4 shrink-0" />
        {profile?.instagram_connected && profile.instagram_username ? (
          <span className="min-w-0 truncate">
            Instagram connecté (@{profile.instagram_username})
          </span>
        ) : (
          <span>Instagram non connecté</span>
        )}
      </div>
    );
  }

  return (
    <Card className="ios-card w-full min-w-0 overflow-hidden rounded-ios-md border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <CardHeader className="space-y-0 px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-[17px]">
          <InstagramPoweredBy variant="text" label="Instagram" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.instagram_connected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-pink-500/15 text-pink-700 dark:text-pink-300">
                Connecté
              </Badge>
              {profile.instagram_verified_at && (
                <span className="text-sm text-muted-foreground">
                  Vérifié le {new Date(profile.instagram_verified_at).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Ton compte Instagram est lié à RunConnect pour afficher ta vérification sur ton profil. RunConnect ne
              publie pas en ton nom sans action de ta part.
            </p>
            {profile.instagram_username && (
              <InstagramProfileLink username={profile.instagram_username} label="Voir sur Instagram" />
            )}
            <Button variant="outline" onClick={() => void handleInstagramDisconnect()} disabled={loading} className="w-full">
              {loading ? "Déconnexion…" : "Déconnecter Instagram"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">
              Connecte ton compte Instagram pour faire vérifier ton profil aux autres membres. Tu seras redirigé vers
              Instagram pour autoriser l’accès prévu par l’application (identité / profil).
            </p>
            <InstagramConnectButton onClick={() => void handleInstagramConnect()} loading={loading} />
          </div>
        )}
        <InstagramPoweredBy variant="logo" />
      </CardContent>
    </Card>
  );
};
