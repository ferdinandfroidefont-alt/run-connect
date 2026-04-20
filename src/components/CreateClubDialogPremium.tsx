import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Camera, Lock, Globe, MapPin, Check, Loader2 } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { CoachingFullscreenHeader } from "@/components/coaching/CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface CreateClubDialogPremiumProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateClubDialogPremium = ({ isOpen, onClose, onGroupCreated }: CreateClubDialogPremiumProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupLocation, setGroupLocation] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [suggestedMembers, setSuggestedMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const loadSuggestedMembers = async () => {
      if (!user || !isOpen) return;
      try {
        const { data: recentConvs } = await supabase
          .from('conversations')
          .select('participant_1, participant_2, updated_at')
          .eq('is_group', false)
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .limit(8);

        if (recentConvs && recentConvs.length > 0) {
          const friendIds = recentConvs.map(conv =>
            conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
          );
          const { data: profiles } = await supabase.rpc('get_safe_public_profiles', {
            profile_user_ids: friendIds
          });
          if (profiles) setSuggestedMembers(profiles);
        }
      } catch (error) {
        console.error('Error loading suggested members:', error);
      }
    };
    loadSuggestedMembers();
  }, [user, isOpen]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    setLocationLoading(true);
    try {
      const uniqueCities = new Set<string>();
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: { address: query + ', France', type: 'geocode' }
      });
      if (!error && data?.results) {
        data.results.forEach((result: any) => {
          const cityComponent = result.address_components?.find((c: any) => c.types.includes('locality'));
          const postalComponent = result.address_components?.find((c: any) => c.types.includes('postal_code'));
          if (cityComponent && postalComponent) {
            uniqueCities.add(`${postalComponent.long_name} ${cityComponent.long_name}`);
          } else if (cityComponent) {
            uniqueCities.add(cityComponent.long_name);
          }
        });
      }
      setLocationSuggestions(Array.from(uniqueCities).slice(0, 10));
      setShowLocationSuggestions(uniqueCities.size > 0);
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const toggleMember = (profile: Profile) => {
    const isSelected = selectedMembers.some(m => m.user_id === profile.user_id);
    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m.user_id !== profile.user_id));
    } else {
      setSelectedMembers(prev => [...prev, profile]);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => { setSelectedImage(e.target?.result as string); setShowImageCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedImageBlob: Blob) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const filename = `${user.id}/club/new-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, croppedImageBlob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
      setGroupAvatarUrl(publicUrl);
      setShowImageCrop(false);
      setSelectedImage(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter la photo", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) return;
    setLoading(true);
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          is_group: true,
          group_name: groupName.trim(),
          group_description: groupDescription.trim() || null,
          location: groupLocation.trim() || null,
          group_avatar_url: groupAvatarUrl || null,
          is_private: isPrivate,
          created_by: user.id,
          participant_1: user.id,
          participant_2: user.id
        }])
        .select()
        .single();
      if (convError) throw convError;

      const { error: adminError } = await supabase.from('group_members').insert([{
        conversation_id: conversation.id,
        user_id: user.id,
        is_admin: true,
        is_coach: true
      }]);
      if (adminError) {
        await supabase.from('conversations').delete().eq('id', conversation.id);
        throw new Error('Impossible d\'ajouter le créateur comme admin du club');
      }

      await supabase.from('messages').insert([{
        conversation_id: conversation.id,
        sender_id: user.id,
        content: 'a créé le club',
        message_type: 'system'
      }]);

      if (selectedMembers.length > 0) {
        await supabase.from('group_members').insert(
          selectedMembers.map(member => ({
            conversation_id: conversation.id,
            user_id: member.user_id,
            is_admin: false
          }))
        );
        const memberNames = selectedMembers.map(m => m.username || m.display_name).join(', ');
        await supabase.from('messages').insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `a ajouté ${memberNames}`,
          message_type: 'system'
        }]);
      }

      const code = (conversation as { club_code?: string | null }).club_code?.trim();
      if (isPrivate && code) {
        toast({ title: "Club privé créé", description: `Code du club : ${code}. Conserve-le ou partage-le pour inviter des membres.` });
      } else {
        toast({ title: "Club créé", description: "Ton club est prêt." });
      }

      onGroupCreated(conversation.id);
      handleClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le club", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupLocation("");
    setGroupAvatarUrl("");
    setSelectedMembers([]);
    setIsPrivate(false);
    setSearchQuery("");
    setSearchResults([]);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Créer un club</DialogTitle>
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            header={<CoachingFullscreenHeader title="Créer un club" onBack={handleClose} />}
            scrollClassName="bg-secondary py-4"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 pb-4">
              <div
                className="relative cursor-pointer"
                onClick={() => document.getElementById('create-club-avatar')?.click()}
              >
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={groupAvatarUrl || ""} />
                  <AvatarFallback className="bg-card">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground">Ajouter une photo</p>
              <input id="create-club-avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>

            {/* INFORMATIONS */}
            <IOSListGroup header="INFORMATIONS" className="px-ios-4">
              <div className="bg-card px-ios-4 py-2.5">
                <Input
                  placeholder="Nom du club *"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="h-11 border-0 bg-transparent p-0 text-[17px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="h-px bg-border ml-ios-4" />
              <div className="bg-card px-ios-4 py-2.5">
                <Textarea
                  placeholder="Description (optionnelle)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="min-h-[60px] border-0 bg-transparent p-0 text-[17px] shadow-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="h-px bg-border ml-ios-4" />
              <div className="flex items-center gap-3 bg-card px-ios-4 py-2.5">
                <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  placeholder="Localisation"
                  value={groupLocation}
                  onChange={(e) => {
                    setGroupLocation(e.target.value);
                    setTimeout(() => searchLocation(e.target.value), 300);
                  }}
                  className="h-11 flex-1 border-0 bg-transparent p-0 text-[17px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {locationLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
              </div>
              {showLocationSuggestions && locationSuggestions.map((loc, i) => (
                <div key={i}>
                  <div className="h-px bg-border ml-ios-4" />
                  <button
                    onClick={() => { setGroupLocation(loc); setShowLocationSuggestions(false); }}
                    className="w-full bg-card px-ios-4 py-2.5 text-left text-[15px] text-primary active:bg-secondary/80"
                  >
                    {loc}
                  </button>
                </div>
              ))}
            </IOSListGroup>

            {/* CONFIDENTIALITÉ */}
            <IOSListGroup header="CONFIDENTIALITÉ" className="px-ios-4">
              <div className="flex items-center gap-3 bg-card px-ios-4 py-3">
                <div className={cn(
                  "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px]",
                  isPrivate ? "bg-amber-500" : "bg-green-500"
                )}>
                  {isPrivate ? <Lock className="h-[18px] w-[18px] text-white" /> : <Globe className="h-[18px] w-[18px] text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] leading-snug text-foreground">{isPrivate ? "Club privé" : "Club public"}</p>
                  <p className="mt-px text-[13px] leading-snug text-muted-foreground">
                    {isPrivate
                      ? "Un code est généré pour inviter ; on peut aussi te rejoindre via la recherche Clubs."
                      : "Tout le monde peut découvrir et rejoindre depuis la recherche."}
                  </p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </IOSListGroup>

            {/* AJOUTER DES MEMBRES */}
            <IOSListGroup header="AJOUTER DES MEMBRES" className="px-ios-4">
              <div className="flex items-center gap-3 bg-card px-ios-4 py-2.5">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 flex-1 border-0 bg-transparent p-0 text-[17px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {searchResults.map((profile) => {
                const isSelected = selectedMembers.some(m => m.user_id === profile.user_id);
                return (
                  <div key={profile.user_id}>
                    <div className="h-px bg-border ml-[54px]" />
                    <button
                      onClick={() => toggleMember(profile)}
                      className="flex w-full items-center gap-2.5 bg-card px-ios-4 py-2.5 active:bg-secondary/80"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback>{(profile.username || "U")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-[15px] font-medium text-foreground">{profile.username || profile.display_name}</p>
                        <p className="text-[13px] text-muted-foreground">@{profile.username}</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                    </button>
                  </div>
                );
              })}
            </IOSListGroup>

            {/* Selected count */}
            {selectedMembers.length > 0 && (
              <div className="px-ios-4">
                <div className="rounded-ios-md bg-primary/10 border border-primary/20 px-ios-4 py-3 text-center">
                  <p className="text-[15px] font-medium text-primary">
                    {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Create button */}
            <div className="px-ios-4 pb-ios-4 pt-ios-2">
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || loading}
                className="w-full h-[50px] rounded-ios-lg text-[17px] font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Création en cours...
                  </div>
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Créer le club
                  </>
                )}
              </Button>
            </div>

            <div className="h-6" />
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>

      {showImageCrop && selectedImage && (
        <ImageCropEditor
          open={showImageCrop}
          onClose={() => { setShowImageCrop(false); setSelectedImage(null); }}
          imageSrc={selectedImage}
          onCropComplete={handleCroppedImage}
        />
      )}
    </>
  );
};
