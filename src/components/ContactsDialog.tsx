import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, UserPlus, Smartphone, Phone, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useContacts } from '@/hooks/useContacts';
import { useProfileNavigation } from '@/hooks/useProfileNavigation';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePreviewDialog } from './ProfilePreviewDialog';

interface ContactSuggestion {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface ContactsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ContactsDialog: React.FC<ContactsDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const { 
    contacts: deviceContacts, 
    loading: contactsLoading, 
    hasPermission, 
    isNative,
    requestPermissions,
    loadContacts 
  } = useContacts();

  const [contacts, setContacts] = useState<ContactSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ContactSuggestion | null>(null);

  // Normaliser un numéro de téléphone français
  const normalizePhone = (phone: string): string => {
    // Enlever espaces, tirets, parenthèses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Enlever le +33 et ajouter 0
    if (cleaned.startsWith('+33')) {
      cleaned = '0' + cleaned.substring(3);
    } else if (cleaned.startsWith('33') && cleaned.length === 11) {
      cleaned = '0' + cleaned.substring(2);
    }
    
    // Ajouter le 0 si numéro à 9 chiffres
    if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) {
      cleaned = '0' + cleaned;
    }
    
    return cleaned;
  };

  useEffect(() => {
    if (open && user) {
      if (isNative && !hasPermission) {
        setPermissionPrompt(true);
      } else if (isNative && hasPermission) {
        loadContactsFromApp();
      }
    }
  }, [open, user, isNative, hasPermission]);

  const loadContactsFromApp = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('📞 Loading contacts from app...');
      const deviceContacts = await loadContacts();
      console.log('📞 Device contacts loaded:', deviceContacts?.length || 0);
      
      const contactSuggestions = await findContactsInApp(deviceContacts);
      setContacts(contactSuggestions);
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const findContactsInApp = async (contacts: any[]) => {
    console.log('📞 Finding contacts in app...');
    if (!contacts || contacts.length === 0) {
      console.log('📞 No device contacts to search');
      return [];
    }

    try {
      // Extract and normalize phone numbers from contacts
      const phoneNumbers: string[] = [];

      contacts.forEach((contact) => {
        contact.phoneNumbers?.forEach((phone: any) => {
          if (phone.number) {
            const normalized = normalizePhone(phone.number);
            if (normalized && normalized.length === 10) {
              phoneNumbers.push(normalized);
            }
          }
        });
      });

      console.log('📞 Normalized phone numbers from device:', phoneNumbers.length);
      console.log('📞 Sample normalized numbers:', phoneNumbers.slice(0, 5));

      if (phoneNumbers.length === 0) {
        console.log('📞 No valid phone numbers to search');
        return [];
      }

      // Search ONLY by phone numbers (in batches to avoid URL length limits)
      let matchingUsers: any[] = [];
      const batchSize = 50;
      
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);
        console.log(`📞 Searching batch ${i / batchSize + 1} with ${batch.length} numbers`);
        
        const { data: phoneMatches, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, phone')
          .neq('user_id', user!.id)
          .not('phone', 'is', null)
          .in('phone', batch);
        
        if (error) {
          console.error('📞 Error searching batch:', error);
          continue;
        }
        
        if (phoneMatches && phoneMatches.length > 0) {
          console.log(`📞 Found ${phoneMatches.length} matches in this batch`);
          matchingUsers.push(...phoneMatches);
        }
      }

      // Remove duplicates
      const uniqueUsers = matchingUsers.reduce((acc, current) => {
        const exists = acc.find((item: any) => item.user_id === current.user_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      console.log('📞 Total unique contacts found:', uniqueUsers.length);

      // Convert to contacts format
      const contactSuggestions = uniqueUsers.map(profile => ({
        user_id: profile.user_id,
        username: profile.username || profile.display_name || 'Utilisateur',
        display_name: profile.display_name || profile.username || 'Utilisateur',
        avatar_url: profile.avatar_url || ''
      }));

      return contactSuggestions;
    } catch (error) {
      console.error('❌ Error finding contacts in app:', error);
      return [];
    }
  };

  const handleRequestContactsPermission = async () => {
    setLoading(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        setPermissionPrompt(false);
        toast({
          title: "Contacts autorisés",
          description: "Chargement de vos contacts..."
        });
        await loadContactsFromApp();
      } else {
        toast({
          title: "Permission refusée",
          description: "Vous pouvez activer l'accès aux contacts dans les paramètres de l'application",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFollowRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert([{
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({ 
        title: "Demande envoyée", 
        description: "Votre demande de suivi a été envoyée" 
      });

      // Remove from contacts list
      setContacts(prev => prev.filter(c => c.user_id !== targetUserId));
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: "Impossible d'envoyer la demande", 
        variant: "destructive" 
      });
    }
  };

  const ContactCard = ({ contact }: { contact: ContactSuggestion }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Avatar 
        className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigateToProfile(contact.user_id)}
      >
        <AvatarImage src={contact.avatar_url} />
        <AvatarFallback>
          {contact.username?.[0] || contact.display_name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {contact.display_name || contact.username}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          @{contact.username}
        </p>
        <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200 mt-1">
          <Smartphone className="h-3 w-3 mr-1" />
          Dans vos contacts
        </Badge>
      </div>
      
      <Button
        size="sm"
        onClick={() => sendFollowRequest(contact.user_id)}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Suivre
      </Button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Trouver mes contacts
            </DialogTitle>
            <DialogDescription>
              Trouvez vos amis qui utilisent déjà l'application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isNative ? (
              <div className="text-center py-6">
                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Cette fonctionnalité est disponible uniquement sur mobile
                </p>
              </div>
            ) : permissionPrompt ? (
              <div className="text-center py-4">
                <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Trouvez vos amis facilement</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Autorisez l'accès à vos contacts pour voir vos amis qui utilisent RunConnect
                </p>
                <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Vos contacts restent privés et sécurisés</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setPermissionPrompt(false)}
                    className="flex-1"
                    disabled={loading}
                  >
                    Plus tard
                  </Button>
                  <Button 
                    onClick={handleRequestContactsPermission}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Autorisation...
                      </>
                    ) : (
                      'Autoriser les contacts'
                    )}
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-6">
                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Recherche de vos contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-6">
                <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Aucun de vos contacts n'utilise encore RunConnect
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Invitez-les à rejoindre l'application !
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {contacts.map(contact => (
                  <ContactCard key={contact.user_id} contact={contact} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProfilePreviewDialog 
        userId={selectedUser?.user_id} 
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
};