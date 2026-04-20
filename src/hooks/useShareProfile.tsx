import { useState } from 'react';
import { getProfilePublicUrl } from '@/lib/appLinks';

interface ShareProfileOptions {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
}

export const useShareProfile = () => {
  const [showProfileShare, setShowProfileShare] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrData, setQrData] = useState<{
    profileUrl: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    referralCode?: string | null;
  } | null>(null);

  const shareProfile = (options: ShareProfileOptions) => {
    const profileUrl = getProfilePublicUrl(options.username, options.referralCode);
    setQrData({
      profileUrl,
      username: options.username,
      displayName: options.displayName,
      avatarUrl: options.avatarUrl,
      referralCode: options.referralCode,
    });
    setShowProfileShare(true);
  };

  return {
    shareProfile,
    showProfileShare,
    setShowProfileShare,
    showQRDialog,
    setShowQRDialog,
    qrData,
  };
};
