import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Users, Search, Settings, Trash2, Copy, Camera, Upload, ArrowLeft } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface GroupMember extends Profile {
  is_admin: boolean;
  joined_at: string;
}

interface EditClubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupDescription: string | null;
  groupAvatarUrl: string | null;
  clubCode: string;
  createdBy: string;
  isAdmin: boolean;
  onGroupUpdated: () => void;
}

export const EditClubDialog = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  groupName: initialGroupName, 
  groupDescription: initialGroupDescription,
  groupAvatarUrl: initialGroupAvatarUrl,
  clubCode,
  createdBy,
  isAdmin,
  onGroupUpdated 
}: EditClubDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupDescription, setGroupDescription] = useState(initialGroupDescription || "");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState(initialGroupAvatarUrl || "");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
    if (!user || !isAdmin) return;

    setAvatarUploading(true);
    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${user.id}/club/${conversationId}-${timestamp}.jpg`;

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

      // Update conversation with new avatar URL
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ group_avatar_url: publicUrl })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setGroupAvatarUrl(publicUrl);
      setShowImageCrop(false);
      setSelectedImage(null);

      toast({
        title: "Succès",
        description: "Photo de profil mise à jour"
      });

      onGroupUpdated();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil",
        variant: "destructive"
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Copy club code to clipboard
  const copyClubCode = async () => {
    try {
      await navigator.clipboard.writeText(clubCode);
      toast({
        title: "Code copié !",
        description: "Le code du club a été copié dans le presse-papiers"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive"
      });
    }
  };

  // Load group members
  const loadGroupMembers = async () => {
    try {
      const { data: memberIds } = await supabase
        .from('group_members')
        .select('user_id, is_admin, joined_at')
        .eq('conversation_id', conversationId);

      if (memberIds) {
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', memberIds.map(m => m.user_id));

        const membersWithProfiles = memberIds.map(member => {
          const profile = memberProfiles?.find(p => p.user_id === member.user_id);
          return {
            ...profile,
            is_admin: member.is_admin,
            joined_at: member.joined_at
          } as GroupMember;
        }).filter(m => m.user_id);

        setMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  // Search for users to add
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const currentMemberIds = members.map(m => m.user_id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .not('user_id', 'in', `(${currentMemberIds.join(',')})`)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  // Add member to group
  const handleAddMember = async (profile: Profile) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('club_invitations')
        .insert([{
          club_id: conversationId,
          inviter_id: user?.id,
          invited_user_id: profile.user_id
        }]);

      if (error) throw error;

      setShowUserSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      
      toast({
        title: "Succès",
        description: `Invitation envoyée à ${profile.username || profile.display_name}`
      });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      if (error.code === '23505') {
        toast({
          title: "Information",
          description: "Cet utilisateur a déjà été invité",
          variant: "default"
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer l'invitation",
          variant: "destructive"
        });
      }
    }
  };

  // Remove member from group
  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || userId === user?.id) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      loadGroupMembers();
      const removedMember = members.find(m => m.user_id === userId);
      
      toast({
        title: "Succès",
        description: `${removedMember?.username || removedMember?.display_name} a été retiré du club`
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer ce membre",
        variant: "destructive"
      });
    }
  };

  // Update group info
  const handleUpdateGroup = async () => {
    if (!isAdmin || !groupName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          group_name: groupName.trim(),
          group_description: groupDescription.trim() || null
        })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Club modifié avec succès!"
      });

      onGroupUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le club",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('🔍 EditClubDialog debug - DEBUGGING:');
      console.log('- createdBy:', createdBy);
      console.log('- user?.id:', user?.id);
      console.log('- clubCode:', clubCode);
      console.log('- createdBy === user?.id:', createdBy === user?.id);
      setGroupName(initialGroupName);
      setGroupDescription(initialGroupDescription || "");
      setGroupAvatarUrl(initialGroupAvatarUrl || "");
      loadGroupMembers();
    }
  }, [isOpen, initialGroupName, initialGroupDescription, initialGroupAvatarUrl]);

  useEffect(() => {
    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
          {/* iOS Navigation Bar */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px]">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              Modifier le club
            </span>
            <div className="min-w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Club Avatar - only editable by creator */}
            {createdBy === user?.id && (
              <div>
                <Label>Photo de profil du club</Label>
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
                      onClick={() => document.getElementById('club-avatar-upload')?.click()}
                      disabled={avatarUploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {groupAvatarUrl ? 'Changer' : 'Ajouter'}
                    </Button>
                    {groupAvatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('conversations')
                              .update({ group_avatar_url: null })
                              .eq('id', conversationId);
                            
                            if (error) throw error;
                            
                            setGroupAvatarUrl("");
                            onGroupUpdated();
                            toast({
                              title: "Photo supprimée",
                              description: "La photo de profil a été supprimée"
                            });
                          } catch (error) {
                            toast({
                              title: "Erreur",
                              description: "Impossible de supprimer la photo",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    id="club-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </div>
              </div>
            )}

            {/* Group Name */}
            <div>
              <Label htmlFor="groupName">Nom du club *</Label>
              <Input
                id="groupName"
                placeholder="Ex: Club Football Paris"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
                disabled={!isAdmin}
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
                disabled={!isAdmin}
              />
            </div>

            {/* Club Code - only visible to creator */}
            {createdBy === user?.id && (
              <div>
                <Label>Code du club (privé)</Label>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Partagez ce code pour inviter des membres</p>
                        <Badge variant="outline" className="font-mono mt-1">
                          {clubCode}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyClubCode}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Membres ({members.length})</Label>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUserSearch(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>
                          {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.username || member.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{member.username} {member.is_admin && "• Admin"}
                        </p>
                      </div>
                    </div>
                    
                    {isAdmin && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Users Modal */}
            {showUserSearch && isAdmin && (
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
                      onChange={(e) => setSearchQuery(e.target.value)}
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
              {isAdmin && (
                <Button
                  onClick={handleUpdateGroup}
                  disabled={!groupName.trim() || loading}
                  className="flex-1"
                >
                  {loading ? "Modification..." : "Modifier"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <ImageCropEditor
        open={showImageCrop}
        imageSrc={selectedImage || ""}
        onCropComplete={handleCroppedImage}
        onClose={() => {
          setShowImageCrop(false);
          setSelectedImage(null);
        }}
      />
    </>
  );
};