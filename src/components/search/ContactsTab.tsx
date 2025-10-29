import { useState, useEffect } from 'react';
import { Phone, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface ContactSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_friend?: boolean;
  follow_status?: 'none' | 'pending' | 'accepted';
}

export const ContactsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative, hasPermission, requestPermissions, contacts: deviceContacts, loadContacts } = useContacts();
  const [loading, setLoading] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([]);
  const [permissionPrompt, setPermissionPrompt] = useState(false);

  useEffect(() => {
    console.log('👥📊 [ContactsTab] State updated:', {
      isNative,
      hasPermission,
      contactsCount: deviceContacts?.length || 0,
      suggestionsCount: contactSuggestions.length,
      loading,
      permissionPrompt
    });

    if (isNative && hasPermission && deviceContacts && deviceContacts.length > 0 && contactSuggestions.length === 0 && !loading) {
      console.log('👥🔄 [ContactsTab] Conditions remplies - Chargement automatique des contacts');
      loadContactsFromApp();
    }
  }, [isNative, hasPermission, deviceContacts]);

  useEffect(() => {
    // Recharger automatiquement après autorisation
    if (hasPermission && deviceContacts && deviceContacts.length > 0 && contactSuggestions.length === 0) {
      console.log('👥🔄 [ContactsTab] Permission accordée - Rechargement des contacts');
      loadContactsFromApp();
    }
  }, [hasPermission]);

  // ✅ ÉTAPE 2: Écouter l'événement contactsLoaded directement
  useEffect(() => {
    const handleContactsLoaded = (event: any) => {
      console.log('👥🎉 [ContactsTab] Événement contactsLoaded reçu:', event.detail?.length || 0, 'contacts');
      
      // Forcer un rechargement immédiat des suggestions
      if (hasPermission && deviceContacts && deviceContacts.length > 0) {
        console.log('👥⚡ [ContactsTab] Déclenchement immédiat de loadContactsFromApp()');
        loadContactsFromApp();
      } else {
        console.log('👥⏳ [ContactsTab] Retry dans 1s...');
        // Retry après 1s si deviceContacts pas encore sync
        setTimeout(() => {
          if (hasPermission) {
            loadContacts().then(() => {
              console.log('👥✅ [ContactsTab] Contacts rechargés via loadContacts()');
              loadContactsFromApp();
            });
          }
        }, 1000);
      }
    };

    window.addEventListener('contactsLoaded', handleContactsLoaded);
    
    return () => {
      window.removeEventListener('contactsLoaded', handleContactsLoaded);
    };
  }, [hasPermission, deviceContacts]);

  const normalizePhone = (phone: string): string => {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('33')) {
      normalized = '0' + normalized.substring(2);
    } else if (normalized.startsWith('+33')) {
      normalized = '0' + normalized.substring(3);
    } else if (normalized.length === 9 && !normalized.startsWith('0')) {
      normalized = '0' + normalized;
    }
    return normalized;
  };

  const loadContactsFromApp = async () => {
    if (!deviceContacts || deviceContacts.length === 0) {
      console.log('👥⚠️ [ContactsTab] Aucun contact device disponible');
      return;
    }

    console.log('👥🔄 [ContactsTab] Chargement contacts depuis l\'app...', deviceContacts.length, 'contacts device');
    setLoading(true);

    try {
      console.log('👥🔍 [ContactsTab] Appel findContactsInApp()...');
      const suggestions = await findContactsInApp(deviceContacts);
      console.log('👥✅ [ContactsTab] Suggestions trouvées:', suggestions.length);
      setContactSuggestions(suggestions);
      
      if (suggestions.length > 0) {
        console.log('👥🎉 [ContactsTab] Contacts affichés avec succès!');
      } else {
        console.log('👥📭 [ContactsTab] Aucune correspondance trouvée dans Supabase');
      }
    } catch (error) {
      console.error('👥❌ [ContactsTab] Erreur lors du chargement des contacts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const findContactsInApp = async (contacts: any[]): Promise<ContactSuggestion[]> => {
    if (!user) {
      console.log('👥❌ [findContactsInApp] Pas d\'utilisateur connecté');
      return [];
    }

    console.log('👥🔍 [findContactsInApp] Recherche dans', contacts.length, 'contacts device');

    const allPhones: string[] = [];
    contacts.forEach(contact => {
      if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers)) {
        contact.phoneNumbers.forEach((phoneObj: any) => {
          if (phoneObj.number) {
            const normalized = normalizePhone(phoneObj.number);
            if (normalized.length >= 10) {
              allPhones.push(normalized);
            }
          }
        });
      }
    });

    console.log('👥📞 [findContactsInApp] Numéros extraits:', allPhones.length);

    if (allPhones.length === 0) {
      console.log('👥⚠️ [findContactsInApp] Aucun numéro valide trouvé');
      return [];
    }

    const uniquePhones = [...new Set(allPhones)];
    console.log('👥📊 [findContactsInApp] Numéros uniques:', uniquePhones.length);

    const batchSize = 50;
    const results: ContactSuggestion[] = [];

    for (let i = 0; i < uniquePhones.length; i += batchSize) {
      const batch = uniquePhones.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, phone')
        .in('phone', batch)
        .neq('user_id', user.id)
        .limit(50);

      if (error) {
        console.error('[ContactsTab] Error fetching batch:', error);
        continue;
      }

      if (data) {
        console.log('[ContactsTab] Batch found:', data.length, 'matches');
        results.push(...data);
      }
    }

    console.log('[ContactsTab] Total matches found:', results.length);

    // Vérifier le statut d'amitié pour chaque contact trouvé
    if (results.length > 0) {
      const userIds = results.map(r => r.user_id);
      
      // Récupérer toutes les relations user_follows
      const { data: followsData } = await supabase
        .from('user_follows')
        .select('following_id, status')
        .eq('follower_id', user.id)
        .in('following_id', userIds);

      // Créer un map des statuts
      const followStatusMap = new Map<string, string>();
      followsData?.forEach(follow => {
        followStatusMap.set(follow.following_id, follow.status);
      });

      // Ajouter le statut à chaque contact
      const contactsWithStatus = results.map(contact => ({
        ...contact,
        follow_status: (followStatusMap.get(contact.user_id) || 'none') as 'none' | 'pending' | 'accepted',
        is_friend: followStatusMap.get(contact.user_id) === 'accepted'
      }));

      // Trier: non-amis d'abord, puis par ordre alphabétique
      return contactsWithStatus.sort((a, b) => {
        if (a.is_friend !== b.is_friend) {
          return a.is_friend ? 1 : -1; // Non-amis en premier
        }
        const nameA = (a.display_name || a.username || '').toLowerCase();
        const nameB = (b.display_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return results;
  };

  const handleRequestContactsPermission = async () => {
    console.log('👥🔐 [ContactsTab] Demande permission contacts...');
    setLoading(true);
    setPermissionPrompt(false);

    try {
      console.log('👥📢 [ContactsTab] Appel requestPermissions()...');
      const granted = await requestPermissions();
      console.log('👥📊 [ContactsTab] Résultat permission:', granted ? '✅ GRANTED' : '❌ DENIED');
      
      if (!granted) {
        console.log('👥❌ [ContactsTab] Permission refusée - arrêt du processus');
        toast({
          title: "Permission refusée",
          description: "Vous devez autoriser l'accès aux contacts pour continuer",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // ✅ ÉTAPE 2: Attendre 500ms pour que les permissions Android soient bien enregistrées
      console.log('👥⏳ [ContactsTab] Attente 500ms pour sync permissions...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forcer le rechargement des contacts depuis le device
      console.log('👥📞 [ContactsTab] Appel loadContacts()...');
      const loadedContacts = await loadContacts();
      console.log('👥📊 [ContactsTab] Contacts chargés:', loadedContacts?.length || 0);
      
      // ✅ Attendre que les contacts soient disponibles
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier si on a bien des contacts
      if (loadedContacts && loadedContacts.length > 0) {
        console.log('👥✅ [ContactsTab] Contacts disponibles - Chargement des suggestions');
        await loadContactsFromApp();
      } else {
        console.log('👥⚠️ [ContactsTab] Pas de contacts chargés - Retry dans 2s...');
        
        // ✅ RETRY: Attendre 2s supplémentaires et réessayer
        setTimeout(async () => {
          console.log('👥🔄 [ContactsTab] RETRY - Rechargement contacts...');
          try {
            const retryContacts = await loadContacts();
            console.log('👥📊 [ContactsTab] RETRY - Contacts chargés:', retryContacts?.length || 0);
            
            if (retryContacts && retryContacts.length > 0) {
              console.log('👥✅ [ContactsTab] RETRY SUCCESS - Chargement suggestions');
              await loadContactsFromApp();
            } else {
              console.log('👥❌ [ContactsTab] RETRY FAILED - Aucun contact trouvé');
            }
          } catch (retryError) {
            console.error('👥❌ [ContactsTab] RETRY ERROR:', retryError);
          } finally {
            setLoading(false);
          }
        }, 2000);
        
        return; // Ne pas mettre loading=false maintenant, on attend le retry
      }
      
    } catch (error) {
      console.error('👥❌ [ContactsTab] Erreur lors de la demande de permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de demander l'accès aux contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFollowRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Déjà envoyée",
            description: "Vous avez déjà envoyé une demande à cet utilisateur"
          });
          return;
        }
        throw error;
      }

      setContactSuggestions(prev => prev.filter(c => c.user_id !== targetUserId));

      toast({
        title: "Demande envoyée",
        description: "Votre demande d'abonnement a été envoyée"
      });
    } catch (error) {
      console.error('Error sending follow request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande",
        variant: "destructive"
      });
    }
  };

  // Not native - show message
  if (!isNative) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Smartphone className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Fonctionnalité mobile uniquement</h3>
        <p className="text-sm text-muted-foreground">
          Cette fonctionnalité n'est disponible que sur l'application mobile
        </p>
      </div>
    );
  }

  // Native but no permission yet
  if (!hasPermission && !loading) {
    return (
      <div className="p-4 space-y-4">
        <Card className="glass-card border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Trouvez vos amis</h3>
              <p className="text-sm text-muted-foreground">
                Synchronisez vos contacts téléphoniques pour découvrir qui utilise déjà RunConnect
              </p>
            </div>

            <div className="glass-card p-4 space-y-2 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Vos données sont protégées</p>
                  <p className="text-xs text-muted-foreground">
                    Vos contacts restent privés et ne sont jamais partagés avec d'autres utilisateurs
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleRequestContactsPermission}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2" />
                  Chargement...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Autoriser les contacts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Has permission - show results
  return (
    <div className="p-4 space-y-3">
      {contactSuggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Phone className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun contact trouvé</h3>
          <p className="text-sm text-muted-foreground">
            Aucun de vos contacts n'utilise encore RunConnect
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card p-3 mb-2">
            <p className="text-sm text-muted-foreground">
              {contactSuggestions.length} contact{contactSuggestions.length > 1 ? 's' : ''} trouvé{contactSuggestions.length > 1 ? 's' : ''} sur RunConnect
            </p>
          </div>

          {contactSuggestions.map((contact) => (
            <Card key={contact.user_id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback>
                      {(contact.display_name || contact.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {contact.display_name || contact.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{contact.username}
                    </p>
                  </div>

                  {contact.follow_status === 'accepted' ? (
                    <Badge variant="secondary" className="whitespace-nowrap">
                      Déjà ami
                    </Badge>
                  ) : contact.follow_status === 'pending' ? (
                    <Badge variant="outline" className="whitespace-nowrap">
                      En attente
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendFollowRequest(contact.user_id)}
                      className="whitespace-nowrap"
                    >
                      Suivre
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};
