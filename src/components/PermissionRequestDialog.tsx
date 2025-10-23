import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, MapPin, Camera, Users } from 'lucide-react';
import { useMultiplatformPermissions } from '@/hooks/useMultiplatformPermissions';
import { Capacitor } from '@capacitor/core';

export const PermissionRequestDialog = () => {
  // ❌ POPUP BLEUE DÉSACTIVÉE - Utilise uniquement les popups Android natives
  console.log('🔕 PermissionRequestDialog désactivée - utilisant popups natives uniquement');
  return null;
  
};
