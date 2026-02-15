import { useState, useEffect } from 'react';
import { Phone, Smartphone, AlertCircle, Users } from 'lucide-react';
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
import { normalizePhoneVariants } from '@/lib/phoneNormalization';

interface ContactSuggestion {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  phone?: string;
}

export const ContactsTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative, hasPermission, requestPermissions, contacts: deviceContacts, loadContacts } = useContacts();
  const [loading, setLoading] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactSuggestion[]>([]);
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [hideFriends, setHideFriends] = useState(false);
  const [friendsMap, setFriendsMap] = useState<Set<string>>(new Set());

  // 🔥 PLAN NIVEAU 31 - FORCER LE CHARGEMENT DES CONTACTS DU TÉLÉPHONE
  useEffect(() => {
    const hasAndroidBridge = !!(window as any).AndroidBridge;
    const actuallyNative = isNative || hasAndroidBridge;
    
    console.log('[ContactsTab NIVEAU 31] 🔍 État détaillé:', {
      isNative,
      hasAndroidBridge,
      actuallyNative,
      hasPermission,
      deviceContactsCount: deviceContacts?.length || 0,
      suggestionsCount: contactSuggestions.length,
      loading
    });

    // 🚀 ÉTAPE 1: Forcer le chargement des contacts du téléphone si vide
    if (actuallyNative && hasPermission && (!deviceContacts || deviceContacts.length === 0) && !loading) {
      console.log('[ContactsTab NIVEAU 31] 🔥 FORCER LOADCONTACTS() - deviceContacts est vide!');
      setLoading(true);
      loadContacts().finally(() => {
        console.log('[ContactsTab NIVEAU 31] ✅ loadContacts() terminé');
        setLoading(false);
      });
    }
    
    // 🚀 ÉTAPE 2: Charger suggestions si contacts du téléphone disponibles
    if (actuallyNative && hasPermission && deviceContacts && deviceContacts.length > 0 && contactSuggestions.length === 0 && !loading) {
      console.log('[ContactsTab NIVEAU 31] 🚀 Chargement suggestions avec', deviceContacts.length, 'contacts téléphone');
      loadContactsFromApp();
    }
  }, [isNative, hasPermission, deviceContacts, loading]);

  // 🔥 RETRY MECHANISM: Écouter l'événement native ready pour re-vérifier
  useEffect(() => {
    const handleNativeReady = (event: any) => {
      console.log('[ContactsTab] 🎯 Native ready event reçu:', event.detail);
      // Force reload si on a les permissions mais pas encore chargé
      if (hasPermission && deviceContacts && deviceContacts.length > 0 && contactSuggestions.length === 0) {
        console.log('[ContactsTab] 🔄 Retry chargement après native ready');
        loadContactsFromApp();
      }
    };

    window.addEventListener('capacitorNativeReady', handleNativeReady);
    return () => window.removeEventListener('capacitorNativeReady', handleNativeReady);
  }, [hasPermission, deviceContacts, contactSuggestions]);

  useEffect(() => {
    // Recharger automatiquement après autorisation
    if (hasPermission && deviceContacts && deviceContacts.length > 0 && contactSuggestions.length === 0) {
      loadContactsFromApp();
    }
  }, [hasPermission]);

  // Charger la liste des amis pour le filtrage
  useEffect(() => {
    if (user && contactSuggestions.length > 0) {
      loadFriendsStatus();
    }
  }, [contactSuggestions, user]);

  // Filtrer contacts selon recherche + toggle amis
  useEffect(() => {
    let filtered = contactSuggestions;
    
    // Filtre 1 : Recherche par query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.display_name?.toLowerCase().includes(q) ||
        contact.username?.toLowerCase().includes(q)
      );
    }
    
    // Filtre 2 : Masquer amis si toggle activé
    if (hideFriends) {
      filtered = filtered.filter(contact => !friendsMap.has(contact.user_id));
    }
    
    console.info('[ContactsTab] Filtered:', {
      total: contactSuggestions.length,
      filtered: filtered.length,
      query: searchQuery,
      hideFriends
    });
    
    setFilteredContacts(filtered);
  }, [contactSuggestions, searchQuery, hideFriends, friendsMap]);

  const loadFriendsStatus = async () => {
    if (!user) return;
    
    const userIds = contactSuggestions.map(c => c.user_id);
    
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .in('following_id', userIds);
    
    const friendIds = new Set(data?.map(f => f.following_id) || []);
    setFriendsMap(friendIds);
  };


  const loadContactsFromApp = async () => {
    if (!deviceContacts || deviceContacts.length === 0) {
      console.log('[ContactsTab NIVEAU 31] ❌ No device contacts available');
      return;
    }

    console.log('[ContactsTab NIVEAU 31] 🚀 Loading contacts from app...', {
      deviceContactsCount: deviceContacts.length,
      sampleContact: deviceContacts[0]
    });
    setLoading(true);

    try {
      const suggestions = await findContactsInApp(deviceContacts);
      console.log('[ContactsTab NIVEAU 31] ✅ Found suggestions:', {
        total: suggestions.length,
        sampleSuggestion: suggestions[0]
      });
      
      // Trier par statut ami (amis en premier) puis nom
      const sorted = suggestions.sort((a, b) => {
        const aIsFriend = friendsMap.has(a.user_id) ? 1 : 0;
        const bIsFriend = friendsMap.has(b.user_id) ? 1 : 0;
        if (aIsFriend !== bIsFriend) return bIsFriend - aIsFriend;
        return (a.display_name || a.username).localeCompare(b.display_name || b.username);
      });
      
      setContactSuggestions(sorted);
      
      toast({
        title: "Contacts synchronisés",
        description: `${sorted.length} contact(s) trouvé(s) sur l'application`,
      });
    } catch (error) {
      console.error('[ContactsTab NIVEAU 31] ❌ Error loading contacts:', error);
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
      console.log('[ContactsTab NIVEAU 31] ❌ No user - aborting');
      return [];
    }

    console.log('[ContactsTab NIVEAU 31] 🔍 Finding contacts in app from', contacts.length, 'device contacts');

    // Extraire TOUTES les variantes de numéros
    const allPhoneVariants: string[] = [];
    let contactsWithPhones = 0;
    
    contacts.forEach((contact, index) => {
      if (contact.phoneNumbers && Array.isArray(contact.phoneNumbers)) {
        contact.phoneNumbers.forEach((phoneObj: any) => {
          if (phoneObj.number) {
            const rawNumber = phoneObj.number;
            const variants = normalizePhoneVariants(rawNumber);
            
            if (index < 3) { // Log premiers contacts pour debug
              console.log('[ContactsTab NIVEAU 31] 📱 Contact example:', {
                name: contact.name,
                rawNumber,
                variants
              });
            }
            
            allPhoneVariants.push(...variants);
            contactsWithPhones++;
          }
        });
      }
    });

    console.log('[ContactsTab NIVEAU 31] 📊 Extraction summary:', {
      totalContacts: contacts.length,
      contactsWithPhones,
      totalVariants: allPhoneVariants.length,
      sampleVariants: allPhoneVariants.slice(0, 5)
    });

    if (allPhoneVariants.length === 0) {
      console.log('[ContactsTab NIVEAU 31] ⚠️ No phone numbers extracted!');
      return [];
    }

    const uniquePhones = [...new Set(allPhoneVariants)];
    console.log('[ContactsTab NIVEAU 31] 🔢 Unique phones:', {
      count: uniquePhones.length,
      samples: uniquePhones.slice(0, 5)
    });

    // Recherche par batch avec .or() pour gérer variantes
    const batchSize = 50;
    const results: ContactSuggestion[] = [];
    let totalBatches = Math.ceil(uniquePhones.length / batchSize);

    for (let i = 0; i < uniquePhones.length; i += batchSize) {
      const batch = uniquePhones.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`[ContactsTab NIVEAU 31] 🔄 Batch ${batchNumber}/${totalBatches}:`, {
        batchSize: batch.length,
        samples: batch.slice(0, 3)
      });
      
      // Construire query OR pour matching multi-format
      const phoneQuery = batch.map(p => `phone.eq.${p}`).join(',');

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, phone')
        .or(phoneQuery)
        .neq('user_id', user.id)
        .limit(50);

      if (error) {
        console.error(`[ContactsTab NIVEAU 31] ❌ Error batch ${batchNumber}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`[ContactsTab NIVEAU 31] ✅ Batch ${batchNumber} found:`, {
          matches: data.length,
          users: data.map(d => ({ username: d.username, phone: d.phone }))
        });
        results.push(...data);
      } else {
        console.log(`[ContactsTab NIVEAU 31] ⚠️ Batch ${batchNumber}: no matches`);
      }
    }

    // Dédupliquer par user_id
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.user_id, r])).values()
    );
    
    console.info('[ContactsTab] Match summary:', {
      deviceContacts: contacts.length,
      phoneVariantsTotal: allPhoneVariants.length,
      uniquePhones: uniquePhones.length,
      matchesFound: uniqueResults.length,
      sampleMatches: uniqueResults.slice(0, 3).map(r => ({
        user: r.username,
        phone: r.phone
      }))
    });

    return uniqueResults;
  };

  const handleRequestContactsPermission = async () => {
    console.log('[ContactsTab] Requesting contacts permission...');
    setLoading(true);
    setPermissionPrompt(false);

    try {
      await requestPermissions();
      
      // Attendre un peu pour que les permissions soient bien enregistrées
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forcer le rechargement des contacts depuis le device
      await loadContacts();
      
      // Attendre que les contacts soient chargés
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Puis charger les suggestions
      if (deviceContacts && deviceContacts.length > 0) {
        await loadContactsFromApp();
      } else {
        console.log('[ContactsTab] No contacts loaded yet, will retry...');
        // Retry après 2s si pas de contacts
        setTimeout(async () => {
          await loadContacts();
          if (deviceContacts && deviceContacts.length > 0) {
            await loadContactsFromApp();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[ContactsTab] Error requesting permission:', error);
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

  // 🔥 DÉTECTION ROBUSTE: Vérifier AndroidBridge directement en plus de isNative
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  const actuallyNative = isNative || hasAndroidBridge;

  // Not native - show message
  if (!actuallyNative) {
    console.log('[ContactsTab] ⚠️ Non-native détecté - isNative:', isNative, 'AndroidBridge:', hasAndroidBridge);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
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
      {/* Toggle "Masquer mes amis" */}
      {contactSuggestions.length > 0 && (
        <div className="glass-card p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} trouvé{filteredContacts.length > 1 ? 's' : ''}
            </p>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Recherche : "{searchQuery}"
              </p>
            )}
          </div>
          <Button
            variant={hideFriends ? "default" : "outline"}
            size="sm"
            onClick={() => setHideFriends(!hideFriends)}
            className="text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            {hideFriends ? "Voir amis" : "Masquer amis"}
          </Button>
        </div>
      )}

      {/* Utiliser filteredContacts au lieu de contactSuggestions */}
      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Phone className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "Aucun résultat" : "Aucun contact trouvé"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery 
              ? `Aucun contact ne correspond à "${searchQuery}"`
              : "Aucun de vos contacts n'utilise encore RunConnect"
            }
          </p>
        </div>
      ) : (
        filteredContacts.map((contact) => (
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {contact.display_name || contact.username}
                    </p>
                    {friendsMap.has(contact.user_id) && (
                      <Badge variant="secondary" className="text-xs">Ami</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    @{contact.username}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => sendFollowRequest(contact.user_id)}
                  disabled={friendsMap.has(contact.user_id)}
                >
                  {friendsMap.has(contact.user_id) ? "Ami" : "Suivre"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
