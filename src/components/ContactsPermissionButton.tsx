import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";

export const ContactsPermissionButton = () => {
  const { isNative, hasPermission, requestPermissions } = useContacts();
  const { toast } = useToast();

  // Only show on native platforms
  if (!isNative) return null;

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        toast({
          title: "Contacts autorisés",
          description: "Vous verrez maintenant de meilleures suggestions d'amis"
        });
      } else {
        toast({
          title: "Permission refusée",
          description: "Vous pouvez activer l'accès aux contacts dans les paramètres de votre téléphone",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder aux contacts",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Smartphone className="h-4 w-4" />
        <div className="grid gap-1.5">
          <label className="text-sm font-medium leading-none">
            Accès aux contacts
          </label>
          <p className="text-xs text-muted-foreground">
            Trouvez vos amis dans vos contacts
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequestPermission}
        disabled={hasPermission}
      >
        {hasPermission ? 'Autorisé' : 'Autoriser'}
      </Button>
    </div>
  );
};