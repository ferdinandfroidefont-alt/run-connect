import { ArrowLeft, Info, Mail, Globe, Code, Heart, Shield, ExternalLink } from "lucide-react";
import appIcon from '@/assets/app-icon.png';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();
  const appVersion = "1.0.0";
  const lastUpdate = "15 janvier 2025";

  return (
    <div className="fixed inset-0 bg-secondary flex flex-col bg-pattern overflow-x-hidden">
      {/* Header fixe style iOS */}
      <div className="sticky top-0 z-50 bg-card border-b border-border/50 safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">À propos</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 pb-24 space-y-6">
          {/* Logo et nom */}
          <div className="bg-card rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <img src={appIcon} alt="RunConnect" className="h-24 w-24 rounded-3xl shadow-lg mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">RunConnect</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Version {appVersion}
              </p>
              <p className="text-xs text-muted-foreground">
                Mise à jour : {lastUpdate}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-foreground">Notre mission</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RunConnect est une application sociale dédiée aux passionnés de sport. 
              Notre mission est de connecter les sportifs entre eux pour organiser des 
              séances de course, vélo, natation et bien plus encore.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Créez des sessions, rejoignez des clubs, suivez vos amis et atteignez 
              vos objectifs sportifs ensemble. Que vous soyez débutant ou confirmé, 
              RunConnect vous accompagne dans votre parcours sportif.
            </p>
          </div>

          {/* Informations éditeur */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold text-foreground">Informations éditeur</h3>
            </div>
            <div className="divide-y divide-border/30">
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Éditeur</p>
                  <p className="text-xs text-muted-foreground">RunConnect SAS</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Contact</p>
                  <a 
                    href="mailto:ferdinand.froidefont@gmail.com"
                    className="text-xs text-primary"
                  >
                    ferdinand.froidefont@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Pays</p>
                  <p className="text-xs text-muted-foreground">France 🇫🇷</p>
                </div>
              </div>
            </div>
          </div>

          {/* Technologies */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Code className="h-5 w-5 text-cyan-500" />
                </div>
                <h3 className="font-semibold text-foreground">Technologies</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'Supabase', 'Google Maps', 'Firebase', 'Capacitor'].map((tech) => (
                  <span 
                    key={tech}
                    className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Crédits */}
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-foreground">Crédits</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Développé avec ❤️ par l'équipe RunConnect.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Icônes par Lucide React. Cartographie par Google Maps. 
              Authentification et base de données par Supabase.
            </p>
          </div>

          {/* Liens légaux */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold text-foreground">Mentions légales</h3>
            </div>
            <div className="divide-y divide-border/30">
              <button 
                onClick={() => navigate('/terms')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">Conditions d'utilisation</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigate('/privacy')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">Politique de confidentialité</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              © 2025 RunConnect. Tous droits réservés.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
