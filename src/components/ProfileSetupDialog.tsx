import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, User, Lock, Phone, FileText, Calendar, Eye, EyeOff, Globe, Dumbbell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveImageToIndexedDB, loadImageFromIndexedDB, deleteImageFromIndexedDB } from "@/lib/indexedDBStorage";
import { useLanguage } from "@/contexts/LanguageContext";

// Key constants for storage
const FORM_STATE_KEY = 'profileSetupFormState';
const PENDING_AVATAR_KEY = 'pendingAvatar';
const PENDING_ORIGINAL_KEY = 'pendingOriginalImage'; // Image AVANT crop

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  onComplete?: () => void;
}

const SPORT_VALUES = ['running', 'cycling', 'swimming', 'triathlon', 'walking', 'trail'] as const;

const COUNTRY_CODES = [
  'FR', 'BE', 'CH', 'CA', 'LU', 'MA', 'TN', 'SN', 'CI', 'ES', 'PT', 'DE', 'IT', 'GB', 'US',
] as const;

interface FormState {
  username: string;
  displayName: string;
  birthDate: string;
  phone: string;
  bio: string;
  password: string;
  favoriteSport: string;
  country: string;
  timestamp: number;
}

export const ProfileSetupDialog = ({ open, onOpenChange, userId, email, onComplete }: ProfileSetupDialogProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteSport, setFavoriteSport] = useState("");
  const [country, setCountry] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>("");
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true); // Start with restoring state
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t, language, languageManuallySet, suggestLanguageFromCountry } = useLanguage();

  // Refs pour persister les données (crucial pour Android WebView)
  const avatarPreviewRef = useRef<string>("");
  const avatarFileRef = useRef<File | null>(null);
  const originalImageSrcRef = useRef<string>("");
  const isRedirecting = useRef(false);

  // 🔄 PARTIE 1: Restaurer l'état du formulaire et l'image au montage
  useEffect(() => {
    const restoreState = async () => {
      console.log('📸 [ProfileSetup] Démarrage restauration état...');
      
      // Vérifier si on revient d'une sélection de photo (flag persistant)
      const wasSelectingPhoto = sessionStorage.getItem('photoSelectionInProgress') === 'true';
      if (wasSelectingPhoto) {
        console.log('📸 [ProfileSetup] Flag photoSelectionInProgress détecté - page rechargée pendant sélection');
      }
      
      // 1. Restaurer les champs du formulaire depuis sessionStorage
      try {
        const savedState = sessionStorage.getItem(FORM_STATE_KEY);
        if (savedState) {
          const formState: FormState = JSON.parse(savedState);
          // Vérifier que la sauvegarde est récente (moins de 10 minutes)
          if (Date.now() - formState.timestamp < 10 * 60 * 1000) {
            console.log('📸 [ProfileSetup] Restauration formulaire depuis sessionStorage');
            setUsername(formState.username || '');
            setDisplayName(formState.displayName || '');
            setBirthDate(formState.birthDate || '');
            setPhone(formState.phone || '');
            setBio(formState.bio || '');
            setPassword(formState.password || '');
            setFavoriteSport(formState.favoriteSport || '');
            setCountry(formState.country || '');
          }
          // NE PAS nettoyer - on garde pour la prochaine tentative
        }
      } catch (e) {
        console.error('📸 [ProfileSetup] Erreur restauration formulaire:', e);
      }
      
      // 2. D'abord vérifier s'il y a une image CROPPÉE (déjà finalisée)
      try {
        const pendingCropped = await loadImageFromIndexedDB(PENDING_AVATAR_KEY);
        if (pendingCropped && pendingCropped.size > 0) {
          console.log('📸 [ProfileSetup] Restauration avatar CROPPÉ depuis IndexedDB, size:', pendingCropped.size);
          const file = new File([pendingCropped], 'avatar.jpg', { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(pendingCropped);
          
          setAvatarFile(file);
          setAvatarPreview(previewUrl);
          avatarFileRef.current = file;
          avatarPreviewRef.current = previewUrl;
          setForceRenderKey(prev => prev + 1);
          
          // Nettoyer IndexedDB après restauration réussie
          await deleteImageFromIndexedDB(PENDING_AVATAR_KEY);
          await deleteImageFromIndexedDB(PENDING_ORIGINAL_KEY);
          sessionStorage.removeItem('photoSelectionInProgress');
          sessionStorage.removeItem(FORM_STATE_KEY);
          console.log('📸 [ProfileSetup] Avatar croppé restauré et storage nettoyé');
          setIsRestoring(false);
          return; // Sortir - on a trouvé une image croppée
        }
      } catch (e) {
        console.error('📸 [ProfileSetup] Erreur restauration image croppée:', e);
      }
      
      // 3. 🔥 NIVEAU 31 RENFORCÉ: Vérifier l'image ORIGINALE avec retry
      const tryRestoreOriginal = async (attempt: number = 1): Promise<boolean> => {
        try {
          console.log(`📸 [ProfileSetup] Tentative ${attempt}/3 de restauration image originale...`);
          const pendingOriginal = await loadImageFromIndexedDB(PENDING_ORIGINAL_KEY);
          if (pendingOriginal && pendingOriginal.size > 0) {
            console.log('📸 [ProfileSetup] Image ORIGINALE trouvée, size:', pendingOriginal.size);
            const objectUrl = URL.createObjectURL(pendingOriginal);
            setOriginalImageSrc(objectUrl);
            originalImageSrcRef.current = objectUrl;
            
            // Délai pour s'assurer que le composant est bien monté
            await new Promise(resolve => setTimeout(resolve, 200));
            setShowCropEditor(true);
            console.log('📸 [ProfileSetup] Crop editor rouvert automatiquement');
            return true;
          }
        } catch (e) {
          console.error(`📸 [ProfileSetup] Erreur tentative ${attempt}:`, e);
        }
        return false;
      };
      
      // Essayer 3 fois avec délai croissant
      let restored = await tryRestoreOriginal(1);
      if (!restored && wasSelectingPhoto) {
        await new Promise(resolve => setTimeout(resolve, 300));
        restored = await tryRestoreOriginal(2);
      }
      if (!restored && wasSelectingPhoto) {
        await new Promise(resolve => setTimeout(resolve, 500));
        restored = await tryRestoreOriginal(3);
      }
      
      // Nettoyer le flag si pas de restauration
      if (!restored) {
        sessionStorage.removeItem('photoSelectionInProgress');
      }
      
      setIsRestoring(false);
    };
    
    restoreState();
  }, []);

  // Sync refs avec state ET restaurer si state perdu (Android WebView bug)
  useEffect(() => {
    if (avatarPreview) {
      avatarPreviewRef.current = avatarPreview;
    } else if (avatarPreviewRef.current && !avatarPreview) {
      // State perdu mais ref existe = restaurer
      console.log('📸 [ProfileSetup] Restauration avatarPreview depuis ref');
      setAvatarPreview(avatarPreviewRef.current);
    }
  }, [avatarPreview]);

  useEffect(() => {
    if (avatarFile) {
      avatarFileRef.current = avatarFile;
    } else if (avatarFileRef.current && !avatarFile) {
      console.log('📸 [ProfileSetup] Restauration avatarFile depuis ref');
      setAvatarFile(avatarFileRef.current);
    }
  }, [avatarFile]);

  useEffect(() => {
    originalImageSrcRef.current = originalImageSrc;
  }, [originalImageSrc]);

  // Log pour diagnostic Android
  useEffect(() => {
    console.log('📸 [ProfileSetup] avatarPreview changé:', avatarPreview?.substring(0, 50) || 'vide');
  }, [avatarPreview]);

  // Cleanup des object URLs au démontage pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      // Ne pas révoquer si on a encore besoin de la preview
      // Le cleanup sera fait au prochain changement de photo ou à la soumission
    };
  }, []);

  const handleFileSelection = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      sessionStorage.removeItem('photoSelectionInProgress');
      toast({ title: t('common.error'), description: t('profileSetup.toastImageType'), variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      sessionStorage.removeItem('photoSelectionInProgress');
      toast({ title: t('common.error'), description: t('profileSetup.toastImageSize'), variant: "destructive" });
      return;
    }

    // 🔥 NIVEAU 31 RENFORCÉ: Sauvegarder AVEC RETRY et ATTENDRE la confirmation
    const saveWithRetry = async (attempts: number = 3): Promise<boolean> => {
      for (let i = 0; i < attempts; i++) {
        try {
          console.log(`📸 [ProfileSetup] Sauvegarde image originale, tentative ${i + 1}/${attempts}...`);
          await saveImageToIndexedDB(PENDING_ORIGINAL_KEY, file);
          
          // VÉRIFIER que la sauvegarde a réussi en relisant
          const verify = await loadImageFromIndexedDB(PENDING_ORIGINAL_KEY);
          if (verify && verify.size > 0) {
            console.log('📸 [ProfileSetup] ✅ Image ORIGINALE sauvegardée ET VÉRIFIÉE, size:', verify.size);
            return true;
          }
          console.warn(`📸 [ProfileSetup] ⚠️ Vérification échouée tentative ${i + 1}`);
        } catch (e) {
          console.warn(`📸 [ProfileSetup] Échec tentative ${i + 1}:`, e);
        }
        // Petit délai avant retry
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return false;
    };
    
    const saved = await saveWithRetry(3);
    if (!saved) {
      console.error('📸 [ProfileSetup] ❌ Impossible de sauvegarder dans IndexedDB après 3 tentatives');
      // Continuer quand même - ça fonctionnera si pas de reload
    }

    // Révoquer l'ancienne URL si elle existe
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc);
    }

    // URL.createObjectURL est plus fiable que FileReader.readAsDataURL sur Android WebView
    const objectUrl = URL.createObjectURL(file);
    console.log('📸 [ProfileSetup] Object URL créée:', objectUrl);
    setOriginalImageSrc(objectUrl);
    originalImageSrcRef.current = objectUrl;
    setShowCropEditor(true);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    console.log('📸 [ProfileSetup] handleCropComplete appelé, blob size:', croppedImageBlob.size);
    
    // ✅ NIVEAU 29: S'assurer que le flag de protection est retiré
    (window as any).fileSelectionInProgress = false;
    
    // 🔄 PARTIE 2: Sauvegarder dans IndexedDB IMMÉDIATEMENT pour survie au reload
    try {
      await saveImageToIndexedDB(PENDING_AVATAR_KEY, croppedImageBlob);
      console.log('📸 [ProfileSetup] Image CROPPÉE sauvegardée dans IndexedDB');
    } catch (e) {
      console.warn('📸 [ProfileSetup] Échec sauvegarde IndexedDB (non critique):', e);
    }
    
    // 🔥 NIVEAU 31: Supprimer l'image originale maintenant qu'on a la croppée
    try {
      await deleteImageFromIndexedDB(PENDING_ORIGINAL_KEY);
      console.log('📸 [ProfileSetup] Image originale supprimée de IndexedDB');
    } catch (e) {
      // Ignorer l'erreur
    }
    
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
    
    // Créer la nouvelle preview URL
    const newPreviewUrl = URL.createObjectURL(croppedImageBlob);
    console.log('📸 [ProfileSetup] Preview URL créée:', newPreviewUrl);
    
    // IMPORTANT: Mettre à jour les refs IMMÉDIATEMENT (avant tout state update)
    // Cela garantit que même si le state se réinitialise, on peut restaurer
    avatarPreviewRef.current = newPreviewUrl;
    avatarFileRef.current = croppedFile;
    
    // Révoquer l'ancienne preview si elle existe (mais pas la nouvelle!)
    if (avatarPreview && avatarPreview !== newPreviewUrl) {
      URL.revokeObjectURL(avatarPreview);
    }
    
    // Révoquer l'URL de l'image originale
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc);
    }
    
    // Fermer le dialog AVANT de mettre à jour les states pour éviter race condition
    setShowCropEditor(false);
    
    // Utiliser setTimeout pour garantir que le dialog est fermé avant d'update les states
    setTimeout(() => {
      setAvatarFile(croppedFile);
      setAvatarPreview(newPreviewUrl);
      setOriginalImageSrc('');
      setForceRenderKey(prev => prev + 1); // Force re-render
      console.log('📸 [ProfileSetup] States mis à jour après fermeture dialog');
      
      // Nettoyer le sessionStorage maintenant que la photo est appliquée
      sessionStorage.removeItem(FORM_STATE_KEY);
    }, 50);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Calcul de l'âge à partir de la date de naissance
  const calculateAge = (birthDateStr: string): number => {
    const today = new Date();
    const birth = new Date(birthDateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculatedAge = birthDate ? calculateAge(birthDate) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!avatarFile) {
      toast({ title: t('common.error'), description: t('profileSetup.toastPhotoRequired'), variant: "destructive" });
      return;
    }
    if (!username.trim() || !displayName.trim() || !birthDate || calculatedAge < 13 || !phone.trim() || !bio.trim() || !password || password.length < 6 || !country) {
      toast({ title: t('common.error'), description: t('profileSetup.toastFillAll'), variant: "destructive" });
      return;
    }
    if (!acceptedPolicies) {
      toast({
        title: t('common.error'),
        description: t('profileSetup.toastLegalRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const uploadedUrl = await uploadAvatar(avatarFile);
      if (!uploadedUrl) {
        toast({ title: t('common.error'), description: t('profileSetup.toastUploadFail'), variant: "destructive" });
        setIsLoading(false);
        return;
      }

      await supabase.auth.updateUser({ password });

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        toast({ title: "Nom d'utilisateur déjà pris", description: "Choisissez-en un autre.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const profileData: Record<string, any> = {
        username: username.trim(),
        display_name: displayName.trim(),
        age: calculatedAge,
        phone: phone.trim(),
        bio: bio.trim(),
        avatar_url: uploadedUrl,
      };
      if (favoriteSport) profileData.favorite_sport = favoriteSport;
      if (country) profileData.country = country;
      profileData.preferred_language = language;
      profileData.language_manually_set = languageManuallySet;
      /* Aligné sur l’écran « Avant de commencer » : évite un second bloc consentement si déjà coché ici */
      if (acceptedPolicies) {
        profileData.rgpd_accepted = true;
        profileData.security_rules_accepted = true;
      }

      // ✅ FIX: Capture and check errors from UPDATE/INSERT
      if (existingProfile) {
        const { error: updateError } = await supabase.from('profiles').update(profileData).eq('user_id', userId);
        if (updateError) {
          console.error('❌ [ProfileSetup] UPDATE failed:', updateError);
          throw new Error('Impossible de mettre à jour le profil: ' + updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({ user_id: userId, ...profileData });
        if (insertError) {
          console.error('❌ [ProfileSetup] INSERT failed:', insertError);
          throw new Error('Impossible de créer le profil: ' + insertError.message);
        }
      }

      // ✅ FIX: Verify actual field values, not just row existence
      const { data: verifiedProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, age, phone, bio')
        .eq('user_id', userId)
        .single();

      if (verifyError || !verifiedProfile) {
        console.error('❌ [ProfileSetup] Profil non lisible après save:', verifyError);
        throw new Error('Profil créé mais non vérifiable. Réessayez.');
      }

      // Check that all required fields are actually populated
      const fieldsOk = verifiedProfile.username?.trim() &&
        verifiedProfile.display_name?.trim() &&
        verifiedProfile.avatar_url?.trim() &&
        verifiedProfile.age &&
        verifiedProfile.phone?.trim() &&
        verifiedProfile.bio?.trim();

      if (!fieldsOk) {
        console.error('❌ [ProfileSetup] Champs vides après save:', verifiedProfile);
        throw new Error('Le profil a été sauvegardé mais certains champs sont vides. Réessayez.');
      }

      console.log('✅ [ProfileSetup] Profil vérifié avec tous les champs:', verifiedProfile.id);

      // 🔔 Save pending FCM token if available
      try {
        const pendingToken = (window as any).fcmToken;
        if (pendingToken && typeof pendingToken === 'string' && pendingToken.length > 50) {
          console.log('[ProfileSetup] Saving pending FCM token...');
          let platform = 'android';
          if (typeof (window as any).fcmTokenPlatform === 'string') {
            platform = (window as any).fcmTokenPlatform;
          }
          await supabase.from('profiles').update({
            push_token: pendingToken,
            push_token_platform: platform,
            push_token_updated_at: new Date().toISOString(),
            notifications_enabled: true
          }).eq('user_id', userId);
          console.log('✅ [ProfileSetup] FCM token saved with profile');
        }
      } catch (fcmErr) {
        console.warn('[ProfileSetup] FCM token save failed (non-blocking):', fcmErr);
      }

      // 🔄 Nettoyer IndexedDB et sessionStorage après succès
      try {
        await deleteImageFromIndexedDB(PENDING_AVATAR_KEY);
        sessionStorage.removeItem(FORM_STATE_KEY);
        console.log('📸 [ProfileSetup] Cleanup IndexedDB/sessionStorage après succès');
      } catch (e) {
        console.warn('📸 [ProfileSetup] Cleanup warning:', e);
      }

      // ✅ FIX: Set localStorage safety flag to prevent re-showing dialog
      localStorage.setItem(`profileSetupCompleted_${userId}`, Date.now().toString());
      localStorage.setItem('profileCreatedSuccessfully', 'true');
      localStorage.setItem('profileCreatedAt', Date.now().toString());

      toast({
        title: t('profileSetup.toastProfileCreatedTitle'),
        description: t('profileSetup.toastProfileCreatedDesc')
      });

      // ✅ FIX: Guard against double-fire with isRedirecting
      if (isRedirecting.current) {
        console.log('⚠️ [ProfileSetup] Already redirecting, skipping duplicate onComplete');
        return;
      }
      isRedirecting.current = true;
      
      console.log('✅ [ProfileSetup] Profil créé, délégation redirect à onComplete');
      onOpenChange(false);
      if (onComplete) {
        onComplete();
      } else {
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler pour l'input React natif - méthode principale et fiable sur Android WebView
  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📸 [ProfileSetup] onChange input React déclenché');
    
    // ✅ NIVEAU 29: Retirer le flag de protection contre le reload
    (window as any).fileSelectionInProgress = false;
    
    const file = e.target.files?.[0];
    setIsSelectingPhoto(false);
    
    if (file) {
      console.log('📸 [ProfileSetup] Fichier reçu via input React:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      handleFileSelection(file);
    } else {
      console.log('📸 [ProfileSetup] onChange sans fichier (annulation probable)');
      // Nettoyer le flag si annulation
      sessionStorage.removeItem('photoSelectionInProgress');
    }
    
    // Reset l'input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  };

  // Clic sur le bouton caméra - déclenche l'input React natif
  const handleCameraButtonClick = () => {
    console.log('📸 [ProfileSetup] Clic bouton caméra - ouverture input React natif');
    
    // 🔄 PARTIE 3: Sauvegarder l'état du formulaire AVANT d'ouvrir la galerie
    // Au cas où Android recrée l'activité et recharge la WebView
    const formState: FormState = {
      username,
      displayName,
      birthDate,
      phone,
      bio,
      password,
      favoriteSport,
      country,
      timestamp: Date.now()
    };
    sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState));
    
    // 🔥 NIVEAU 31 RENFORCÉ: Flag PERSISTANT pour savoir qu'une sélection est en cours
    // Ce flag survit au reload car c'est sessionStorage (pas window)
    sessionStorage.setItem('photoSelectionInProgress', 'true');
    console.log('📸 [ProfileSetup] État formulaire + flag sélection sauvegardés');
    
    // ✅ NIVEAU 29: Définir le flag de protection contre le reload automatique
    // Cela empêche main.tsx de recharger la page pendant la sélection de fichier
    (window as any).fileSelectionInProgress = true;
    
    setIsSelectingPhoto(true);
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-secondary p-0 shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* iOS Header */}
          <div className="shrink-0 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
            <div className="flex h-14 items-center justify-between px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onOpenChange(false); navigate('/auth'); }}
                className="text-[15px] text-primary"
              >
                {t('profileSetup.headerAlreadySignedIn')}
              </Button>
              <h1 className="text-[17px] font-semibold">{t('profileSetup.headerTitle')}</h1>
              <div className="w-20" />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <form onSubmit={handleSubmit} className="space-y-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar key={`avatar-${forceRenderKey}-${avatarPreview ? 'has-img' : 'no-img'}`} className="h-24 w-24 ring-4 ring-primary/20">
                    <AvatarImage 
                      src={avatarPreview || avatarPreviewRef.current} 
                      onLoad={() => console.log('📸 [ProfileSetup] Avatar image chargée')}
                      onError={() => console.log('📸 [ProfileSetup] Avatar image erreur')}
                    />
                    <AvatarFallback className="bg-secondary text-2xl">
                      {displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={handleCameraButtonClick}
                    disabled={isSelectingPhoto}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
                  >
                    {isSelectingPhoto ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-[13px] text-muted-foreground">{t('profileSetup.photoLabel')}</p>
                <p className="mt-1 max-w-xs text-center text-[12px] leading-snug text-muted-foreground/80">
                  {t('profileSetup.heroSubtitle')}
                </p>
                
                {/* Input React UNIQUE - C'est lui qui reçoit le fichier de manière fiable sur Android WebView */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoInputChange}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-2">
                <h3 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('profileSetup.sectionInfo')}
                </h3>
                <div className="bg-card rounded-[10px] overflow-hidden">
                  {/* Username */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#007AFF]">
                      <User className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('profileSetup.usernamePh')}
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Display Name */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#34C759]">
                      <User className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('profileSetup.displayNamePh')}
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Password */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#FF9500]">
                      <Lock className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('profileSetup.passwordPh')}
                        className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Date de naissance */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#5856D6]">
                      <Calendar className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                        required
                      />
                      {birthDate && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {calculatedAge} {t('profileSetup.yearsUnit')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Phone */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#FF3B30]">
                      <Phone className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('profileSetup.phonePh')}
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Favorite Sport */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#FF6B00]">
                      <Dumbbell className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Select value={favoriteSport} onValueChange={setFavoriteSport}>
                      <SelectTrigger className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none">
                        <SelectValue placeholder={t('profileSetup.sportPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORT_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(`profileSetup.sports.${value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ios-list-row-inset-sep" />

                  {/* Country */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon bg-[#30B0C7]">
                      <Globe className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Select
                      value={country}
                      onValueChange={(v) => {
                        setCountry(v);
                        void suggestLanguageFromCountry(v);
                      }}
                    >
                      <SelectTrigger className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none">
                        <SelectValue placeholder={t('profileSetup.countryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {t(`profileSetup.countries.${code}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <h3 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('profileSetup.sectionBio')}
                </h3>
                <div className="bg-card rounded-[10px] overflow-hidden">
                  <div className="flex items-start gap-2.5 px-4 py-2.5">
                    <div className="ios-list-row-icon mt-1 bg-[#8E8E93]">
                      <FileText className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t('profileSetup.bioPh')}
                      className="flex-1 border-0 bg-transparent p-0 resize-none min-h-[80px] focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <h3 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('profileSetup.sectionReferral')}
                </h3>
                <div className="rounded-[10px] bg-card p-4">
                  <ReferralCodeInput />
                </div>
              </div>

              {/* Engagements légaux (première inscription) */}
              <div className="space-y-2">
                <h3 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('profileSetup.sectionLegal')}
                </h3>
                <div className="ios-card overflow-hidden">
                  <label
                    htmlFor="profile-setup-legal"
                    className="flex cursor-pointer items-start gap-3 px-4 py-3.5 active:bg-secondary/50"
                  >
                    <Checkbox
                      id="profile-setup-legal"
                      checked={acceptedPolicies}
                      onCheckedChange={(c) => setAcceptedPolicies(c === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-left text-[13px] leading-relaxed text-muted-foreground">
                      {t('profileSetup.legalIntro')}
                      <Link to="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
                        {t('profileSetup.legalTermsLink')}
                      </Link>
                      {t('profileSetup.legalMid')}
                      <Link to="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                        {t('profileSetup.legalPrivacyLink')}
                      </Link>
                      {t('profileSetup.legalOutro')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="h-12 w-full rounded-ios-md text-[17px] font-semibold shadow-md shadow-primary/15"
                disabled={
                  isLoading ||
                  !avatarFile ||
                  !username.trim() ||
                  !displayName.trim() ||
                  !birthDate ||
                  calculatedAge < 13 ||
                  !phone.trim() ||
                  !bio.trim() ||
                  !password ||
                  password.length < 6 ||
                  !country ||
                  !acceptedPolicies
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('profileSetup.submit')}
              </Button>

              <p className="text-center text-[12px] leading-snug text-muted-foreground">{t('profileSetup.requiredFootnote')}</p>
            </form>
          </ScrollArea>
        </div>

        <ImageCropEditor
          open={showCropEditor}
          onClose={() => setShowCropEditor(false)}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
        />
      </DialogContent>
    </Dialog>
  );
};
