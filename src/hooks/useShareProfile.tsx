import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ShareProfileOptions {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
}

export const useShareProfile = () => {
  const { toast } = useToast();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrData, setQrData] = useState<{
    profileUrl: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    referralCode?: string | null;
  } | null>(null);

  const shareProfile = async (options: ShareProfileOptions) => {
    // Create a profile URL with new RunConnect domain
    const profileUrl = `https://runconnect.app/u/${options.username}`;
    
    // Set QR data and show dialog as primary sharing method
    setQrData({
      profileUrl,
      username: options.username,
      displayName: options.displayName,
      avatarUrl: options.avatarUrl,
      referralCode: options.referralCode
    });
    setShowQRDialog(true);
  };

  return { 
    shareProfile, 
    showQRDialog, 
    setShowQRDialog, 
    qrData 
  };
};