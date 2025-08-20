import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Settings, Crown, Calendar } from "lucide-react";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";

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

interface ClubInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupDescription: string | null;
  groupAvatarUrl: string | null;
  isAdmin: boolean;
  onEditGroup: () => void;
}

export const ClubInfoDialog = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  groupName, 
  groupDescription,
  groupAvatarUrl,
  isAdmin,
  onEditGroup
}: ClubInfoDialogProps) => {
  console.log('🔍 GroupInfoDialog render - DEBUGGING:');
  console.log('- isOpen:', isOpen);
  console.log('- conversationId:', conversationId);
  console.log('- groupName:', groupName);
  console.log('- groupDescription:', groupDescription);
  console.log('- groupAvatarUrl:', groupAvatarUrl);
  console.log('- isAdmin:', isAdmin);
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Load group members
  const loadGroupMembers = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { data: memberIds } = await supabase
        .from('group_members')
        .select('user_id, is_admin, joined_at')
        .eq('conversation_id', conversationId);

      if (memberIds && memberIds.length > 0) {
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

        // Sort members: admins first, then by display name
        membersWithProfiles.sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          return (a.username || a.display_name || '').localeCompare(
            b.username || b.display_name || ''
          );
        });

        setMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres du club",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (member: GroupMember) => {
    if (member.user_id === user?.id) return; // Don't show preview for self
    
    setSelectedUserId(member.user_id);
    setShowProfilePreview(true);
  };

  useEffect(() => {
    if (isOpen) {
      loadGroupMembers();
    }
  }, [isOpen, conversationId]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations du club
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-12 w-12">
                <AvatarImage src={groupAvatarUrl || ""} />
                <AvatarFallback>
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{groupName}</h3>
                {groupDescription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {groupDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {members.length} membre{members.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Members List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Membres du club</h4>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEditGroup();
                    }}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Gérer
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      onClick={() => handleMemberClick(member)}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        member.user_id === user?.id 
                          ? 'bg-muted/30' 
                          : 'hover:bg-muted/50 cursor-pointer'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || ""} />
                          <AvatarFallback>
                            {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.is_admin && (
                          <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                            <Crown className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {member.username || member.display_name}
                            {member.user_id === user?.id && (
                              <span className="text-muted-foreground"> (vous)</span>
                            )}
                          </p>
                          {member.is_admin && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={() => {
          setShowProfilePreview(false);
          setSelectedUserId(null);
        }}
      />
    </>
  );
};