import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, FileText, Info, ChevronRight, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

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
    } finally {
      setLoading(false);
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
      
      setTimeout(() => signOut(), 1000);
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
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/50"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Confidentialité</h2>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
            {/* RGPD */}
            <AlertDialog>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">RGPD / Données personnelles</label>
                    <p className="text-xs text-muted-foreground">Gestion de vos données</p>
                  </div>
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

            {/* Security Rules */}
            <AlertDialog>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Règles de sécurité</label>
                    <p className="text-xs text-muted-foreground">Règles d'utilisation</p>
                  </div>
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

            {/* Privacy Policy */}
            <button 
              onClick={() => {
                navigate('/privacy');
                onClose();
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium">Politique de confidentialité</span>
                  <p className="text-xs text-muted-foreground">Consulter notre politique complète</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Revoke all */}
            {profile?.rgpd_accepted && profile?.security_rules_accepted && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium text-destructive">Révoquer mon consentement</span>
                        <p className="text-xs text-muted-foreground">Vous serez déconnecté</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-destructive" />
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
            )}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
