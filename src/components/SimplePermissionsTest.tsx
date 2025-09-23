import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Camera, 
  Users, 
  Bell, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

export const SimplePermissionsTest = () => {
  const [open, setOpen] = useState(false);
  const {
    permissions,
    testing,
    testLocationPermission,
    testCameraPermission,
    testContactsPermission,
    testNotificationsPermission,
    testAllPermissions,
    resetPermissions,
    getPermissionSummary
  } = usePermissions();
  const { toast } = useToast();

  const summary = getPermissionSummary();

  const getStatusIcon = (granted: boolean, tested: boolean) => {
    if (!tested) return <Clock className="h-4 w-4 text-muted-foreground" />;
    return granted ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> :
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (granted: boolean, tested: boolean) => {
    if (!tested) return <Badge variant="secondary">Non testé</Badge>;
    return granted ?
      <Badge className="bg-green-500">✅ OK</Badge> :
      <Badge variant="destructive">❌ Échec</Badge>;
  };

  const permissionItems = [
    {
      key: 'location',
      icon: MapPin,
      label: 'Géolocalisation',
      description: 'Accès à votre position',
      test: testLocationPermission
    },
    {
      key: 'camera',
      icon: Camera,
      label: 'Caméra/Photos',
      description: 'Accès caméra et galerie',
      test: testCameraPermission
    },
    {
      key: 'contacts',
      icon: Users,
      label: 'Contacts',
      description: 'Accès aux contacts',
      test: testContactsPermission
    },
    {
      key: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Notifications push',
      test: testNotificationsPermission
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TestTube className="h-4 w-4" />
          Test Permissions
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Permissions Simplifiées
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Permissions testées:</span>
                <span className="font-medium">{summary.tested}/{summary.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Permissions accordées:</span>
                <span className="font-medium">{summary.granted}/{summary.tested || 1}</span>
              </div>
              <Progress 
                value={summary.percentage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {summary.percentage}% de réussite
              </p>
            </CardContent>
          </Card>

          {/* Tests individuels */}
          <div className="space-y-3">
            {permissionItems.map((item) => {
              const perm = permissions[item.key as keyof typeof permissions];
              const Icon = item.icon;
              
              return (
                <Card key={item.key} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{item.label}</span>
                      {getStatusIcon(perm.granted, perm.tested)}
                    </div>
                    {getStatusBadge(perm.granted, perm.tested)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.description}
                  </p>
                  
                  {perm.error && (
                    <p className="text-xs text-red-600 mb-2">
                      {perm.error}
                    </p>
                  )}
                  
                  <Button
                    onClick={item.test}
                    disabled={testing}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    {testing ? 'Test...' : 'Tester'}
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Actions globales */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={testAllPermissions}
              disabled={testing}
              className="flex-1"
            >
              {testing ? 'Test en cours...' : 'Tester Tout'}
            </Button>
            
            <Button
              onClick={resetPermissions}
              disabled={testing}
              variant="outline"
            >
              Reset
            </Button>
          </div>

          {/* Info debug */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>UserAgent: {navigator.userAgent.slice(0, 50)}...</p>
              <p>Platform: {navigator.platform}</p>
              <p>Location: {window.location.hostname}</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};