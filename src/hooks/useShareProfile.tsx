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
    // Create a profile URL with new RunConnect domain (corrected to /p/)
    const baseUrl = `https://runconnect.app/p/${options.username}`;
    
    // Add referral code if available
    const profileUrl = options.referralCode 
      ? `${baseUrl}?r=${options.referralCode}`
      : baseUrl;
    
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