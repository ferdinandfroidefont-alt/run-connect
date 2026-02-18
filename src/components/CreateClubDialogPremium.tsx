import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Users, Search, Camera, Lock, Globe, MapPin, Check, Sparkles, Loader2 } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";

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
  const { setHideBottomNav } = useAppContext();
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

  // Hide bottom navigation when dialog is open
  useEffect(() => {
    setHideBottomNav(isOpen);
    return () => setHideBottomNav(false);
  }, [isOpen, setHideBottomNav]);

  // Load suggested members (closest friends based on recent conversations)
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

          if (profiles) {
            setSuggestedMembers(profiles);
          }
        }
      } catch (error) {
        console.error('Error loading suggested members:', error);
      }
    };

    loadSuggestedMembers();
  }, [user, isOpen]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
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
        body: {
          address: query + ', France',
          type: 'geocode'
        }
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
    } catch (error: any) {
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
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setShowImageCrop(true);
    };
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
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
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

      // Add creator as admin
      await supabase.from('group_members').insert([{
        conversation_id: conversation.id,
        user_id: user.id,
        is_admin: true
      }]);

      // Add selected members
      if (selectedMembers.length > 0) {
        await supabase.from('group_members').insert(
          selectedMembers.map(member => ({
            conversation_id: conversation.id,
            user_id: member.user_id,
            is_admin: false
          }))
        );
      }

      onGroupCreated(conversation.id);
      handleClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
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
        <DialogContent className="w-full h-full max-w-full max-h-full rounded-none border-0 p-0 gap-0 flex flex-col bg-secondary sm:max-w-lg sm:max-h-[90vh] sm:rounded-[10px] sm:border">
          {/* iOS Header */}
          <div className="bg-card border-b border-border shrink-0 sm:rounded-t-[10px] pt-safe">
            <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
              <button
                onClick={handleClose}
                className="flex items-center gap-1 text-primary"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Retour</span>
              </button>
              <h1 className="text-[17px] font-semibold text-foreground">Créer un club</h1>
              <div className="w-16" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch bg-pattern">
            <div className="space-y-6 pb-8">

              {/* Club Avatar - Centered */}
              <div className="flex flex-col items-center gap-3 pt-6 pb-2">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => document.getElementById('club-avatar-upload')?.click()}
                >
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={groupAvatarUrl || ""} />
                    <AvatarFallback className="bg-secondary">
                      <Users className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Camera className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">Ajouter une photo</p>
                <input
                  id="club-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>

              {/* Informations du club - Inset Grouped */}
              <div>
                <p className="ios-section-header">Informations</p>
                <div className="bg-card border-y border-border divide-y divide-border">
                  <div className="ios-list-item">
                    <div className="flex-1">
                      <Input
                        placeholder="Nom du club *"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        maxLength={50}
                        className="h-11 bg-transparent border-0 p-0 text-[17px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <Textarea
                      placeholder="Description (optionnelle)"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="bg-transparent border-0 p-0 text-[17px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="ios-list-item">
                    <div className="flex items-center gap-3 flex-1">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Localisation"
                          value={groupLocation}
                          onChange={(e) => {
                            setGroupLocation(e.target.value);
                            setTimeout(() => searchLocation(e.target.value), 300);
                          }}
                          className="h-11 bg-transparent border-0 p-0 text-[17px] focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      {locationLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </div>
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <>
                      {locationSuggestions.map((loc, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setGroupLocation(loc);
                            setShowLocationSuggestions(false);
                          }}
                          className="w-full ios-list-item text-left text-[15px] text-primary"
                        >
                          {loc}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Confidentialité - Inset Grouped */}
              <div>
                <p className="ios-section-header">Confidentialité</p>
                <div className="bg-card border-y border-border">
                  <div className="ios-list-item">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "h-[30px] w-[30px] rounded-[7px] flex items-center justify-center",
                        isPrivate ? "bg-amber-500" : "bg-green-500"
                      )}>
                        {isPrivate ? (
                          <Lock className="h-4 w-4 text-white" />
                        ) : (
                          <Globe className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[17px]">{isPrivate ? "Club privé" : "Club public"}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {isPrivate ? "Sur invitation uniquement" : "Tout le monde peut rejoindre"}
                        </p>
                      </div>
                    </div>
                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                  </div>
                </div>
              </div>

              {/* Ajouter des membres - Barre de recherche uniquement */}
              <div>
                <p className="ios-section-header">Ajouter des membres</p>
                <div className="bg-card border-y border-border">
                  <div className="ios-list-item">
                    <div className="flex items-center gap-3 flex-1">
                      <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 bg-transparent border-0 p-0 text-[17px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  
                  {searchResults.length > 0 && searchResults.map((profile) => {
                    const isSelected = selectedMembers.some(m => m.user_id === profile.user_id);
                    return (
                      <button
                        key={profile.user_id}
                        onClick={() => toggleMember(profile)}
                        className="w-full ios-list-item border-t border-border"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback>{(profile.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-[15px] font-medium">{profile.username || profile.display_name}</p>
                            <p className="text-[13px] text-muted-foreground">@{profile.username}</p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Members Count */}
              {selectedMembers.length > 0 && (
                <div className="px-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-[10px] p-4 text-center">
                    <p className="text-[15px] font-medium text-primary">
                      {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Create Button */}
              <div className="px-4 pb-4">
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || loading}
                  className="w-full h-12 rounded-[10px] text-[17px] font-semibold"
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Crop Modal */}
      {showImageCrop && selectedImage && (
        <ImageCropEditor
          open={showImageCrop}
          onClose={() => {
            setShowImageCrop(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCroppedImage}
        />
      )}
    </>
  );
};
