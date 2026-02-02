import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, User, Lock, Phone, FileText, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  onComplete?: () => void;
}

export const ProfileSetupDialog = ({ open, onOpenChange, userId, email, onComplete }: ProfileSetupDialogProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>("");
  const [forceRenderKey, setForceRenderKey] = useState(0); // Force re-render sur Android
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Refs pour persister les données (crucial pour Android WebView)
  const avatarPreviewRef = useRef<string>("");
  const avatarFileRef = useRef<File | null>(null);
  const originalImageSrcRef = useRef<string>("");

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

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Taille max: 100MB.", variant: "destructive" });
      return;
    }

    // Révoquer l'ancienne URL si elle existe
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc);
    }

    // URL.createObjectURL est plus fiable que FileReader.readAsDataURL sur Android WebView
    const objectUrl = URL.createObjectURL(file);
    console.log('📸 [ProfileSetup] Object URL créée:', objectUrl);
    setOriginalImageSrc(objectUrl);
    setShowCropEditor(true);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    console.log('📸 [ProfileSetup] handleCropComplete appelé, blob size:', croppedImageBlob.size);
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!avatarFile) {
      toast({ title: "Erreur", description: "La photo de profil est obligatoire.", variant: "destructive" });
      return;
    }
    if (!username.trim() || !displayName.trim() || !age || parseInt(age) < 13 || !phone.trim() || !bio.trim() || !password || password.length < 6) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);

    try {
      const uploadedUrl = await uploadAvatar(avatarFile);
      if (!uploadedUrl) {
        toast({ title: "Erreur", description: "Impossible d'uploader la photo.", variant: "destructive" });
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

      const profileData = {
        username: username.trim(),
        display_name: displayName.trim(),
        age: parseInt(age),
        phone: phone.trim(),
        bio: bio.trim(),
        avatar_url: uploadedUrl,
      };

      if (existingProfile) {
        await supabase.from('profiles').update(profileData).eq('user_id', userId);
      } else {
        await supabase.from('profiles').insert({ user_id: userId, ...profileData });
      }

      toast({
        title: "Profil créé !",
        description: "Bienvenue dans RunConnect !"
      });

      onOpenChange(false);
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler pour l'input React natif - méthode principale et fiable sur Android WebView
  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📸 [ProfileSetup] onChange input React déclenché');
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
    }
    
    // Reset l'input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  };

  // Clic sur le bouton caméra - déclenche l'input React natif
  const handleCameraButtonClick = () => {
    console.log('📸 [ProfileSetup] Clic bouton caméra - ouverture input React natif');
    setIsSelectingPhoto(true);
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreen className="p-0 gap-0 bg-secondary">
        <div className="flex flex-col h-full">
          {/* iOS Header */}
          <div className="bg-card border-b border-border">
            <div className="flex items-center justify-between px-4 h-[56px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onOpenChange(false); navigate('/auth'); }}
                className="text-[15px] text-primary"
              >
                Déjà connecté ?
              </Button>
              <h1 className="text-[17px] font-semibold">Créer mon profil</h1>
              <div className="w-20" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
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
                <p className="text-[13px] text-muted-foreground mt-2">Photo de profil *</p>
                
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
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  Informations
                </h3>
                <div className="bg-card rounded-[10px] overflow-hidden">
                  {/* Username */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                      <User className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nom d'utilisateur *"
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <div className="h-px bg-border ml-[54px]" />

                  {/* Display Name */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
                      <User className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nom complet *"
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                  <div className="h-px bg-border ml-[54px]" />

                  {/* Password */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF9500] flex items-center justify-center">
                      <Lock className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mot de passe (min. 6 car.) *"
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="h-px bg-border ml-[54px]" />

                  {/* Age */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                      <Calendar className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Âge (min. 13 ans) *"
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      min="13"
                      max="120"
                      required
                    />
                  </div>
                  <div className="h-px bg-border ml-[54px]" />

                  {/* Phone */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
                      <Phone className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Téléphone *"
                      className="flex-1 h-10 border-0 bg-transparent p-0 focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  Présentation
                </h3>
                <div className="bg-card rounded-[10px] overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#8E8E93] flex items-center justify-center mt-1">
                      <FileText className="h-[18px] w-[18px] text-white" />
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Parlez-nous de vous, vos sports favoris... *"
                      className="flex-1 border-0 bg-transparent p-0 resize-none min-h-[80px] focus-visible:ring-0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  Code de parrainage (optionnel)
                </h3>
                <div className="bg-card rounded-[10px] p-4">
                  <ReferralCodeInput />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-[10px]"
                disabled={isLoading || !avatarFile || !username.trim() || !displayName.trim() || !age || parseInt(age) < 13 || !phone.trim() || !bio.trim() || !password || password.length < 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer mon compte
              </Button>

              <p className="text-[13px] text-muted-foreground text-center">* Champs obligatoires</p>
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
