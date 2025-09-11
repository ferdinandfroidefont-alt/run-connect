import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2 } from "lucide-react";

interface ProfileSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  onComplete?: () => void; // Optionnel pour les utilisateurs existants
}

export const ProfileSetupDialog = ({ open, onOpenChange, userId, email, onComplete }: ProfileSetupDialogProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelection = (file: File) => {
    console.log('📸 File selection attempt:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userAgent: navigator.userAgent
    });
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "La taille du fichier ne doit pas dépasser 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setOriginalImageSrc(imageSrc);
      setShowCropEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Créer un fichier à partir du blob croppé
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(croppedFile);
    
    // Créer l'URL de prévisualisation
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    setAvatarPreview(previewUrl);
    
    setShowCropEditor(false);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      console.log('🚀 Starting avatar upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Mettre dans un dossier avec l'ID utilisateur

      console.log('📁 Upload path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        toast({
          title: "Erreur d'upload",
          description: `Impossible d'uploader l'image: ${uploadError.message}`,
          variant: "destructive",
        });
        throw uploadError;
      }

      console.log('✅ Upload successful');

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL generated:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('❌ Erreur upload avatar:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom d'utilisateur est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom d'affichage est obligatoire.",
        variant: "destructive",
      });
      return;
    }


    if (!age || parseInt(age) < 13) {
      toast({
        title: "Erreur",
        description: "Vous devez avoir au moins 13 ans pour utiliser cette application.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Erreur",
        description: "Le numéro de téléphone est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    if (!bio.trim()) {
      toast({
        title: "Erreur",
        description: "La présentation est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // Upload avatar si fourni
      let uploadedUrl = null;
      if (avatarFile) {
        uploadedUrl = await uploadAvatar(avatarFile);
        if (!uploadedUrl) {
          toast({
            title: "Erreur",
            description: "Impossible d'uploader la photo de profil.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Mettre à jour le mot de passe de l'utilisateur
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) {
        throw passwordError;
      }

      // Vérifier l'unicité du nom d'utilisateur
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('user_id', userId)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Nom d'utilisateur déjà pris",
          description: "Ce nom d'utilisateur est déjà utilisé. Veuillez en choisir un autre.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Vérifier si le profil existe déjà
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        // Mettre à jour le profil existant
        const { error } = await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            display_name: displayName.trim() || username.trim(),
            age: age ? parseInt(age) : null,
            phone: phone.trim() || null,
            bio: bio.trim() || null,
            avatar_url: uploadedUrl,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Créer un nouveau profil
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            username: username.trim(),
            display_name: displayName.trim() || username.trim(),
            age: age ? parseInt(age) : null,
            phone: phone.trim() || null,
            bio: bio.trim() || null,
            avatar_url: uploadedUrl,
          });

        if (error) throw error;
      }

      toast({
        title: "Profil mis à jour avec succès !",
        description: onComplete ? "Votre profil a été complété." : "Bienvenue dans RunConnect !",
      });

      onOpenChange(false);
      
      if (onComplete) {
        // Pour les utilisateurs existants, appeler onComplete
        onComplete();
      } else {
        // Pour les nouveaux utilisateurs, rediriger
        window.location.href = '/';
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Finaliser votre profil</DialogTitle>
              <DialogDescription>
                Complétez ces informations pour finaliser votre inscription
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => {
                  navigate('/auth');
                }, 100);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Déjà connecté ?
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-background pr-2" style={{ scrollbarWidth: 'thin' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo de profil */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback>
                  {displayName && displayName.length > 0 
                    ? displayName[0].toUpperCase() 
                    : email && email.length > 0 
                      ? email[0].toUpperCase() 
                      : "U"
                  }
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('📱 Camera button clicked, device info:', {
                    isMobile: /Mobi|Android/i.test(navigator.userAgent),
                    platform: navigator.platform,
                    userAgent: navigator.userAgent
                  });
                  
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  // Ajouter capture pour mobile
                  input.setAttribute('capture', 'environment');
                  input.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    console.log('📸 File selected via camera button:', file?.name);
                    if (file) {
                      handleFileSelection(file);
                    }
                  });
                  input.click();
                }}
                className="text-xs"
              >
                <Camera className="h-3 w-3 mr-1" />
                Choisir une photo (optionnel)
              </Button>
            </div>
            
            <input
              id="avatar-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelection(file);
                }
              }}
              className="sr-only"
              style={{ display: 'none' }}
            />
            <p className="text-xs text-muted-foreground">Photo de profil (optionnelle)</p>
          </div>

          {/* Nom d'utilisateur */}
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={email.split('@')[0]}
              required
            />
            <p className="text-xs text-muted-foreground">
              Uniquement des lettres, chiffres et underscores
            </p>
          </div>

          {/* Nom d'affichage */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom complet *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom complet"
              required
            />
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              required
              minLength={6}
            />
          </div>

          {/* Âge */}
          <div className="space-y-2">
            <Label htmlFor="age">Âge *</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              min="13"
              max="120"
              required
            />
            <p className="text-xs text-muted-foreground">
              Vous devez avoir au moins 13 ans
            </p>
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Présentation *</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez-nous de vous, vos sports favoris..."
              className="resize-none"
              rows={3}
              required
            />
          </div>

          {/* Code de parrainage */}
          <ReferralCodeInput />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !username.trim() || !displayName.trim() || !age || parseInt(age) < 13 || !phone.trim() || !bio.trim() || !password || password.length < 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer et créer mon compte
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              * Champs obligatoires
            </p>
          </div>
          </form>
        </div>

        {/* Image Crop Editor */}
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