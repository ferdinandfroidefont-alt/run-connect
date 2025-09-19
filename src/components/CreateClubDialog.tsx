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
import { X, Plus, Users, Search, Camera, Trash2, Lock, Globe, MapPin, Check, ChevronsUpDown } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [groupLocation, setGroupLocation] = useState("");
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
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearchValue, setLocationSearchValue] = useState("");

  // Liste étendue des villes françaises avec codes postaux
  const locations = [
    // Département 01 - Ain
    { code: "01000", name: "Bourg-en-Bresse", department: "01" },
    { code: "01100", name: "Oyonnax", department: "01" },
    // Département 02 - Aisne  
    { code: "02000", name: "Laon", department: "02" },
    { code: "02100", name: "Saint-Quentin", department: "02" },
    // Département 03 - Allier
    { code: "03000", name: "Moulins", department: "03" },
    { code: "03100", name: "Montluçon", department: "03" },
    // Département 04 - Alpes-de-Haute-Provence
    { code: "04000", name: "Digne-les-Bains", department: "04" },
    // Département 05 - Hautes-Alpes
    { code: "05000", name: "Gap", department: "05" },
    // Département 06 - Alpes-Maritimes
    { code: "06000", name: "Nice", department: "06" },
    { code: "06400", name: "Cannes", department: "06" },
    { code: "06150", name: "Antibes", department: "06" },
    // Département 07 - Ardèche
    { code: "07000", name: "Privas", department: "07" },
    // Département 08 - Ardennes
    { code: "08000", name: "Charleville-Mézières", department: "08" },
    // Département 09 - Ariège
    { code: "09000", name: "Foix", department: "09" },
    // Département 10 - Aube
    { code: "10000", name: "Troyes", department: "10" },
    // Département 11 - Aude
    { code: "11000", name: "Carcassonne", department: "11" },
    // Département 12 - Aveyron
    { code: "12000", name: "Rodez", department: "12" },
    // Département 13 - Bouches-du-Rhône
    { code: "13001", name: "Marseille 1er", department: "13" },
    { code: "13002", name: "Marseille 2e", department: "13" },
    { code: "13100", name: "Aix-en-Provence", department: "13" },
    // Département 14 - Calvados
    { code: "14000", name: "Caen", department: "14" },
    // Département 15 - Cantal
    { code: "15000", name: "Aurillac", department: "15" },
    // Département 16 - Charente
    { code: "16000", name: "Angoulême", department: "16" },
    // Département 17 - Charente-Maritime
    { code: "17000", name: "La Rochelle", department: "17" },
    // Département 18 - Cher
    { code: "18000", name: "Bourges", department: "18" },
    // Département 19 - Corrèze
    { code: "19000", name: "Tulle", department: "19" },
    // Département 21 - Côte-d'Or
    { code: "21000", name: "Dijon", department: "21" },
    // Département 22 - Côtes-d'Armor
    { code: "22000", name: "Saint-Brieuc", department: "22" },
    // Département 23 - Creuse
    { code: "23000", name: "Guéret", department: "23" },
    // Département 24 - Dordogne
    { code: "24000", name: "Périgueux", department: "24" },
    // Département 25 - Doubs
    { code: "25000", name: "Besançon", department: "25" },
    // Département 26 - Drôme
    { code: "26000", name: "Valence", department: "26" },
    // Département 27 - Eure
    { code: "27000", name: "Évreux", department: "27" },
    { code: "27450", name: "Saint-Grégoire-du-Vièvre", department: "27" },
    { code: "27100", name: "Val-de-Reuil", department: "27" },
    { code: "27200", name: "Vernon", department: "27" },
    // Département 28 - Eure-et-Loir
    { code: "28000", name: "Chartres", department: "28" },
    // Département 29 - Finistère
    { code: "29000", name: "Quimper", department: "29" },
    { code: "29200", name: "Brest", department: "29" },
    // Département 30 - Gard
    { code: "30000", name: "Nîmes", department: "30" },
    // Département 31 - Haute-Garonne
    { code: "31000", name: "Toulouse", department: "31" },
    // Département 32 - Gers
    { code: "32000", name: "Auch", department: "32" },
    // Département 33 - Gironde
    { code: "33000", name: "Bordeaux", department: "33" },
    // Département 34 - Hérault
    { code: "34000", name: "Montpellier", department: "34" },
    // Département 35 - Ille-et-Vilaine
    { code: "35000", name: "Rennes", department: "35" },
    // Département 36 - Indre
    { code: "36000", name: "Châteauroux", department: "36" },
    // Département 37 - Indre-et-Loire
    { code: "37000", name: "Tours", department: "37" },
    // Département 38 - Isère
    { code: "38000", name: "Grenoble", department: "38" },
    // Département 39 - Jura
    { code: "39000", name: "Lons-le-Saunier", department: "39" },
    // Département 40 - Landes
    { code: "40000", name: "Mont-de-Marsan", department: "40" },
    // Département 41 - Loir-et-Cher
    { code: "41000", name: "Blois", department: "41" },
    // Département 42 - Loire
    { code: "42000", name: "Saint-Étienne", department: "42" },
    // Département 43 - Haute-Loire
    { code: "43000", name: "Le Puy-en-Velay", department: "43" },
    // Département 44 - Loire-Atlantique
    { code: "44000", name: "Nantes", department: "44" },
    // Département 45 - Loiret
    { code: "45000", name: "Orléans", department: "45" },
    // Département 46 - Lot
    { code: "46000", name: "Cahors", department: "46" },
    // Département 47 - Lot-et-Garonne
    { code: "47000", name: "Agen", department: "47" },
    // Département 48 - Lozère
    { code: "48000", name: "Mende", department: "48" },
    // Département 49 - Maine-et-Loire
    { code: "49000", name: "Angers", department: "49" },
    // Département 50 - Manche
    { code: "50000", name: "Saint-Lô", department: "50" },
    // Département 51 - Marne
    { code: "51100", name: "Reims", department: "51" },
    // Département 52 - Haute-Marne
    { code: "52000", name: "Chaumont", department: "52" },
    // Département 53 - Mayenne
    { code: "53000", name: "Laval", department: "53" },
    // Département 54 - Meurthe-et-Moselle
    { code: "54000", name: "Nancy", department: "54" },
    // Département 55 - Meuse
    { code: "55000", name: "Bar-le-Duc", department: "55" },
    // Département 56 - Morbihan
    { code: "56000", name: "Vannes", department: "56" },
    // Département 57 - Moselle
    { code: "57000", name: "Metz", department: "57" },
    // Département 58 - Nièvre
    { code: "58000", name: "Nevers", department: "58" },
    // Département 59 - Nord
    { code: "59000", name: "Lille", department: "59" },
    // Département 60 - Oise
    { code: "60000", name: "Beauvais", department: "60" },
    // Département 61 - Orne
    { code: "61000", name: "Alençon", department: "61" },
    // Département 62 - Pas-de-Calais
    { code: "62000", name: "Arras", department: "62" },
    // Département 63 - Puy-de-Dôme
    { code: "63000", name: "Clermont-Ferrand", department: "63" },
    // Département 64 - Pyrénées-Atlantiques
    { code: "64000", name: "Pau", department: "64" },
    // Département 65 - Hautes-Pyrénées
    { code: "65000", name: "Tarbes", department: "65" },
    // Département 66 - Pyrénées-Orientales
    { code: "66000", name: "Perpignan", department: "66" },
    // Département 67 - Bas-Rhin
    { code: "67000", name: "Strasbourg", department: "67" },
    // Département 68 - Haut-Rhin
    { code: "68000", name: "Colmar", department: "68" },
    // Département 69 - Rhône
    { code: "69001", name: "Lyon 1er", department: "69" },
    { code: "69002", name: "Lyon 2e", department: "69" },
    { code: "69003", name: "Lyon 3e", department: "69" },
    // Département 70 - Haute-Saône
    { code: "70000", name: "Vesoul", department: "70" },
    // Département 71 - Saône-et-Loire
    { code: "71000", name: "Mâcon", department: "71" },
    // Département 72 - Sarthe
    { code: "72000", name: "Le Mans", department: "72" },
    // Département 73 - Savoie
    { code: "73000", name: "Chambéry", department: "73" },
    // Département 74 - Haute-Savoie
    { code: "74000", name: "Annecy", department: "74" },
    // Département 75 - Paris
    { code: "75001", name: "Paris 1er", department: "75" },
    { code: "75002", name: "Paris 2e", department: "75" },
    { code: "75003", name: "Paris 3e", department: "75" },
    { code: "75004", name: "Paris 4e", department: "75" },
    { code: "75005", name: "Paris 5e", department: "75" },
    { code: "75006", name: "Paris 6e", department: "75" },
    { code: "75007", name: "Paris 7e", department: "75" },
    { code: "75008", name: "Paris 8e", department: "75" },
    { code: "75009", name: "Paris 9e", department: "75" },
    { code: "75010", name: "Paris 10e", department: "75" },
    { code: "75011", name: "Paris 11e", department: "75" },
    { code: "75012", name: "Paris 12e", department: "75" },
    { code: "75013", name: "Paris 13e", department: "75" },
    { code: "75014", name: "Paris 14e", department: "75" },
    { code: "75015", name: "Paris 15e", department: "75" },
    { code: "75016", name: "Paris 16e", department: "75" },
    { code: "75017", name: "Paris 17e", department: "75" },
    { code: "75018", name: "Paris 18e", department: "75" },
    { code: "75019", name: "Paris 19e", department: "75" },
    { code: "75020", name: "Paris 20e", department: "75" },
    // Département 76 - Seine-Maritime
    { code: "76000", name: "Rouen", department: "76" },
    { code: "76600", name: "Le Havre", department: "76" },
    // Département 77 - Seine-et-Marne
    { code: "77000", name: "Melun", department: "77" },
    // Département 78 - Yvelines
    { code: "78000", name: "Versailles", department: "78" },
    // Département 79 - Deux-Sèvres
    { code: "79000", name: "Niort", department: "79" },
    // Département 80 - Somme
    { code: "80000", name: "Amiens", department: "80" },
    // Département 81 - Tarn
    { code: "81000", name: "Albi", department: "81" },
    // Département 82 - Tarn-et-Garonne
    { code: "82000", name: "Montauban", department: "82" },
    // Département 83 - Var
    { code: "83000", name: "Toulon", department: "83" },
    // Département 84 - Vaucluse
    { code: "84000", name: "Avignon", department: "84" },
    // Département 85 - Vendée
    { code: "85000", name: "La Roche-sur-Yon", department: "85" },
    // Département 86 - Vienne
    { code: "86000", name: "Poitiers", department: "86" },
    // Département 87 - Haute-Vienne
    { code: "87000", name: "Limoges", department: "87" },
    // Département 88 - Vosges
    { code: "88000", name: "Épinal", department: "88" },
    // Département 89 - Yonne
    { code: "89000", name: "Auxerre", department: "89" },
    // Département 90 - Territoire de Belfort
    { code: "90000", name: "Belfort", department: "90" },
    // Département 91 - Essonne
    { code: "91000", name: "Évry-Courcouronnes", department: "91" },
    // Département 92 - Hauts-de-Seine
    { code: "92000", name: "Nanterre", department: "92" },
    // Département 93 - Seine-Saint-Denis
    { code: "93000", name: "Bobigny", department: "93" },
    // Département 94 - Val-de-Marne
    { code: "94000", name: "Créteil", department: "94" },
    // Département 95 - Val-d'Oise
    { code: "95000", name: "Cergy", department: "95" }
  ];

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
          location: groupLocation.trim() || null,
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
      setGroupLocation("");
      setGroupAvatarUrl("");
      setSelectedMembers([]);
      setIsPrivate(false);
      setSelectedLocation("");
      setLocationSearchValue("");
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

            {/* Group Location */}
            <div>
              <Label htmlFor="groupLocation">Localisation (optionnel)</Label>
              <div className="relative">
                <Popover open={locationSearchOpen} onOpenChange={setLocationSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={locationSearchOpen}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {selectedLocation || "Ex: Paris, Lyon, Marseille..."}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Rechercher par ville ou code postal..."
                        value={locationSearchValue}
                        onValueChange={setLocationSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>Aucune localisation trouvée</CommandEmpty>
                        <CommandGroup>
                          {locations
                            .filter(location => 
                              location.code.includes(locationSearchValue) ||
                              location.name.toLowerCase().includes(locationSearchValue.toLowerCase())
                            )
                            .slice(0, 10)
                            .map((location) => (
                              <CommandItem
                                key={location.code}
                                value={`${location.code}-${location.name}`}
                                onSelect={() => {
                                  const selectedValue = `${location.name} (${location.code})`;
                                  setSelectedLocation(selectedValue);
                                  setGroupLocation(selectedValue);
                                  setLocationSearchOpen(false);
                                  setLocationSearchValue("");
                                }}
                                className="flex items-center gap-2"
                              >
                                <Check 
                                  className={`h-4 w-4 ${
                                    selectedLocation === `${location.name} (${location.code})` 
                                      ? "opacity-100" 
                                      : "opacity-0"
                                  }`} 
                                />
                                <div>
                                  <span className="font-medium">{location.name}</span>
                                  <span className="text-muted-foreground ml-2">({location.code})</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
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