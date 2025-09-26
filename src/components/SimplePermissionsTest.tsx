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

  return null;
};