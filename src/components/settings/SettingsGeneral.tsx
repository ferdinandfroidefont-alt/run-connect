import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Languages, Sun, Moon, Key, Settings, Loader2, ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages, Language } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface SettingsGeneralProps {
  onBack: () => void;
}

export const SettingsGeneral = ({ onBack }: SettingsGeneralProps) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre adresse email.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.AndroidBridge 
          ? 'app.runconnect://auth'
          : `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
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
          <h1 className="text-[17px] font-semibold">Général</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-pattern">
        <div className="px-4 py-6 space-y-6">
          {/* Language & Theme */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Apparence
            </h3>
            <div className="bg-card rounded-[10px] overflow-hidden">
              {/* Language Selector */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                  <Languages className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Langue</p>
                </div>
                <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                  <SelectTrigger className="w-[120px] h-9 text-[13px] border-0 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" sideOffset={5}>
                    {Object.entries(languages).map(([code, { nativeName }]) => (
                      <SelectItem key={code} value={code}>{nativeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px bg-border ml-[54px]" />

              {/* Theme Toggle */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="h-[18px] w-[18px] text-white" />
                  ) : (
                    <Sun className="h-[18px] w-[18px] text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Mode {theme === 'dark' ? 'sombre' : 'clair'}</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Compte
            </h3>
            <div className="bg-card rounded-[10px] overflow-hidden">
              {/* Password Reset */}
              <button 
                onClick={handlePasswordReset}
                disabled={isChangingPassword}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                  {isChangingPassword ? (
                    <Loader2 className="h-[18px] w-[18px] text-white animate-spin" />
                  ) : (
                    <Key className="h-[18px] w-[18px] text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">Mot de passe</p>
                  <p className="text-[13px] text-muted-foreground">Réinitialiser par email</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>

          {/* Map Settings */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Carte
            </h3>
            <div className="bg-card rounded-[10px] overflow-hidden">
              {/* Long Press to Create Session */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
                  <MapPin className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Appui long sur la carte</p>
                  <p className="text-[13px] text-muted-foreground">Créer une session rapidement</p>
                </div>
                <Switch
                  checked={localStorage.getItem('enableLongPressCreate') === 'true'}
                  onCheckedChange={(checked) => {
                    localStorage.setItem('enableLongPressCreate', checked.toString());
                    toast({
                      title: "Paramètre mis à jour",
                      description: checked ? "Appui long activé" : "Appui long désactivé"
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
