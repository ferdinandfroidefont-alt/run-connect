import { useState, useEffect, useCallback } from "react";
import { Instagram as InstagramIcon } from "lucide-react";
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

const IG_GRADIENT =
  "linear-gradient(135deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)";
const SETTINGS_CARD_SHADOW =
  "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

interface InstagramConnectProps {
  profile?: {
    instagram_connected?: boolean;
    instagram_verified_at?: string | null;
    instagram_username?: string | null;
  };
  onProfileUpdate?: () => void;
  isOwnProfile?: boolean;
  /** Aligné maquette RunConnect (9).jsx — sous-page Réglages → Connexions */
  presentation?: "card" | "settings-pixel";
}

export const InstagramConnect = ({
  profile,
  onProfileUpdate,
  isOwnProfile,
  presentation = "card",
}: InstagramConnectProps) => {
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

  if (presentation === "settings-pixel") {
    return (
      <div
        className="mx-4 mb-3 min-w-0 max-w-full p-4"
        style={{
          background: "white",
          borderRadius: 16,
          boxShadow: SETTINGS_CARD_SHADOW,
        }}
      >
        <div className="mb-3 flex items-start gap-2.5">
          <div
            className="flex flex-shrink-0 items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: IG_GRADIENT,
            }}
          >
            <InstagramIcon className="h-4 w-4 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0A0F1F",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Instagram
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#8E8E93",
                margin: 0,
                marginTop: 2,
                lineHeight: 1.3,
              }}
            >
              Instagram est une marque déposée de Meta.
            </p>
          </div>
        </div>
        {profile?.instagram_connected ? (
          <>
            <p
              style={{
                fontSize: 14,
                color: "#0A0F1F",
                lineHeight: 1.45,
                margin: 0,
                marginBottom: 14,
              }}
            >
              Ton compte Instagram est lié à RunConnect pour la vérification sur ton profil.
              {profile.instagram_verified_at
                ? ` Vérifié le ${new Date(profile.instagram_verified_at).toLocaleDateString("fr-FR")}.`
                : ""}
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-pink-500/15 font-semibold text-pink-700 dark:text-pink-300">
                Connecté
              </Badge>
            </div>
            {profile.instagram_username ? (
              <div className="mb-3">
                <InstagramProfileLink username={profile.instagram_username} label="Voir sur Instagram" />
              </div>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleInstagramDisconnect()}
              className="w-full py-3 transition-opacity active:opacity-90 disabled:opacity-60"
              style={{
                background: "white",
                borderRadius: 9999,
                border: "1px solid #E5E5EA",
                color: "#0A0F1F",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "Déconnexion…" : "Déconnecter Instagram"}
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 14,
                color: "#0A0F1F",
                lineHeight: 1.45,
                margin: 0,
                marginBottom: 14,
              }}
            >
              Connecte ton compte Instagram pour faire vérifier ton profil aux autres membres. Tu seras redirigé vers
              Instagram pour autoriser l&apos;accès prévu par l&apos;application (identité / profil).
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleInstagramConnect()}
              className="flex w-full items-center justify-center gap-2 py-3 transition-colors active:bg-[#F8F8F8] disabled:opacity-60"
              style={{
                background: "white",
                borderRadius: 9999,
                border: "1px solid #E5E5EA",
                color: "#0A0F1F",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: IG_GRADIENT,
                }}
              >
                <InstagramIcon className="h-3 w-3 text-white" strokeWidth={2.4} />
              </div>
              {loading ? "Connexion…" : "Se connecter avec Instagram"}
            </button>
          </>
        )}
        <div className="mt-3 flex items-start gap-1.5">
          <InstagramIcon className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#D62976]" strokeWidth={2.6} />
          <p style={{ fontSize: 12, color: "#8E8E93", margin: 0, lineHeight: 1.4 }}>
            Fourni par Instagram. Instagram est une marque déposée de Meta. Les données Instagram sont traitées selon
            les règles d&apos;Instagram et de votre compte RunConnect.
          </p>
        </div>
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
