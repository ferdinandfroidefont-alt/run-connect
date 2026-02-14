import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
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
  Key,
  Image,
  Paperclip,
  UserPlus,
  Phone,
  Filter,
  ArrowLeft,
  ChevronRight,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeatureItem {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}

const FeatureRow = ({ item, isLast }: { item: FeatureItem; isLast: boolean }) => (
  <>
    <div className="flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors">
      <div className={`h-[30px] w-[30px] rounded-[7px] ${item.color} flex items-center justify-center shrink-0`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground">{item.title}</p>
        <p className="text-[13px] text-muted-foreground leading-snug">{item.description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
    </div>
    {!isLast && <div className="h-px bg-border ml-[54px]" />}
  </>
);

const FeatureSection = ({ title, emoji, features }: { title: string; emoji: string; features: FeatureItem[] }) => (
  <div className="space-y-2">
    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
      {emoji} {title}
    </h3>
    <div className="bg-card rounded-[10px] overflow-hidden">
      {features.map((item, index) => (
        <FeatureRow key={index} item={item} isLast={index === features.length - 1} />
      ))}
    </div>
  </div>
);

export const HelpDialog = ({ isOpen, onClose }: HelpDialogProps) => {
  const mapFeatures: FeatureItem[] = [
    {
      icon: <Search className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Barre de recherche",
      description: "Recherchez un lieu ou une séance par son nom"
    },
    {
      icon: <Bell className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF3B30]",
      title: "Notifications",
      description: "Demandes, acceptations et nouveaux messages"
    },
    {
      icon: <Settings className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#8E8E93]",
      title: "Paramètres",
      description: "Profil, confidentialité et abonnement"
    },
    {
      icon: <Calendar className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF9500]",
      title: "Calendrier",
      description: "Filtrer les séances par date"
    },
    {
      icon: <Users className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Filtre amis",
      description: "Voir uniquement les séances de vos amis"
    },
    {
      icon: <Plus className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Créer une séance",
      description: "Organiser votre propre activité sportive"
    },
    {
      icon: <PenTool className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#5856D6]",
      title: "Créer un itinéraire",
      description: "Dessiner un parcours personnalisé"
    },
    {
      icon: <MapPin className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF3B30]",
      title: "Ma position",
      description: "Centrer la carte sur votre position"
    },
    {
      icon: <Map className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Style de carte",
      description: "Classique, satellite, terrain ou sombre"
    },
    {
      icon: <ZoomIn className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#8E8E93]",
      title: "Contrôles de zoom",
      description: "Zoomer ou dézoomer sur la carte"
    },
    {
      icon: <Eye className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Vue 3D/Satellite",
      description: "Basculer entre les vues de la carte"
    }
  ];

  const profileFeatures: FeatureItem[] = [
    {
      icon: <User className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Mon Profil",
      description: "Gérer vos informations personnelles"
    },
    {
      icon: <Camera className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#5856D6]",
      title: "Photo de profil",
      description: "Changer et recadrer votre photo"
    },
    {
      icon: <Heart className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF3B30]",
      title: "Abonnés & Abonnements",
      description: "Consulter vos connexions sociales"
    },
    {
      icon: <Trophy className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FFCC00]",
      title: "Records personnels",
      description: "Vos meilleurs temps et distances"
    },
    {
      icon: <Route className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Mes itinéraires",
      description: "Gérer vos parcours créés"
    },
    {
      icon: <Share2 className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF9500]",
      title: "Partage de profil",
      description: "Partager via lien ou QR code"
    },
    {
      icon: <Shield className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Confidentialité",
      description: "Profil privé, statut en ligne..."
    },
    {
      icon: <Crown className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FFCC00]",
      title: "Abonnement Premium",
      description: "Fonctionnalités avancées"
    }
  ];

  const messageFeatures: FeatureItem[] = [
    {
      icon: <MessageCircle className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Conversations privées",
      description: "Messages privés avec vos amis"
    },
    {
      icon: <Users className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#5856D6]",
      title: "Clubs de discussion",
      description: "Créer ou rejoindre des groupes"
    },
    {
      icon: <Search className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#8E8E93]",
      title: "Recherche d'utilisateurs",
      description: "Trouver des personnes par nom"
    },
    {
      icon: <UserPlus className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Suggestions d'amis",
      description: "Découvrir via contacts et amis"
    },
    {
      icon: <Image className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF9500]",
      title: "Partage de médias",
      description: "Photos et fichiers dans les chats"
    },
    {
      icon: <Paperclip className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Partage de séances",
      description: "Envoyer des séances dans vos messages"
    },
    {
      icon: <Phone className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Accès aux contacts",
      description: "Trouver vos amis sur l'app"
    }
  ];

  const sessionFeatures: FeatureItem[] = [
    {
      icon: <Calendar className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#007AFF]",
      title: "Mes Séances",
      description: "Toutes vos séances organisées"
    },
    {
      icon: <Edit className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF9500]",
      title: "Modification de séances",
      description: "Modifier titre, lieu, participants..."
    },
    {
      icon: <Users className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#5856D6]",
      title: "Gestion des participants",
      description: "Liste des inscrits à vos séances"
    },
    {
      icon: <Trash2 className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF3B30]",
      title: "Suppression de séances",
      description: "Supprimer définitivement"
    },
    {
      icon: <Filter className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#8E8E93]",
      title: "Filtres de séances",
      description: "Trier par statut ou date"
    },
    {
      icon: <Route className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#34C759]",
      title: "Gestion d'itinéraires",
      description: "Vos parcours favoris"
    }
  ];

  const generalFeatures: FeatureItem[] = [
    {
      icon: <Bell className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF3B30]",
      title: "Notifications push",
      description: "Alertes pour messages et invitations"
    },
    {
      icon: <Sun className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FF9500]",
      title: "Thème sombre/clair",
      description: "Changer l'apparence de l'app"
    },
    {
      icon: <Volume2 className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#5856D6]",
      title: "Sons de l'interface",
      description: "Activer ou désactiver les sons"
    },
    {
      icon: <Key className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#8E8E93]",
      title: "Changement de mot de passe",
      description: "Réinitialiser via email"
    },
    {
      icon: <Trophy className="h-[18px] w-[18px] text-white" />,
      color: "bg-[#FFCC00]",
      title: "Classements",
      description: "Global, saisonnier et entre amis"
    }
  ];

  const tips = [
    "Double-cliquez sur la carte pour créer une séance",
    "Cliquez sur un marqueur pour voir les détails",
    "Maintenez appuyé sur mobile pour créer une séance",
    "Le badge rouge indique les messages non lus",
    "Autorisez les notifications pour ne rien rater"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen className="p-0 gap-0 bg-secondary">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col h-full"
        >
          {/* iOS Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border">
            <div className="flex items-center justify-between px-4 h-[56px]">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onClose}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-[17px] font-semibold">Guide des fonctionnalités</h1>
              <div className="w-9" />
            </div>
          </div>

          <ScrollArea className="flex-1 bg-pattern">
            <div className="px-4 py-6 space-y-6">
              <FeatureSection title="Page Carte" emoji="🗺️" features={mapFeatures} />
              <FeatureSection title="Page Profil" emoji="👤" features={profileFeatures} />
              <FeatureSection title="Page Messages" emoji="💬" features={messageFeatures} />
              <FeatureSection title="Mes Séances" emoji="🚴‍♂️" features={sessionFeatures} />
              <FeatureSection title="Fonctionnalités Générales" emoji="⚙️" features={generalFeatures} />

              {/* Tips Section */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  💡 Conseils
                </h3>
                <div className="bg-card rounded-[10px] overflow-hidden">
                  {tips.map((tip, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FFCC00] flex items-center justify-center shrink-0">
                          <Lightbulb className="h-[18px] w-[18px] text-white" />
                        </div>
                        <p className="text-[15px] text-foreground">{tip}</p>
                      </div>
                      {index < tips.length - 1 && <div className="h-px bg-border ml-[54px]" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
