import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSupportEmail, getSupportMailtoHref, LEGAL_LAST_UPDATED_LABEL } from "@/lib/legalMeta";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-x-hidden">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/95 border-b border-border/50 dark:border-[#1f1f1f] dark:bg-black dark:backdrop-blur-none">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Politique de confidentialité</h1>
            <p className="text-xs text-muted-foreground">RunConnect</p>
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {/* Date de mise à jour */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Dernière mise à jour : {LEGAL_LAST_UPDATED_LABEL}</span>
          </div>

          {/* Introduction */}
          <div className="space-y-3 p-6 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-base leading-relaxed">
              Bienvenue sur <strong className="text-primary">RunConnect</strong>, une application 
              développée pour la communauté sportive.
            </p>
            <p className="text-base leading-relaxed">
              Cette politique explique comment nous collectons, utilisons et protégeons vos données 
              personnelles conformément au <strong>Règlement Général sur la Protection des Données (RGPD)</strong> et 
              aux exigences de Google Play.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">1. Données collectées</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p>RunConnect collecte uniquement les données nécessaires à votre expérience :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>votre adresse e-mail et votre pseudonyme pour la création du compte ;</li>
                <li>vos performances sportives (séances, parcours, chronos) ;</li>
                <li>vos préférences (notifications, langue, paramètres de profil) ;</li>
                <li>vos données de localisation uniquement pendant l'utilisation des fonctions de carte.</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold">2. Utilisation des données</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p>Vos données sont utilisées uniquement pour :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>personnaliser votre expérience RunConnect ;</li>
                <li>afficher vos activités sur la carte ;</li>
                <li>permettre la synchronisation avec Strava, Instagram ou vos contacts ;</li>
                <li>améliorer la qualité et la sécurité du service ;</li>
                <li>
                  réaliser des statistiques d&apos;audience de l&apos;application lorsque vous y consentez (réglable dans
                  les paramètres, section confidentialité).
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">3. Stockage et sécurité</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p>
                Les données sont hébergées de manière sécurisée sur <strong className="text-foreground">Supabase</strong>, 
                une plateforme conforme au RGPD, avec hébergement dans l'Union Européenne.
              </p>
              <p className="font-medium text-foreground">
                Aucune donnée n'est vendue, partagée ou transférée à des tiers sans votre consentement explicite.
              </p>
              <p>
                Sur votre appareil, l&apos;application peut enregistrer localement (navigateur ou stockage de
                l&apos;app) la dernière position utilisée pour centrer la carte d&apos;accueil, afin d&apos;améliorer
                la réactivité ; ces coordonnées ne sont pas envoyées à nos serveurs pour ce seul usage.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">4. Vos droits</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p>Vous pouvez à tout moment :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>consulter vos informations personnelles ;</li>
                <li>modifier ou supprimer votre compte ;</li>
                <li>retirer votre consentement via "Révoquer mon consentement" dans les paramètres.</li>
              </ul>
              <p className="pt-2 border-t border-border/50 font-medium text-foreground">
                Toute demande de suppression est traitée sous 30 jours.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold">5. Notifications et autorisations</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p>L'application peut demander l'accès à certaines fonctionnalités :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-foreground">Localisation</strong> : pour suivre vos parcours.</li>
                <li><strong className="text-foreground">Notifications</strong> : pour vous avertir des nouveaux messages ou séances.</li>
              </ul>
              <p className="pt-2 border-t border-border/50 font-medium text-foreground">
                Ces autorisations ne sont activées qu'avec votre accord.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">6. Contact</h2>
            </div>
            <div className="pl-13 space-y-3">
              <p className="text-muted-foreground">
                Pour toute question ou demande concernant vos données :
              </p>
              <a 
                href={getSupportMailtoHref()}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="font-medium">{getSupportEmail()}</span>
              </a>
            </div>
          </div>

          {/* Section 7 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold">7. Acceptation</h2>
            </div>
            <div className="pl-13 space-y-3 text-muted-foreground">
              <p className="font-medium text-foreground">
                En utilisant RunConnect, vous acceptez cette politique de confidentialité et consentez 
                au traitement de vos données conformément au RGPD.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 pb-6 text-center">
            <Button
              onClick={() => navigate(-1)}
              size="lg"
              className="min-w-[200px]"
            >
              Retour aux paramètres
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
