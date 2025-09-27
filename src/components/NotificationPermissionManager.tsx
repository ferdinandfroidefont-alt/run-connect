import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotificationsEnhanced } from '@/hooks/usePushNotificationsEnhanced';
import { useAuth } from '@/hooks/useAuth';
import { Bell, BellOff, Smartphone, Globe, CheckCircle, XCircle, AlertCircle, TestTube2 } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';

export const NotificationPermissionManager = () => {
  const { user } = useAuth();
  const {
    isRegistered,
    token,
    permissionStatus,
    requestPermissions,
    isNative,
    isSupported,
    testNotification
  } = usePushNotificationsEnhanced();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      const success = await requestPermissions();
      if (success) {
        enhancedToast.success({
          title: 'Permissions accordées',
          description: 'Les notifications push sont maintenant actives!'
        });
      }
    } catch (error) {
      enhancedToast.error({
        title: 'Erreur',
        description: 'Impossible de demander les permissions'
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await testNotification();
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (permissionStatus.granted && isRegistered) {
      return <CheckCircle className="h-5 w-5 text-success" />;
    } else if (permissionStatus.denied) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusText = () => {
    if (permissionStatus.granted && isRegistered) {
      return 'Actives';
    } else if (permissionStatus.denied) {
      return 'Refusées';
    } else {
      return 'En attente';
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (permissionStatus.granted && isRegistered) {
      return 'default';
    } else if (permissionStatus.denied) {
      return 'destructive';
    } else {
      return 'secondary';
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Connectez-vous pour gérer les notifications
        </AlertDescription>
      </Alert>
    );
  }

  if (!isSupported) {
    return (
      <Alert>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          Les notifications push ne sont pas supportées sur ce dispositif.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications Push
          </CardTitle>
          <CardDescription>
            Configurez les notifications push pour rester informé de l'activité de RunConnect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {isNative ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isNative ? 'Application native' : 'Navigateur web'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={getStatusVariant()}>
                {getStatusText()}
              </Badge>
            </div>

            {token && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Token enregistré</span>
              </div>
            )}
          </div>

          {/* Token Preview */}
          {token && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Token de notification:</p>
              <code className="text-xs text-muted-foreground break-all">
                {token.substring(0, 50)}...
              </code>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!permissionStatus.granted && (
              <Button
                onClick={handleRequestPermissions}
                disabled={isRequesting || permissionStatus.denied}
                className="flex-1"
              >
                {isRequesting ? 'Demande en cours...' : 'Activer les notifications'}
              </Button>
            )}

            {permissionStatus.granted && isRegistered && (
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="flex items-center gap-2"
              >
                <TestTube2 className="h-4 w-4" />
                {isTesting ? 'Test en cours...' : 'Tester les notifications'}
              </Button>
            )}
          </div>

          {/* Permissions denied help */}
          {permissionStatus.denied && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Permissions refusées</p>
                  <p className="text-sm">
                    Pour activer les notifications, vous devez:
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {isNative ? (
                      <>
                        <li>Aller dans les paramètres de votre téléphone</li>
                        <li>Chercher "RunConnect" dans les applications</li>
                        <li>Activer les notifications</li>
                        <li>Redémarrer l'application</li>
                      </>
                    ) : (
                      <>
                        <li>Cliquer sur l'icône de cadenas dans la barre d'adresse</li>
                        <li>Autoriser les notifications pour ce site</li>
                        <li>Recharger la page</li>
                      </>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="bg-muted/30 p-3 rounded-lg">
              <summary className="text-sm font-medium cursor-pointer">
                Informations de débogage
              </summary>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>Native: {isNative ? 'Oui' : 'Non'}</p>
                <p>Supporté: {isSupported ? 'Oui' : 'Non'}</p>
                <p>Enregistré: {isRegistered ? 'Oui' : 'Non'}</p>
                <p>Permission granted: {permissionStatus.granted ? 'Oui' : 'Non'}</p>
                <p>Permission denied: {permissionStatus.denied ? 'Oui' : 'Non'}</p>
                <p>Permission prompt: {permissionStatus.prompt ? 'Oui' : 'Non'}</p>
                <p>Token: {token ? 'Présent' : 'Absent'}</p>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};