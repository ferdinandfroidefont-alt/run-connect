import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { androidPermissions } from "@/lib/androidPermissions";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Settings, MapPin, Camera, Users, Bell, AlertTriangle } from "lucide-react";

interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  version?: string;
  sdkInt?: number;
  isMIUI?: boolean;
  brand?: string;
}

export const MIUIPermissionsHelper = () => {
  const { toast } = useToast();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionTests, setPermissionTests] = useState({
    location: false,
    camera: false,
    contacts: false,
    notifications: false,
  });

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      if (androidPermissions.isAndroid()) {
        const info = await androidPermissions.getDeviceInfo();
        setDeviceInfo(info);
        console.log('🔥 Device Info:', info);
      }
    } catch (error) {
      console.error('Error loading device info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testLocationPermission = async () => {
    try {
      const granted = await androidPermissions.forceRequestLocationPermissions();
      setPermissionTests(prev => ({ ...prev, location: granted }));
      
      if (!granted && deviceInfo?.isMIUI) {
        toast({
          title: "MIUI détecté",
          description: "Pour Xiaomi/Redmi: Allez dans Paramètres > Applications > RunConnect > Autorisations > Localisation > Autoriser",
          variant: "destructive",
          duration: 10000
        });
      }
    } catch (error) {
      console.error('Error testing location:', error);
    }
  };

  const testCameraPermission = async () => {
    try {
      const granted = await androidPermissions.forceRequestCameraPermissions();
      setPermissionTests(prev => ({ ...prev, camera: granted }));
      
      if (!granted && deviceInfo?.isMIUI) {
        toast({
          title: "MIUI détecté",
          description: "Pour Xiaomi/Redmi: Allez dans Paramètres > Applications > RunConnect > Autorisations > Appareil photo > Autoriser",
          variant: "destructive",
          duration: 10000
        });
      }
    } catch (error) {
      console.error('Error testing camera:', error);
    }
  };

  const testContactsPermission = async () => {
    try {
      const granted = await androidPermissions.forceRequestContactsPermissions();
      setPermissionTests(prev => ({ ...prev, contacts: granted }));
      
      if (!granted && deviceInfo?.isMIUI) {
        toast({
          title: "MIUI détecté",
          description: "Pour Xiaomi/Redmi: Allez dans Paramètres > Applications > RunConnect > Autorisations > Contacts > Autoriser",
          variant: "destructive",
          duration: 10000
        });
      }
    } catch (error) {
      console.error('Error testing contacts:', error);
    }
  };

  const testNotificationPermission = async () => {
    try {
      const result = await androidPermissions.requestNotificationPermissions();
      setPermissionTests(prev => ({ ...prev, notifications: result.granted }));
      
      if (!result.granted && deviceInfo?.isMIUI) {
        toast({
          title: "MIUI détecté",
          description: "Pour Xiaomi/Redmi: Allez dans Paramètres > Applications > RunConnect > Notifications > Autoriser + Paramètres > Notifications > RunConnect > Activer",
          variant: "destructive",
          duration: 12000
        });
      }
    } catch (error) {
      console.error('Error testing notifications:', error);
    }
  };

  const openAppSettings = async () => {
    try {
      await androidPermissions.openAppSettings();
      toast({
        title: "Paramètres ouverts",
        description: "Activez manuellement les permissions nécessaires"
      });
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Détection de l'appareil...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!androidPermissions.isAndroid()) {
    return null;
  }

  const isMIUI = deviceInfo?.isMIUI || deviceInfo?.manufacturer?.toLowerCase().includes('xiaomi') || deviceInfo?.brand?.toLowerCase().includes('redmi');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Diagnostic Permissions Android
          {isMIUI && <Badge variant="destructive">MIUI</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Info */}
        {deviceInfo && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm"><strong>Marque:</strong> {deviceInfo.manufacturer || 'Inconnue'}</p>
            <p className="text-sm"><strong>Modèle:</strong> {deviceInfo.model || 'Inconnu'}</p>
            <p className="text-sm"><strong>Android:</strong> {deviceInfo.version || 'Inconnue'} (API {deviceInfo.sdkInt || 'Inconnue'})</p>
            {isMIUI && <p className="text-sm text-destructive"><strong>MIUI:</strong> Détecté</p>}
          </div>
        )}

        {/* MIUI Warning */}
        {isMIUI && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Appareil Xiaomi/Redmi détecté!</strong><br/>
              Ces appareils nécessitent une configuration manuelle des permissions. 
              Les permissions doivent être activées dans les paramètres Android ET dans les paramètres MIUI.
            </AlertDescription>
          </Alert>
        )}

        {/* Permission Tests */}
        <div className="space-y-3">
          <h4 className="font-semibold">Tests de Permissions</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={testLocationPermission}
              variant={permissionTests.location ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Localisation
              {permissionTests.location && " ✓"}
            </Button>

            <Button
              onClick={testCameraPermission}
              variant={permissionTests.camera ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Caméra
              {permissionTests.camera && " ✓"}
            </Button>

            <Button
              onClick={testContactsPermission}
              variant={permissionTests.contacts ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Contacts
              {permissionTests.contacts && " ✓"}
            </Button>

            <Button
              onClick={testNotificationPermission}
              variant={permissionTests.notifications ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {permissionTests.notifications && " ✓"}
            </Button>
          </div>
        </div>

        {/* Settings Button */}
        <Button 
          onClick={openAppSettings}
          variant="secondary"
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          Ouvrir les Paramètres de l'App
        </Button>

        {/* MIUI Instructions */}
        {isMIUI && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <h5 className="font-semibold text-yellow-800 mb-2">Instructions spéciales MIUI:</h5>
            <ol className="text-xs text-yellow-700 space-y-1">
              <li>1. Ouvrez les Paramètres Android</li>
              <li>2. Allez dans Applications → RunConnect</li>
              <li>3. Touchez "Autorisations"</li>
              <li>4. Activez TOUTES les permissions nécessaires</li>
              <li>5. Redémarrez l'application</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};