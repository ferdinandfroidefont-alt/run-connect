import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { X, Users, Search, Camera, Lock, Globe, MapPin, Check, Sparkles, ArrowLeft } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";

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

  // Load suggested members (closest friends based on recent conversations)
  useEffect(() => {
    const loadSuggestedMembers = async () => {
      if (!user || !isOpen) return;

      try {
        // Get recent conversations to find closest friends
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
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden max-h-[90vh]">
          {/* Premium Header */}
          <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Créer un club</h1>
                  <p className="text-xs text-muted-foreground">Rassemblez votre communauté</p>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(90vh-140px)]">
            <div className="p-4 space-y-6">
              {/* Club Avatar */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => document.getElementById('club-avatar-upload')?.click()}
                >
                  <Avatar className="h-24 w-24 ring-4 ring-primary/30 group-hover:ring-primary/60 transition-all duration-300">
                    <AvatarImage src={groupAvatarUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                      <Users className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Cliquez pour ajouter une photo</p>
                <input
                  id="club-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </motion.div>

              {/* Club Name */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <Label className="text-sm font-medium">Nom du club *</Label>
                <Input
                  placeholder="Ex: Running Club Paris"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="mt-2 h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                />
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  placeholder="Décrivez votre club en quelques mots..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="mt-2 bg-white/5 border-white/10 rounded-xl focus:border-primary/50 resize-none"
                />
              </motion.div>

              {/* Location */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Label className="text-sm font-medium">Localisation</Label>
                <div className="relative mt-2">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Paris, Lyon, Marseille..."
                    value={groupLocation}
                    onChange={(e) => {
                      setGroupLocation(e.target.value);
                      setTimeout(() => searchLocation(e.target.value), 300);
                    }}
                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                  />
                  {locationLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <AnimatePresence>
                    {showLocationSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                      >
                        {locationSuggestions.map((loc, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setGroupLocation(loc);
                              setShowLocationSuggestions(false);
                            }}
                            className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm border-b border-white/5 last:border-0"
                          >
                            {loc}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Privacy Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPrivate ? (
                      <Lock className="h-5 w-5 text-amber-400" />
                    ) : (
                      <Globe className="h-5 w-5 text-emerald-400" />
                    )}
                    <div>
                      <p className="font-medium">{isPrivate ? "Club privé" : "Club public"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPrivate ? "Sur invitation uniquement" : "Tout le monde peut rejoindre"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>
              </motion.div>

              {/* Suggested Members */}
              {suggestedMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Inviter des amis</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedMembers.map((member) => {
                      const isSelected = selectedMembers.some(m => m.user_id === member.user_id);
                      return (
                        <motion.div
                          key={member.user_id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleMember(member)}
                          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'bg-primary/20 border-primary/40 border' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {(member.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.username || member.display_name}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Search More Members */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="text-sm font-medium">Rechercher d'autres membres</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((profile) => {
                      const isSelected = selectedMembers.some(m => m.user_id === profile.user_id);
                      return (
                        <div
                          key={profile.user_id}
                          onClick={() => toggleMember(profile)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-primary/20 border border-primary/40' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback>{(profile.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{profile.username || profile.display_name}</p>
                            <p className="text-xs text-muted-foreground">@{profile.username}</p>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Selected Members Count */}
              {selectedMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center"
                >
                  <p className="text-sm font-medium text-primary">
                    {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
                  </p>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a]">
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || loading}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-xl font-medium"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
