import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  MapPin, 
  Camera, 
  Users, 
  Bell, 
  Settings, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { getManufacturerGuide, getGenericSteps } from '@/lib/manufacturerPermissionGuides';
import { androidPermissions } from '@/lib/androidPermissions';

interface ManufacturerPermissionGuideProps {
  deviceInfo?: any;
  permissionType: 'location' | 'camera' | 'contacts' | 'notifications';
  onClose?: () => void;
}

export const ManufacturerPermissionGuide: React.FC<ManufacturerPermissionGuideProps> = ({
  deviceInfo,
  permissionType,
  onClose
}) => {
  const guide = getManufacturerGuide(deviceInfo);
  const isSpecialDevice = guide !== null;

  const getIcon = () => {
    switch (permissionType) {
      case 'location': return <MapPin className="h-5 w-5" />;
      case 'camera': return <Camera className="h-5 w-5" />;
      case 'contacts': return <Users className="h-5 w-5" />;
      case 'notifications': return <Bell className="h-5 w-5" />;
    }
  };

  const getSteps = () => {
    if (!guide) return getGenericSteps(permissionType);
    
    switch (permissionType) {
      case 'location': return guide.locationSteps;
      case 'camera': return guide.cameraSteps;
      case 'contacts': return guide.contactsSteps;
      case 'notifications': return guide.notificationSteps;
    }
  };

  const getPermissionName = () => {
    switch (permissionType) {
      case 'location': return 'Géolocalisation';
      case 'camera': return 'Appareil photo';
      case 'contacts': return 'Contacts';
      case 'notifications': return 'Notifications';
    }
  };

  const handleOpenSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
    } catch (error) {
      console.error('Erreur ouverture paramètres:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <CardTitle>Guide des permissions - {getPermissionName()}</CardTitle>
            {guide && (
              <Badge variant="secondary" className="mt-1">
                <Smartphone className="h-3 w-3 mr-1" />
                {guide.displayName}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations appareil */}
        {deviceInfo && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Appareil détecté:</strong> {deviceInfo.manufacturer} {deviceInfo.model} 
              (Android {deviceInfo.version})
              {isSpecialDevice && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Nécessite configuration manuelle
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Étapes à suivre */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Étapes à suivre:
          </h3>
          <div className="space-y-2">
            {getSteps().map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-2 bg-muted/50 rounded-md">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conseils spécifiques */}
        {guide?.specificAdvice && guide.specificAdvice.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Conseils spécifiques {guide.displayName}:
              </h3>
              <div className="space-y-2">
                {guide.specificAdvice.map((advice, index) => (
                  <Alert key={index} variant="default">
                    <AlertDescription className="text-sm">
                      • {advice}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleOpenSettings}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Ouvrir les paramètres
          </Button>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fermer le guide
            </Button>
          )}
        </div>

        {/* Note générale */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Important:</strong> Après avoir modifié les permissions, vous devrez peut-être 
            redémarrer l'application ou votre téléphone pour que les changements prennent effet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};