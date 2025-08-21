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
  HelpCircle
} from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog = ({ isOpen, onClose }: HelpDialogProps) => {
  const helpItems = [
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
      description: "Ce bouton ! Il affiche toutes les fonctionnalités disponibles sur cette page."
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

  const interactionTips = [
    "💡 Double-cliquez sur la carte pour créer une séance à cet endroit",
    "💡 Cliquez sur un marqueur pour voir les détails d'une séance", 
    "💡 Maintenez appuyé sur mobile pour créer une séance",
    "💡 Utilisez les filtres pour trouver exactement ce que vous cherchez"
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
            Découvrez toutes les fonctionnalités disponibles sur la page principale de RunConnect
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {helpItems.map((item, index) => (
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
            
            <Separator className="my-6" />
            
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