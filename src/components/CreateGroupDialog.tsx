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
import { X, Plus, Users, Search } from "lucide-react";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

export const CreateGroupDialog = ({ isOpen, onClose, onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

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
        description: "Groupe créé avec succès!"
      });

      onGroupCreated(conversation.id);
      onClose();
      
      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe",
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
              Créer un groupe
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <Label htmlFor="groupName">Nom du groupe *</Label>
              <Input
                id="groupName"
                placeholder="Ex: Groupe Football Paris"
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
                placeholder="Décrivez votre groupe..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
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
                          {(member.display_name || member.username || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {member.display_name || member.username}
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
                            {(profile.display_name || profile.username || "").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile.display_name || profile.username}</p>
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
                {loading ? "Création..." : "Créer le groupe"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};