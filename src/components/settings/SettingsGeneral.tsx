import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Languages, Sun, Moon, Key, Settings, Loader2, ArrowLeft } from "lucide-react";
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
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Général</h2>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
            {/* Language Selector */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Languages className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Langue</label>
                  <p className="text-xs text-muted-foreground">Choisir la langue de l'application</p>
                </div>
              </div>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-[120px] h-9 text-xs border-border/50 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]" sideOffset={5}>
                  {Object.entries(languages).map(([code, { nativeName }]) => (
                    <SelectItem key={code} value={code}>{nativeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-white" />}
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Mode {theme === 'dark' ? 'sombre' : 'clair'}</label>
                  <p className="text-xs text-muted-foreground">Basculer entre thème clair et sombre</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            {/* Password Reset */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Mot de passe</label>
                  <p className="text-xs text-muted-foreground">Réinitialiser votre mot de passe</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-primary hover:text-primary hover:bg-primary/10"
                onClick={handlePasswordReset}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Changer'}
              </Button>
            </div>

            {/* Long Press to Create Session */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Appui long sur la carte</label>
                  <p className="text-xs text-muted-foreground">Créer une session en appuyant longuement</p>
                </div>
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
      </ScrollArea>
    </motion.div>
  );
};
