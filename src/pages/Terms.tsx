import { ArrowLeft, FileText, CheckCircle, UserCheck, Shield, AlertTriangle, Scale, RefreshCw, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();
  const lastUpdate = "15 janvier 2025";

  const sections = [
    {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      title: "1. Acceptation des conditions",
      content: `En téléchargeant, installant ou utilisant l'application RunConnect, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.

Ces conditions constituent un accord juridique entre vous et RunConnect SAS concernant votre utilisation de l'application et de ses services.`
    },
    {
      icon: UserCheck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      title: "2. Utilisation du service",
      content: `RunConnect est une plateforme sociale permettant aux utilisateurs d'organiser et de participer à des activités sportives. En utilisant notre service, vous vous engagez à :

• Fournir des informations exactes lors de votre inscription
• Maintenir la confidentialité de vos identifiants de connexion
• Ne pas utiliser le service à des fins illégales ou non autorisées
• Respecter les autres utilisateurs et maintenir un comportement approprié
• Ne pas publier de contenu offensant, discriminatoire ou inapproprié
• Ne pas tenter de compromettre la sécurité de l'application`
    },
    {
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      title: "3. Comptes utilisateurs",
      content: `Pour utiliser certaines fonctionnalités de RunConnect, vous devez créer un compte. Vous êtes responsable de :

• La sécurité de votre compte et de votre mot de passe
• Toutes les activités effectuées sous votre compte
• Nous informer immédiatement de toute utilisation non autorisée

Nous nous réservons le droit de suspendre ou de supprimer les comptes qui violent ces conditions ou qui restent inactifs pendant une période prolongée.`
    },
    {
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      title: "4. Contenu utilisateur",
      content: `Vous conservez tous les droits sur le contenu que vous publiez sur RunConnect. En publiant du contenu, vous nous accordez une licence non exclusive pour l'utiliser dans le cadre de nos services.

Nous nous réservons le droit de :
• Modérer et supprimer tout contenu inapproprié
• Suspendre les comptes en cas de violation répétée
• Signaler aux autorités tout contenu illégal

Vous êtes seul responsable du contenu que vous publiez et de ses conséquences.`
    },
    {
      icon: Scale,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      title: "5. Propriété intellectuelle",
      content: `L'application RunConnect, son code source, son design, ses logos et tout son contenu sont la propriété exclusive de RunConnect SAS et sont protégés par les lois sur la propriété intellectuelle.

Vous n'êtes pas autorisé à :
• Copier, modifier ou distribuer l'application
• Décompiler ou désassembler le code source
• Utiliser nos marques sans autorisation écrite
• Créer des œuvres dérivées basées sur notre application`
    },
    {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      title: "6. Limitation de responsabilité",
      content: `RunConnect est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas responsables :

• Des dommages résultant de l'utilisation de l'application
• Des interactions entre utilisateurs lors des activités sportives
• Des blessures ou accidents survenant lors des séances
• De l'exactitude des informations fournies par les utilisateurs
• Des interruptions de service ou des pertes de données

Vous utilisez l'application à vos propres risques. Consultez un médecin avant de pratiquer toute activité sportive.`
    },
    {
      icon: RefreshCw,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      title: "7. Modifications des conditions",
      content: `Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication dans l'application.

Nous vous informerons des changements importants par :
• Une notification dans l'application
• Un email à l'adresse associée à votre compte

Votre utilisation continue de l'application après modification constitue votre acceptation des nouvelles conditions.`
    },
    {
      icon: Trash2,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      title: "8. Résiliation",
      content: `Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application. La suppression entraîne :

• L'effacement de vos données personnelles
• La perte d'accès à votre historique et vos statistiques
• L'annulation de votre participation aux séances futures

Nous pouvons résilier votre compte en cas de violation de ces conditions, sans préavis ni remboursement.`
    },
    {
      icon: Globe,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
      title: "9. Droit applicable",
      content: `Ces conditions sont régies par le droit français. Tout litige relatif à l'interprétation ou à l'exécution de ces conditions sera soumis aux tribunaux compétents de Paris, France.

Pour les utilisateurs de l'Union Européenne, les dispositions du RGPD s'appliquent concernant la protection des données personnelles.

En cas de conflit entre ces conditions et les lois locales, les lois locales prévalent dans la mesure où elles sont plus protectrices pour l'utilisateur.`
    }
  ];

  return (
    <div className="fixed inset-0 bg-secondary flex flex-col bg-pattern overflow-x-hidden">
      {/* Header fixe style iOS */}
      <div className="sticky top-0 z-50 bg-card border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Conditions d'utilisation</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 pb-24 space-y-4">
          {/* En-tête */}
          <div className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">CGU RunConnect</h2>
                <p className="text-xs text-muted-foreground">
                  Dernière mise à jour : {lastUpdate}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Veuillez lire attentivement ces conditions générales d'utilisation 
              avant d'utiliser l'application RunConnect.
            </p>
          </div>

          {/* Sections */}
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${section.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            );
          })}

          {/* Contact */}
          <div className="bg-card rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-2">Contact</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour toute question concernant ces conditions, contactez-nous à{' '}
              <a 
                href="mailto:ferdinand.froidefont@gmail.com" 
                className="text-primary font-medium"
              >
                ferdinand.froidefont@gmail.com
              </a>
            </p>
          </div>

          {/* Bouton retour */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
          >
            Retour aux paramètres
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
