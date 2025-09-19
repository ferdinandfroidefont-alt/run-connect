import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Users, Search, Camera, Trash2, Lock, Globe } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";
import { Switch } from "@/components/ui/switch";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface CreateClubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateClubDialog = ({ isOpen, onClose, onGroupCreated }: CreateClubDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

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

  const handleAddMember = (profile: Profile) => {
    if (!selectedMembers.find(m => m.user_id === profile.user_id)) {
      setSelectedMembers([...selectedMembers, profile]);
    }
    setShowUserSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.user_id !== userId));
  };

  // Handle club avatar upload
  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur", 
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive"
      });
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
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${user.id}/club/new-${timestamp}.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      setGroupAvatarUrl(publicUrl);
      setShowImageCrop(false);
      setSelectedImage(null);

      toast({
        title: "Succès",
        description: "Photo de profil ajoutée"
      });

      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la photo de profil",
        variant: "destructive"
      });
      
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) return;

    setLoading(true);
    try {
      // Create the group conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          is_group: true,
          group_name: groupName.trim(),
          group_description: groupDescription.trim() || null,
          group_avatar_url: groupAvatarUrl || null,
          is_private: isPrivate,
          created_by: user.id,
          participant_1: user.id, // Required field, set to creator for groups
          participant_2: user.id  // Required field, set to creator for groups
        }])
        .select()
        .single();

      if (convError) throw convError;

      // Add the creator as admin
      const { error: adminError } = await supabase
        .from('group_members')
        .insert([{
          conversation_id: conversation.id,
          user_id: user.id,
          is_admin: true
        }]);

      if (adminError) throw adminError;

      // Add selected members
      if (selectedMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('group_members')
          .insert(
            selectedMembers.map(member => ({
              conversation_id: conversation.id,
              user_id: member.user_id,
              is_admin: false
            }))
          );

        if (membersError) throw membersError;
      }

      toast({
        title: "Succès",
        description: "Club créé avec succès!"
      });

      onGroupCreated(conversation.id);
      onClose();
      
      // Reset form
      setGroupName("");
      setGroupDescription("");
      setGroupAvatarUrl("");
      setSelectedMembers([]);
      setIsPrivate(false);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le club",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Créer un club
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Club Avatar */}
            <div>
              <Label>Photo de profil du club (optionnel)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={groupAvatarUrl || ""} />
                  <AvatarFallback>
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={() => document.getElementById('create-club-avatar-upload')?.click()}
                    disabled={avatarUploading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {groupAvatarUrl ? 'Changer' : 'Ajouter'}
                  </Button>
                  {groupAvatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGroupAvatarUrl("");
                        toast({
                          title: "Photo supprimée",
                          description: "La photo de profil a été supprimée"
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  id="create-club-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>
            </div>

            {/* Group Name */}
            <div>
              <Label htmlFor="groupName">Nom du club *</Label>
              <Input
                id="groupName"
                placeholder="Ex: Club Football Paris"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Group Description */}
            <div>
              <Label htmlFor="groupDescription">Description (optionnel)</Label>
              <Textarea
                id="groupDescription"
                placeholder="Décrivez votre club..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>

            {/* Privacy Setting */}
            <div>
              <Label>Visibilité du club</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg mt-2">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isPrivate ? "Club privé" : "Club public"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPrivate 
                        ? "Seuls les membres invités peuvent rejoindre" 
                        : "Tout le monde peut découvrir et rejoindre ce club"
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Membres</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserSearch(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <Badge
                      key={member.user_id}
                      variant="secondary"
                      className="flex items-center gap-2 p-2"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>
                          {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {member.username || member.display_name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Search Users Modal */}
            {showUserSearch && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-background rounded-lg p-4 w-full max-w-md max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Ajouter des membres</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowUserSearch(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setTimeout(searchUsers, 300);
                      }}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((profile) => (
                      <div
                        key={profile.user_id}
                        onClick={() => handleAddMember(profile)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || ""} />
                          <AvatarFallback>
                            {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile.username || profile.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{profile.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || loading}
                className="flex-1"
              >
                {loading ? "Création..." : "Créer le club"}
              </Button>
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