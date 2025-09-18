import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";

export const ContactsPermissionButton = () => {
  const { isNative, hasPermission, requestPermissions } = useContacts();
  const { toast } = useToast();

  // Debug logs
  console.log('🔍 ContactsPermissionButton render - isNative:', isNative, 'hasPermission:', hasPermission);

  const handleRequestPermission = async () => {
    console.log('🔍 ContactsPermissionButton - handleRequestPermission called');
    console.log('🔍 isNative:', isNative);
    
    if (!isNative) {
      toast({
        title: "Fonction mobile uniquement",
        description: "L'accès aux contacts n'est disponible que sur l'application mobile",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔍 Requesting permissions...');
      const granted = await requestPermissions();
      console.log('🔍 Permission granted:', granted);
      
      if (granted) {
        toast({
          title: "Contacts autorisés",
          description: "Vous verrez maintenant de meilleures suggestions d'amis"
        });
      } else {
        // Ouvrir les paramètres Android si la permission échoue
        const { androidPermissions } = await import('@/lib/androidPermissions');
        const opened = await androidPermissions.openAppSettings();
        
        toast({
          title: "Paramètres ouverts",
          description: opened 
            ? "Activez l'accès aux contacts dans les paramètres Android puis revenez dans l'app."
            : "Allez dans Paramètres > Applications > RunConnect > Autorisations > Contacts",
          variant: opened ? "default" : "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error requesting contacts permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder aux contacts. Vérifiez que vous êtes sur l'application mobile.",
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
            {isNative ? "Trouvez vos amis dans vos contacts" : "Disponible uniquement sur mobile"}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequestPermission}
        disabled={hasPermission && isNative}
      >
        {isNative ? (hasPermission ? 'Autorisé' : 'Autoriser') : 'Mobile uniquement'}
      </Button>
    </div>
  );
};