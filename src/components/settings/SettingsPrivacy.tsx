import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, FileText, Info, ChevronRight, ArrowLeft, Scale, BarChart3 } from "lucide-react";
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

  const syncAnalyticsToggle = () => {
    setAnalyticsOptIn(getAnalyticsConsent() === "granted");
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
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
      className="flex flex-col h-full bg-secondary"
    >
      {/* iOS Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-[56px]">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[17px] font-semibold">Confidentialité</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-6 space-y-6">
          {/* Consents */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Consentements
            </h3>
            <div className="bg-card overflow-hidden">
              {/* RGPD */}
              <AlertDialog>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
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

              <div className="h-px bg-border ml-[54px]" />

              {/* Security Rules */}
              <AlertDialog>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
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
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Mesure d&apos;audience
            </h3>
            <div className="bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#AF52DE] flex items-center justify-center">
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
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Documents légaux
            </h3>
            <div className="bg-card overflow-hidden">
              {/* Mentions légales */}
              <button
                onClick={() => {
                  navigate("/legal");
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                  <Scale className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Mentions légales</p>
                  <p className="text-[13px] text-muted-foreground">Éditeur, hébergement, contact</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              {/* Privacy Policy */}
              <button 
                onClick={() => {
                  navigate('/privacy');
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#8E8E93] flex items-center justify-center">
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
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                Zone de danger
              </h3>
              <div className="bg-card overflow-hidden">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-4 py-3 active:bg-destructive/5 transition-colors">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
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
    </motion.div>
  );
};
