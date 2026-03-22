import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Mail, LogOut, Trash2, Settings, ChevronRight, ArrowLeft, Loader2, FileText, Info, Shield, GraduationCap } from "lucide-react";
import { AdminPremiumManager } from "@/components/AdminPremiumManager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
import { useTutorial } from "@/hooks/useTutorial";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

interface SettingsSupportProps {
  onBack: () => void;
  onClose: () => void;
}

export const SettingsSupport = ({ onBack, onClose }: SettingsSupportProps) => {
  const { user, session, signOut } = useAuth();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { restartTutorial } = useTutorial();
  const [loading, setLoading] = useState(false);
  const [showAdminPremium, setShowAdminPremium] = useState(false);
  const navigate = useNavigate();

  const handleRestartTutorial = async () => {
    await restartTutorial();
    onClose();
    navigate('/');
  };

  const handleSignOut = () => {
    // Fermer le dialog d’abord pour que Radix retire scroll-lock / pointer-events sur body,
    // puis navigation forcée dans signOut (évite boutons Auth morts après déconnexion).
    onClose();
    void signOut();
  };

  const handleDeleteAccount = async () => {
    if (!user || !session) return;

    try {
      setLoading(true);
      
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès.",
      });

      onClose();
      void signOut();
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre compte. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <h1 className="text-[17px] font-semibold">Aide & Support</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-6 space-y-6">
          {/* Legal */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Mentions légales
            </h3>
            <div className="bg-card overflow-hidden">
              <button 
                onClick={() => { onClose(); navigate('/about'); }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                  <Info className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">À propos</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              <button 
                onClick={() => { onClose(); navigate('/terms'); }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                  <FileText className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Conditions d'utilisation</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              <button 
                onClick={() => { onClose(); navigate('/privacy'); }}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
                  <Shield className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Politique de confidentialité</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Assistance
            </h3>
            <div className="bg-card overflow-hidden">
              <button 
                onClick={handleRestartTutorial}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                  <GraduationCap className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">{t('tutorial.restartTutorial')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="h-px bg-border ml-[54px]" />

              {/* Contact */}
              <a 
                href="mailto:ferdinand.froidefont@gmail.com"
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                  <Mail className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Contacter le support</p>
                  <p className="text-[13px] text-muted-foreground">ferdinand.froidefont@gmail.com</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Compte
            </h3>
            <div className="bg-card overflow-hidden">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                  <LogOut className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Se déconnecter</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              {/* Creator Mode */}
              {hasCreatorSupportAccess(user?.email, userProfile?.username) && (
                <>
                  <div className="h-px bg-border ml-[54px]" />
                  <button 
                    onClick={() => setShowAdminPremium(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 active:bg-primary/10 transition-colors"
                  >
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                      <Settings className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] font-medium text-primary">Support créateur</p>
                      <p className="text-[12px] text-muted-foreground">Outils internes · RGPD</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary/50" />
                  </button>
                  <AdminPremiumManager open={showAdminPremium} onOpenChange={setShowAdminPremium} />
                </>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Zone de danger
            </h3>
            <div className="bg-card overflow-hidden">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-4 py-3 active:bg-destructive/5 transition-colors">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
                      <Trash2 className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] font-medium text-destructive">Supprimer mon compte</p>
                      <p className="text-[13px] text-muted-foreground">Action irréversible</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-destructive/50" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer votre compte</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes vos données seront perdues.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
