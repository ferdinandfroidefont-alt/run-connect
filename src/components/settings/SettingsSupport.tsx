import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Mail, LogOut, Trash2, Settings, ChevronRight, ArrowLeft, Loader2, FileText, Info, Shield, GraduationCap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const { toast } = useToast();
  const { t } = useLanguage();
  const { restartTutorial } = useTutorial();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRestartTutorial = async () => {
    await restartTutorial();
    onClose();
    navigate('/');
  };

  const handleSignOut = () => {
    signOut();
    onClose();
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

      signOut();
      onClose();
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
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Aide & Support</h2>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {/* Mentions légales */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Mentions légales
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
              <button 
                onClick={() => { onClose(); navigate('/about'); }}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">À propos</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => { onClose(); navigate('/terms'); }}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Conditions d'utilisation</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => { onClose(); navigate('/privacy'); }}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Politique de confidentialité</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Support
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
              {/* Restart Tutorial Button */}
              <button 
                onClick={handleRestartTutorial}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{t('tutorial.restartTutorial')}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Contact Support */}
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">Besoin d'aide ?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notre équipe est là pour vous aider
                  </p>
                </div>
                <a 
                  href="mailto:ferdinand.froidefont@gmail.com"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">ferdinand.froidefont@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Actions
            </h3>
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
              {/* Sign Out */}
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">Se déconnecter</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Creator Mode */}
              {user?.email === 'ferdinand.froidefont@gmail.com' && (
                <button className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-primary">Créateur</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </button>
              )}

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-destructive">Supprimer mon compte</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-destructive" />
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
