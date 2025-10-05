import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWardrobe, CLOTHING_CATALOG, ClothingItem } from '@/hooks/useWardrobe';
import { Lock, Check } from 'lucide-react';
import { PhotorealisticAvatar3D } from './PhotorealisticAvatar3D';
import { AvatarSelector } from './AvatarSelector';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface WardrobeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WardrobeDialog = ({ open, onOpenChange }: WardrobeDialogProps) => {
  const { wardrobe, userPoints, equipItem, getEquippedItems } = useWardrobe();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarModelId, setAvatarModelId] = useState<string>('male-athlete-01');
  const equippedItems = getEquippedItems();
  
  const unlockedItemIds = new Set(wardrobe.map(i => i.item_id));

  useEffect(() => {
    const fetchAvatarModel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('avatar_model_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.avatar_model_id) {
        setAvatarModelId(data.avatar_model_id);
      }
    };

    if (open) {
      fetchAvatarModel();
    }
  }, [open]);
  
  const renderItemCard = (item: ClothingItem) => {
    const isUnlocked = unlockedItemIds.has(item.id);
    const isEquipped = equippedItems[item.type] === item.id;
    
    return (
      <div
        key={item.id}
        className={`relative p-4 rounded-lg border-2 transition-all ${
          isEquipped 
            ? 'border-primary bg-primary/10' 
            : isUnlocked 
              ? 'border-border hover:border-primary/50' 
              : 'border-muted bg-muted/20'
        }`}
      >
        {isEquipped && (
          <Badge className="absolute top-2 right-2 bg-primary">
            <Check className="w-3 h-3 mr-1" />
            Équipé
          </Badge>
        )}
        
        {!isUnlocked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          
          <div className="flex items-center justify-between pt-2">
            <Badge variant={isUnlocked ? "default" : "secondary"}>
              {item.pointsRequired} pts
            </Badge>
            
            {isUnlocked && !isEquipped && (
              <Button 
                size="sm" 
                onClick={() => equipItem(item.id, item.type)}
              >
                Équiper
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const filterItemsByType = (type: string) => 
    CLOTHING_CATALOG.filter(item => item.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>👕 Ma Garde-robe</span>
            <Badge variant="outline" className="text-base">
              {userPoints} points
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        {/* Avatar Preview Section */}
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Aperçu de l'avatar</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvatarSelector(true)}
            >
              Changer d'avatar
            </Button>
          </div>
          <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg overflow-hidden">
            <PhotorealisticAvatar3D
              avatarModelId={avatarModelId}
              topItemId={equippedItems.top}
              bottomItemId={equippedItems.bottom}
              shoesItemId={equippedItems.shoes}
              className="w-full h-full"
            />
          </div>
        </div>
        
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="top">T-shirts</TabsTrigger>
            <TabsTrigger value="bottom">Pantalons</TabsTrigger>
            <TabsTrigger value="shoes">Chaussures</TabsTrigger>
            <TabsTrigger value="accessory">Accessoires</TabsTrigger>
          </TabsList>
          
          <TabsContent value="top" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {filterItemsByType('top').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="bottom" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {filterItemsByType('bottom').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="shoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {filterItemsByType('shoes').map(renderItemCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="accessory" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {filterItemsByType('accessory').map(renderItemCard)}
            </div>
            {filterItemsByType('accessory').length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun accessoire disponible pour le moment
              </p>
            )}
          </TabsContent>
        </Tabs>

        <AvatarSelector
          open={showAvatarSelector}
          onOpenChange={setShowAvatarSelector}
          currentAvatarId={avatarModelId}
          onAvatarSelected={(newId) => setAvatarModelId(newId)}
        />
      </DialogContent>
    </Dialog>
  );
};
