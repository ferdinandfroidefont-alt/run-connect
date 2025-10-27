import { InteractiveMap } from "@/components/InteractiveMap";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { NativePermissionTester } from "@/components/NativePermissionTester";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from 'react';
import { nativeManager } from '@/lib/nativeInit';

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    needsOnboarding, 
    needsProfileSetup,
    loading, 
    completeOnboarding,
    completeProfileSetup
  } = useOnboarding();
  const [searchParams] = useSearchParams();
  const [showPermissionTester, setShowPermissionTester] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const checkNativeStatus = async () => {
      const isNative = await nativeManager.ensureNativeStatus();
      setNativeStatus(isNative);
      console.log('🏠 Index - Statut natif confirmé:', isNative);
    };
    
    checkNativeStatus();
    
    // Démo: montrer le testeur de permissions en dev
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test') || urlParams.has('debug')) {
      setShowPermissionTester(true);
    }
  }, []);

  // Extract map parameters from URL
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const zoom = searchParams.get('zoom');
  const sessionId = searchParams.get('sessionId');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <InteractiveMap 
        initialLat={lat ? parseFloat(lat) : undefined}
        initialLng={lng ? parseFloat(lng) : undefined}
        initialZoom={zoom ? parseInt(zoom) : undefined}
        highlightSessionId={sessionId || undefined}
      />
      
      {/* Onboarding pour les nouveaux utilisateurs */}
      <OnboardingDialog 
        isOpen={needsOnboarding} 
        onComplete={completeOnboarding} 
      />
      
      {/* Setup de profil pour les utilisateurs existants avec profil incomplet */}
      {needsProfileSetup && user && (
        <ProfileSetupDialog
          open={needsProfileSetup}
          onOpenChange={() => {}} // Empêche la fermeture manuelle
          userId={user.id}
          email={user.email || ''}
          onComplete={completeProfileSetup}
        />
      )}
      
      {/* Testeur de permissions (debug) */}
      {showPermissionTester && (
        <NativePermissionTester 
          onClose={() => setShowPermissionTester(false)} 
        />
      )}
    </>
  );
};

export default Index;
