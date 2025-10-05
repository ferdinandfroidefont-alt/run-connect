import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WardrobeItem {
  id: string;
  item_id: string;
  item_type: 'top' | 'bottom' | 'shoes' | 'accessory';
  unlocked_at: string;
  is_equipped: boolean;
  texture_url?: string;
  brand_logo_url?: string;
  material_type?: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  type: 'top' | 'bottom' | 'shoes' | 'accessory';
  pointsRequired: number;
  description: string;
  texture_url?: string;
  brand_logo_url?: string;
  material_type?: string;
}

// Catalogue de vêtements débloquables
export const CLOTHING_CATALOG: ClothingItem[] = [
  // T-shirts
  { id: 'white-tshirt', name: 'T-shirt blanc', type: 'top', pointsRequired: 0, description: 'Tenue de départ' },
  { id: 'blue-tshirt', name: 'T-shirt bleu', type: 'top', pointsRequired: 500, description: 'Rang Bronze' },
  { id: 'red-tshirt', name: 'T-shirt rouge', type: 'top', pointsRequired: 1000, description: 'Rang Argent' },
  { id: 'gold-tshirt', name: 'T-shirt doré', type: 'top', pointsRequired: 2000, description: 'Rang Or' },
  { id: 'diamond-tshirt', name: 'T-shirt diamant', type: 'top', pointsRequired: 5000, description: 'Rang Diamant' },
  
  // Pantalons
  { id: 'blue-shorts', name: 'Short bleu', type: 'bottom', pointsRequired: 750, description: 'Déblocable' },
  { id: 'black-pants', name: 'Pantalon noir', type: 'bottom', pointsRequired: 1500, description: 'Déblocable' },
  { id: 'sport-pants', name: 'Pantalon sport', type: 'bottom', pointsRequired: 3000, description: 'Déblocable' },
  
  // Chaussures
  { id: 'sneakers-white', name: 'Baskets blanches', type: 'shoes', pointsRequired: 600, description: 'Déblocable' },
  { id: 'sneakers-red', name: 'Baskets rouges', type: 'shoes', pointsRequired: 1200, description: 'Déblocable' },
  { id: 'running-pro', name: 'Chaussures Pro', type: 'shoes', pointsRequired: 2500, description: 'Déblocable' },
];

export const useWardrobe = () => {
  const { user } = useAuth();
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    if (user) {
      fetchWardrobe();
      fetchUserPoints();
      checkAndUnlockItems();
    }
  }, [user]);

  const fetchWardrobe = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_wardrobe')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setWardrobe((data || []) as WardrobeItem[]);
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setUserPoints(data?.total_points || 0);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const checkAndUnlockItems = async () => {
    if (!user) return;
    
    try {
      // Récupérer les points de l'utilisateur
      const { data: scoreData } = await supabase
        .from('user_scores')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      
      const points = scoreData?.total_points || 0;
      
      // Vérifier les items débloquables
      const { data: unlockedItems } = await supabase
        .from('user_wardrobe')
        .select('item_id')
        .eq('user_id', user.id);
      
      const unlockedItemIds = new Set(unlockedItems?.map(i => i.item_id) || []);
      
      // Débloquer les nouveaux items
      const itemsToUnlock = CLOTHING_CATALOG.filter(
        item => item.pointsRequired <= points && !unlockedItemIds.has(item.id)
      );
      
      for (const item of itemsToUnlock) {
        await supabase.from('user_wardrobe').insert({
          user_id: user.id,
          item_id: item.id,
          item_type: item.type,
          is_equipped: false
        });
        
        toast.success(`🎉 Nouveau vêtement débloqué: ${item.name}!`);
      }
      
      if (itemsToUnlock.length > 0) {
        fetchWardrobe();
      }
    } catch (error) {
      console.error('Error checking unlockable items:', error);
    }
  };

  const equipItem = async (itemId: string, itemType: string) => {
    if (!user) return;
    
    try {
      // Déséquiper tous les items du même type
      await supabase
        .from('user_wardrobe')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('item_type', itemType);
      
      // Équiper le nouvel item
      await supabase
        .from('user_wardrobe')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('item_id', itemId);
      
      fetchWardrobe();
      toast.success('Vêtement équipé !');
    } catch (error) {
      console.error('Error equipping item:', error);
      toast.error('Erreur lors de l\'équipement');
    }
  };

  const getEquippedItems = () => {
    return {
      top: wardrobe.find(i => i.item_type === 'top' && i.is_equipped)?.item_id || 'white-tshirt',
      bottom: wardrobe.find(i => i.item_type === 'bottom' && i.is_equipped)?.item_id,
      shoes: wardrobe.find(i => i.item_type === 'shoes' && i.is_equipped)?.item_id,
      accessory: wardrobe.find(i => i.item_type === 'accessory' && i.is_equipped)?.item_id,
    };
  };

  return {
    wardrobe,
    loading,
    userPoints,
    equipItem,
    getEquippedItems,
    refreshWardrobe: fetchWardrobe,
  };
};
