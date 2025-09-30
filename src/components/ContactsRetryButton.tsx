import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useContactsWithRetry } from '@/hooks/useContactsWithRetry';
import { RefreshCw, Settings, Contact, Check, X, Clock, Smartphone } from 'lucide-react';

export const ContactsRetryButton = () => {
  const [open, setOpen] = useState(false);
  const {
    hasPermission,
    isNative,
    loading,
    isChecking,
    retryCount,
    lastCheckTime,
    requestPermissions,
    recheckPermissions,
    checkContactsPermissionsNow,
    openDeviceSettings,
    resetState
  } = useContactsWithRetry();

  const getStatusColor = () => {
    if (loading || isChecking) return 'secondary';
    if (hasPermission) return 'default';
    return 'destructive';
  };

  const getStatusText = () => {
    if (loading) return 'Demande en cours...';
    if (isChecking) return 'Vérification...';
    if (hasPermission) return 'Autorisé';
    return 'Non autorisé';
  };

  const formatLastCheck = () => {
    if (!lastCheckTime) return 'Jamais';
    const ago = Math.round((Date.now() - lastCheckTime) / 1000);
    if (ago < 60) return `Il y a ${ago}s`;
    if (ago < 3600) return `Il y a ${Math.round(ago / 60)}min`;
    return `Il y a ${Math.round(ago / 3600)}h`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasPermission ? "default" : "destructive"}
          size="sm"
          className="gap-2"
        >
          <Contact className="h-4 w-4" />
          Contacts
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Contact className="h-5 w-5" />
            Gestion Permissions Contacts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statut actuel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {hasPermission ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                Statut Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>État :</span>
                <Badge variant={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Mode :</span>
                <Badge variant={isNative ? "default" : "secondary"}>
                  {isNative ? "Natif" : "Web"}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Dernière vérif :</span>
                <span className="text-muted-foreground">
                  {formatLastCheck()}
                </span>
              </div>
              
              {retryCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tentatives :</span>
                  <span className="text-muted-foreground">
                    {retryCount}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={requestPermissions}
              disabled={loading || isChecking || !isNative}
              className="w-full gap-2"
              variant={hasPermission ? "outline" : "default"}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Contact className="h-4 w-4" />
              )}
              {hasPermission ? 'Redemander' : 'Demander'} Permissions
            </Button>

            <Button
              onClick={recheckPermissions}
              disabled={isChecking || !isNative}
              variant="outline"
              className="w-full gap-2"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-vérifier Maintenant
            </Button>

            <Button
              onClick={checkContactsPermissionsNow}
              disabled={!isNative}
              variant="secondary"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Forcer la Vérification
            </Button>

            {!hasPermission && isNative && (
              <Button
                onClick={openDeviceSettings}
                variant="secondary"
                className="w-full gap-2"
              >
                <Settings className="h-4 w-4" />
                Ouvrir Paramètres
              </Button>
            )}
          </div>

          {/* Instructions */}
          {!hasPermission && isNative && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Si les permissions ne sont pas détectées :</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Appuyez sur "Ouvrir Paramètres"</li>
                  <li>Allez dans "Autorisations" ou "Permissions"</li>
                  <li>Activez "Contacts"</li>
                  <li>Revenez à l'app (vérification auto)</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {!isNative && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 text-sm text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p>Les contacts ne sont disponibles qu'en mode natif (application mobile)</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              onClick={resetState}
              variant="ghost"
              size="sm"
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              className="flex-1"
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};