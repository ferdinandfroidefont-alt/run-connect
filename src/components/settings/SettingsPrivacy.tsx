import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, FileText, Info, ChevronRight, ArrowLeft, Scale, BarChart3, KeyRound, Smartphone, Download, Eraser } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  getAnalyticsConsent,
  isAnalyticsFeatureEnabledInBuild,
  setAnalyticsConsent,
} from "@/lib/analyticsConsent";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

interface Profile {
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
}

interface SettingsPrivacyProps {
  onBack: () => void;
  onClose: () => void;
}

export const SettingsPrivacy = ({ onBack, onClose }: SettingsPrivacyProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(() => getAnalyticsConsent() === "granted");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [dataSelection, setDataSelection] = useState<Record<string, boolean>>({
    profile: true,
    records: true,
    sessions: false,
    social: false,
    stories: false,
  });
  const [dataLoading, setDataLoading] = useState(false);

  const syncAnalyticsToggle = () => {
    setAnalyticsOptIn(getAnalyticsConsent() === "granted");
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      void loadMfaStatus();
    }
  }, [user]);

  useEffect(() => {
    syncAnalyticsToggle();
    const onChange = () => syncAnalyticsToggle();
    window.addEventListener("runconnect-analytics-consent-changed", onChange);
    return () => window.removeEventListener("runconnect-analytics-consent-changed", onChange);
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('rgpd_accepted, security_rules_accepted')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const loadMfaStatus = async () => {
    try {
      const mfaApi = (supabase.auth as any)?.mfa;
      if (!mfaApi?.listFactors) {
        setMfaEnabled(false);
        return;
      }
      const res = await mfaApi.listFactors();
      const factors = res?.data?.totp ?? [];
      setMfaEnabled(factors.some((f: any) => f.status === "verified"));
    } catch {
      setMfaEnabled(false);
    }
  };

  const toggleMfa = async () => {
    setMfaLoading(true);
    try {
      const mfaApi = (supabase.auth as any)?.mfa;
      if (!mfaApi?.listFactors) {
        toast({
          title: "2FA non disponible",
          description: "Votre environnement n'expose pas encore l'API MFA.",
          variant: "destructive",
        });
        return;
      }

      const listed = await mfaApi.listFactors();
      const totpFactors = listed?.data?.totp ?? [];
      const verifiedFactor = totpFactors.find((f: any) => f.status === "verified");

      if (verifiedFactor) {
        await mfaApi.unenroll({ factorId: verifiedFactor.id });
        setMfaEnabled(false);
        toast({ title: "2FA desactivee", description: "La verification a 2 facteurs est desactivee." });
        return;
      }

      const enrollment = await mfaApi.enroll({ factorType: "totp" });
      const qr = enrollment?.data?.totp?.qr_code;
      if (!qr) {
        toast({
          title: "2FA initialisee",
          description: "Scannez le QR dans une app TOTP puis confirmez lors d'une prochaine connexion.",
        });
      } else {
        toast({
          title: "2FA initialisee",
          description: "Scannez le QR dans votre app d'authentification. Activation en cours.",
        });
      }
      setMfaEnabled(true);
    } catch (error: any) {
      toast({
        title: "Erreur 2FA",
        description: error?.message || "Impossible de mettre a jour la 2FA.",
        variant: "destructive",
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const signOutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast({
        title: "Sessions deconnectees",
        description: "Toutes les sessions ont ete revoquees. Reconnectez-vous.",
      });
      onClose();
      setTimeout(() => {
        void signOut();
      }, 200);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const selectedKeys = () => Object.entries(dataSelection).filter(([, v]) => v).map(([k]) => k);

  const exportSelectedData = async () => {
    if (!user?.id) return;
    const selections = selectedKeys();
    if (selections.length === 0) {
      toast({ title: "Selection vide", description: "Choisissez au moins un bloc de donnees.", variant: "destructive" });
      return;
    }
    setDataLoading(true);
    try {
      const payload: Record<string, any> = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
      };

      if (dataSelection.profile) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        payload.profile = data ?? null;
      }
      if (dataSelection.records) {
        const { data } = await (supabase as any).from("profile_sport_records").select("*").eq("user_id", user.id);
        payload.records = data ?? [];
      }
      if (dataSelection.sessions) {
        const [{ data: organized }, { data: joined }] = await Promise.all([
          (supabase as any).from("sessions").select("*").eq("organizer_id", user.id),
          (supabase as any).from("session_participants").select("*").eq("user_id", user.id),
        ]);
        payload.sessions = { organized: organized ?? [], joined: joined ?? [] };
      }
      if (dataSelection.social) {
        const [{ data: following }, { data: followers }] = await Promise.all([
          (supabase as any).from("user_follows").select("*").eq("follower_id", user.id),
          (supabase as any).from("user_follows").select("*").eq("following_id", user.id),
        ]);
        payload.social = { following: following ?? [], followers: followers ?? [] };
      }
      if (dataSelection.stories) {
        const [{ data: stories }, { data: highlights }] = await Promise.all([
          (supabase as any).from("session_stories").select("*").eq("author_id", user.id),
          (supabase as any).from("profile_story_highlights").select("*").eq("owner_id", user.id),
        ]);
        payload.stories = { stories: stories ?? [], highlights: highlights ?? [] };
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `runconnect-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export termine", description: "Le fichier JSON a ete telecharge." });
    } catch (error: any) {
      toast({ title: "Erreur export", description: error.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const deleteSelectedData = async () => {
    if (!user?.id) return;
    const selections = selectedKeys();
    if (selections.length === 0) {
      toast({ title: "Selection vide", description: "Choisissez au moins un bloc de donnees.", variant: "destructive" });
      return;
    }
    setDataLoading(true);
    try {
      if (dataSelection.records) {
        await (supabase as any).from("profile_sport_records").delete().eq("user_id", user.id);
      }
      if (dataSelection.sessions) {
        await (supabase as any).from("session_participants").delete().eq("user_id", user.id);
      }
      if (dataSelection.social) {
        await (supabase as any).from("user_follows").delete().eq("follower_id", user.id);
        await (supabase as any).from("user_follows").delete().eq("following_id", user.id);
      }
      if (dataSelection.stories) {
        await (supabase as any).from("profile_story_highlights").delete().eq("owner_id", user.id);
        await (supabase as any).from("session_stories").delete().eq("author_id", user.id);
      }
      if (dataSelection.profile) {
        await supabase.from("profiles").update({ bio: null, phone: null }).eq("user_id", user.id);
      }

      toast({ title: "Suppression terminee", description: "Les donnees selectionnees ont ete supprimees." });
    } catch (error: any) {
      toast({ title: "Erreur suppression", description: error.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ 
          rgpd_accepted: false, 
          security_rules_accepted: false 
        })
        .eq('user_id', user.id);
      
      toast({
        title: "Consentement révoqué",
        description: "Vous allez être déconnecté.",
      });

      onClose();
      setTimeout(() => {
        void signOut();
      }, 200);
    } catch (error) {
      console.error('Erreur révocation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de révoquer le consentement.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="border-b border-border bg-card">
            <div className="flex h-[56px] items-center justify-between px-4 ios-shell:px-2.5">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-[17px] font-semibold">Confidentialité</h1>
              <div className="w-9" />
            </div>
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          {/* Consents */}
          <div className="space-y-2" data-tutorial="settings-privacy-consents">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Consentements
            </h3>
            <div className="bg-card overflow-hidden">
              {/* RGPD */}
              <AlertDialog>
                <div className="flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                  <div className="ios-list-row-icon bg-[#34C759]">
                    <FileText className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">RGPD / Données personnelles</p>
                    <p className="text-[13px] text-muted-foreground">Gestion de vos données</p>
                  </div>
                  <Switch
                    checked={profile?.rgpd_accepted || false}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        const trigger = document.getElementById('rgpd-revoke-trigger');
                        trigger?.click();
                      }
                    }}
                  />
                </div>
                <AlertDialogTrigger id="rgpd-revoke-trigger" className="hidden" />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retirer votre consentement RGPD ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous serez déconnecté immédiatement et devrez accepter à nouveau les conditions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRevokeConsent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="ios-list-row-inset-sep" />

              {/* Security Rules */}
              <AlertDialog>
                <div className="flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                  <div className="ios-list-row-icon bg-[#007AFF]">
                    <Shield className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">Règles de sécurité</p>
                    <p className="text-[13px] text-muted-foreground">Règles d'utilisation</p>
                  </div>
                  <Switch
                    checked={profile?.security_rules_accepted || false}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        const trigger = document.getElementById('security-revoke-trigger');
                        trigger?.click();
                      }
                    }}
                  />
                </div>
                <AlertDialogTrigger id="security-revoke-trigger" className="hidden" />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retirer votre acceptation des règles ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous serez déconnecté immédiatement et devrez accepter à nouveau les conditions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRevokeConsent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Analytics (opt-in) */}
          <div className="space-y-2" data-tutorial="settings-privacy-analytics">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Mesure d&apos;audience
            </h3>
            <div className="bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-[#AF52DE]">
                  <BarChart3 className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium">Analytics</p>
                  <p className="text-[13px] text-muted-foreground">
                    {isAnalyticsFeatureEnabledInBuild()
                      ? "Pages vues et événements agrégés (ex. Google Analytics) si vous acceptez."
                      : "Non activé sur cette version. Votre choix sera appliqué si l’éditeur active l’outil."}
                  </p>
                </div>
                <Switch
                  checked={analyticsOptIn}
                  onCheckedChange={(checked) => {
                    setAnalyticsConsent(checked);
                    setAnalyticsOptIn(checked);
                    toast({
                      title: checked ? "Mesure d’audience acceptée" : "Mesure d’audience refusée",
                      description: checked
                        ? "Les statistiques anonymisées nous aident à améliorer l’app."
                        : "Aucun envoi vers l’outil d’analyse.",
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Securite du compte
            </h3>
            <div className="bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-[#5856D6]">
                  <KeyRound className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">2FA (authenticator)</p>
                  <p className="text-[13px] text-muted-foreground">
                    {mfaEnabled ? "Activee" : "Desactivee"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void toggleMfa()} disabled={mfaLoading}>
                  {mfaEnabled ? "Desactiver" : "Activer"}
                </Button>
              </div>
              <div className="ios-list-row-inset-sep" />
              <div className="flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-[#FF3B30]">
                  <Smartphone className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Sessions actives</p>
                  <p className="text-[13px] text-muted-foreground">Deconnecter tous les appareils</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void signOutAllSessions()}>
                  Revoquer
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Donnees personnelles
            </h3>
            <div className="bg-card overflow-hidden px-4 py-3 space-y-3">
              {[
                { key: "profile", label: "Profil (bio, telephone)" },
                { key: "records", label: "Records sportifs" },
                { key: "sessions", label: "Participation aux seances" },
                { key: "social", label: "Relations sociales (abonnements)" },
                { key: "stories", label: "Stories et highlights" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={dataSelection[item.key]}
                    onCheckedChange={(value) =>
                      setDataSelection((prev) => ({ ...prev, [item.key]: value === true }))
                    }
                  />
                  <span className="text-[14px]">{item.label}</span>
                </label>
              ))}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => void exportSelectedData()} disabled={dataLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => void deleteSelectedData()} disabled={dataLoading}>
                  <Eraser className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Documents légaux
            </h3>
            <div className="bg-card overflow-hidden">
              {/* Mentions légales */}
              <button
                onClick={() => {
                  navigate("/legal");
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#FF9500]">
                  <Scale className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Mentions légales</p>
                  <p className="text-[13px] text-muted-foreground">Éditeur, hébergement, contact</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              {/* Privacy Policy */}
              <button 
                onClick={() => {
                  navigate('/privacy');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#8E8E93]">
                  <Info className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Politique de confidentialité</p>
                  <p className="text-[13px] text-muted-foreground">Consulter notre politique</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>

          {/* Revoke All */}
          {profile?.rgpd_accepted && profile?.security_rules_accepted && (
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
                Zone de danger
              </h3>
              <div className="bg-card overflow-hidden">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-destructive/5 transition-colors">
                      <div className="ios-list-row-icon bg-[#FF3B30]">
                        <Shield className="h-[18px] w-[18px] text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px] font-medium text-destructive">Révoquer mon consentement</p>
                        <p className="text-[13px] text-muted-foreground">Vous serez déconnecté</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-destructive/50" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Révoquer votre consentement ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous serez déconnecté et devrez accepter à nouveau les conditions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleRevokeConsent}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Révoquer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
