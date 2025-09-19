import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Settings, 
  Search, 
  Calendar, 
  Users, 
  Plus, 
  PenTool, 
  MapPin, 
  Map,
  ZoomIn,
  Eye,
  HelpCircle,
  MessageCircle,
  Trophy,
  User,
  Heart,
  Share2,
  Route,
  Edit,
  Trash2,
  Camera,
  Shield,
  Crown,
  Volume2,
  Sun,
  Moon,
  Key,
  Mail,
  Upload,
  Send,
  Image,
  Paperclip,
  UserPlus,
  Phone,
  Clock,
  Filter,
  Save,
  X,
  MoreVertical
} from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog = ({ isOpen, onClose }: HelpDialogProps) => {
  const mapFeatures = [
    {
      icon: <Search className="h-5 w-5 text-primary" />,
      title: "Barre de recherche",
      description: "Recherchez un lieu spécifique ou une séance par son nom. Utilisez l'autocomplétion pour trouver rapidement votre destination."
    },
    {
      icon: <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-white font-semibold">U</div>,
      title: "Avatar utilisateur",
      description: "Votre photo de profil s'affiche au centre. Cliquez dessus pour accéder rapidement à vos informations."
    },
    {
      icon: <Bell className="h-5 w-5 text-primary" />,
      title: "Notifications",
      description: "Consultez vos notifications : demandes de participation aux séances, demandes d'amis, acceptations, etc. Un badge rouge indique les nouvelles notifications."
    },
    {
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      title: "Aide",
      description: "Ce bouton ! Il affiche toutes les fonctionnalités disponibles dans l'application."
    },
    {
      icon: <Settings className="h-5 w-5 text-primary" />,
      title: "Paramètres",
      description: "Accédez à votre profil, modifiez vos informations, gérez vos paramètres de confidentialité et votre abonnement."
    },
    {
      icon: <Calendar className="h-5 w-5 text-primary" />,
      title: "Calendrier",
      description: "Filtrez les séances par date. Cliquez sur le calendrier pour sélectionner un jour spécifique et voir uniquement les séances de cette date."
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: "Filtre amis",
      description: "Activez ce filtre pour voir uniquement les séances créées par vos amis ou les personnes que vous suivez."
    },
    {
      icon: <div className="w-5 h-5 bg-primary rounded text-xs text-white flex items-center justify-center font-semibold">C</div>,
      title: "Sélecteur de club",
      description: "Filtrez les séances par club. Rejoignez un club pour participer à des activités organisées en groupe."
    },
    {
      icon: <Plus className="h-5 w-5 text-primary" />,
      title: "Créer une séance",
      description: "Organisez votre propre séance sportive ! Choisissez l'activité, le type, l'intensité, l'heure et invitez d'autres participants."
    },
    {
      icon: <PenTool className="h-5 w-5 text-primary" />,
      title: "Créer un itinéraire",
      description: "Dessinez un parcours personnalisé sur la carte. Cliquez sur des points pour créer votre trajet avec calcul automatique de distance et dénivelé."
    },
    {
      icon: <MapPin className="h-5 w-5 text-primary" />,
      title: "Ma position",
      description: "Centrez la carte sur votre position actuelle. Nécessite l'autorisation de géolocalisation."
    },
    {
      icon: <Map className="h-5 w-5 text-primary" />,
      title: "Style de carte",
      description: "Changez l'apparence de la carte : vue classique, satellite, terrain, ou mode sombre selon vos préférences."
    },
    {
      icon: <ZoomIn className="h-5 w-5 text-primary" />,
      title: "Contrôles de zoom",
      description: "Zoomez ou dézoomez sur la carte. Utilisez aussi la molette de souris ou les gestes tactiles."
    },
    {
      icon: <Eye className="h-5 w-5 text-primary" />,
      title: "Vue 3D/Satellite",
      description: "Basculez entre la vue classique et la vue satellite pour une perspective différente de la zone."
    }
  ];

  const profileFeatures = [
    {
      icon: <User className="h-5 w-5 text-primary" />,
      title: "Mon Profil",
      description: "Gérez votre profil : nom d'utilisateur, photo, bio, âge et informations personnelles."
    },
    {
      icon: <Camera className="h-5 w-5 text-primary" />,
      title: "Photo de profil",
      description: "Changez votre photo de profil. Recadrez et ajustez votre image avant de la sauvegarder."
    },
    {
      icon: <Heart className="h-5 w-5 text-primary" />,
      title: "Abonnés & Abonnements",
      description: "Consultez vos abonnés et les personnes que vous suivez. Cliquez sur les avatars pour voir leur profil."
    },
    {
      icon: <Trophy className="h-5 w-5 text-primary" />,
      title: "Records personnels",
      description: "Enregistrez vos meilleurs temps et distances en course, vélo, natation et marche."
    },
    {
      icon: <Route className="h-5 w-5 text-primary" />,
      title: "Mes itinéraires",
      description: "Consultez, modifiez et supprimez vos itinéraires créés. Partagez vos parcours favoris."
    },
    {
      icon: <Share2 className="h-5 w-5 text-primary" />,
      title: "Partage de profil",
      description: "Partagez votre profil avec d'autres utilisateurs via un lien ou un QR code."
    },
    {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: "Confidentialité",
      description: "Gérez vos paramètres de confidentialité : profil privé, statut en ligne, suggestions d'amis."
    },
    {
      icon: <Crown className="h-5 w-5 text-primary" />,
      title: "Abonnement Premium",
      description: "Accédez aux fonctionnalités premium : fonctionnalités avancées, classements exclusifs."
    }
  ];

  const messageFeatures = [
    {
      icon: <MessageCircle className="h-5 w-5 text-primary" />,
      title: "Conversations privées",
      description: "Échangez des messages privés avec vos amis. Les messages sont organisés par conversation."
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: "Clubs de discussion",
      description: "Créez ou rejoignez des clubs pour discuter en groupe. Gérez les membres et organisez des activités."
    },
    {
      icon: <Search className="h-5 w-5 text-primary" />,
      title: "Recherche d'utilisateurs",
      description: "Trouvez des utilisateurs par nom ou pseudo pour commencer une conversation ou les suivre."
    },
    {
      icon: <UserPlus className="h-5 w-5 text-primary" />,
      title: "Suggestions d'amis",
      description: "Découvrez des amis grâce à vos contacts téléphoniques et aux amis communs."
    },
    {
      icon: <Image className="h-5 w-5 text-primary" />,
      title: "Partage de médias",
      description: "Partagez des photos, images et fichiers dans vos conversations privées et de groupe."
    },
    {
      icon: <Paperclip className="h-5 w-5 text-primary" />,
      title: "Partage de séances",
      description: "Partagez directement des séances sportives dans vos messages avec un aperçu interactif."
    },
    {
      icon: <Phone className="h-5 w-5 text-primary" />,
      title: "Accès aux contacts",
      description: "Autorisez l'accès à vos contacts pour trouver facilement vos amis qui utilisent l'app."
    }
  ];

  const sessionFeatures = [
    {
      icon: <Calendar className="h-5 w-5 text-primary" />,
      title: "Mes Séances",
      description: "Consultez toutes vos séances organisées : à venir, terminées ou en cours."
    },
    {
      icon: <Edit className="h-5 w-5 text-primary" />,
      title: "Modification de séances",
      description: "Modifiez les détails de vos séances : titre, description, type d'activité, lieu et participants max."
    },
    {
      icon: <Upload className="h-5 w-5 text-primary" />,
      title: "Images de séances",
      description: "Ajoutez ou changez l'image de vos séances pour les rendre plus attractives."
    },
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: "Gestion des participants",
      description: "Consultez la liste des participants inscrits à vos séances avec leurs profils."
    },
    {
      icon: <Trash2 className="h-5 w-5 text-primary" />,
      title: "Suppression de séances",
      description: "Supprimez définitivement vos séances si nécessaire. Cette action est irréversible."
    },
    {
      icon: <Filter className="h-5 w-5 text-primary" />,
      title: "Filtres de séances",
      description: "Filtrez vos séances par statut : toutes, à venir, ou terminées pour une meilleure organisation."
    },
    {
      icon: <Route className="h-5 w-5 text-primary" />,
      title: "Gestion d'itinéraires",
      description: "Consultez, modifiez et supprimez vos itinéraires créés. Organisez vos parcours favoris."
    }
  ];

  const generalFeatures = [
    {
      icon: <Bell className="h-5 w-5 text-primary" />,
      title: "Notifications push",
      description: "Recevez des notifications pour les demandes d'amis, invitations aux séances et nouveaux messages."
    },
    {
      icon: <Sun className="h-5 w-5 text-primary" />,
      title: "Thème sombre/clair", 
      description: "Basculez entre le mode sombre et clair selon vos préférences visuelles."
    },
    {
      icon: <Volume2 className="h-5 w-5 text-primary" />,
      title: "Sons de l'interface",
      description: "Activez ou désactivez les sons des interactions dans l'application."
    },
    {
      icon: <Key className="h-5 w-5 text-primary" />,
      title: "Changement de mot de passe",
      description: "Réinitialisez votre mot de passe en recevant un email de confirmation."
    },
    {
      icon: <Trophy className="h-5 w-5 text-primary" />,
      title: "Classements",
      description: "Consultez les classements global, saisonnier et entre amis basés sur vos points d'activité."
    }
  ];

  const interactionTips = [
    "💡 Double-cliquez sur la carte pour créer une séance à cet endroit",
    "💡 Cliquez sur un marqueur pour voir les détails d'une séance", 
    "💡 Maintenez appuyé sur mobile pour créer une séance",
    "💡 Cliquez sur les avatars dans les listes pour voir les profils utilisateurs",
    "💡 Utilisez les filtres pour trouver exactement ce que vous cherchez",
    "💡 Glissez vers la gauche/droite dans les conversations pour accéder aux actions rapides",
    "💡 Le badge rouge sur Messages indique le nombre de messages non lus",
    "💡 Autorisez les notifications pour ne rater aucune invitation ou message"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Guide des fonctionnalités
          </DialogTitle>
          <DialogDescription>
            Découvrez toutes les fonctionnalités disponibles dans RunConnect
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Fonctionnalités de la carte */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                🗺️ Page Carte
              </h3>
              <div className="space-y-3">
                {mapFeatures.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Fonctionnalités du profil */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                👤 Page Profil
              </h3>
              <div className="space-y-3">
                {profileFeatures.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Fonctionnalités des messages */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                💬 Page Messages
              </h3>
              <div className="space-y-3">
                {messageFeatures.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Fonctionnalités des séances */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                🚴‍♂️ Page Mes Séances
              </h3>
              <div className="space-y-3">
                {sessionFeatures.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Fonctionnalités générales */}
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                ⚙️ Fonctionnalités Générales
              </h3>
              <div className="space-y-3">
                {generalFeatures.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <span>💡</span>
                Conseils d'utilisation
              </h4>
              {interactionTips.map((tip, index) => (
                <p key={index} className="text-sm text-muted-foreground pl-6">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};