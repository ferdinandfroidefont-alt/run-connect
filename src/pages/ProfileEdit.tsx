import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { CoachingFullscreenHeader } from "@/components/coaching/CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { Camera, User, Loader2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPORT_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "running", label: "🏃 Course à pied" },
  { value: "cycling", label: "🚴 Vélo" },
  { value: "triathlon", label: "🏅 Triathlon" },
  { value: "swimming", label: "🏊 Natation" },
  { value: "walking", label: "🚶 Marche" },
  { value: "trail", label: "⛰️ Trail" },
];

const COUNTRY_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "BE", label: "🇧🇪 Belgique" },
  { value: "CH", label: "🇨🇭 Suisse" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "LU", label: "🇱🇺 Luxembourg" },
  { value: "MA", label: "🇲🇦 Maroc" },
  { value: "TN", label: "🇹🇳 Tunisie" },
  { value: "DZ", label: "🇩🇿 Algérie" },
  { value: "SN", label: "🇸🇳 Sénégal" },
  { value: "CI", label: "🇨🇮 Côte d'Ivoire" },
  { value: "ES", label: "🇪🇸 Espagne" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "DE", label: "🇩🇪 Allemagne" },
  { value: "IT", label: "🇮🇹 Italie" },
  { value: "GB", label: "🇬🇧 Royaume-Uni" },
  { value: "US", label: "🇺🇸 États-Unis" },
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    bio: "",
    phone: "",
    age: null as number | null,
    favorite_sport: "",
    country: "",
    avatar_url: "",
    is_private: false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, display_name, bio, phone, age, favorite_sport, country, avatar_url, is_private")
          .eq("user_id", user.id)
          .single();
        if (error) throw error;
        if (data) {
          setFormData({
            username: data.username || "",
            display_name: data.display_name || "",
            bio: data.bio || "",
            phone: data.phone || "",
            age: data.age,
            favorite_sport: data.favorite_sport || "",
            country: data.country || "",
            avatar_url: data.avatar_url || "",
            is_private: data.is_private || false,
          });
        }
      } catch (e: any) {
        console.error("ProfileEdit fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarPick = async () => {
    try {
      const isNative = !!(window as any).Capacitor;
      if (isNative) {
        const result = await selectFromGallery();
        if (result) {
          setOriginalImageSrc(result as string);
          setShowCropEditor(true);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Erreur", description: "Max 5 MB", variant: "destructive" });
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            setOriginalImageSrc(ev.target?.result as string);
            setShowCropEditor(true);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    } catch {
      // cancelled
    }
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(blob));
    setShowCropEditor(false);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${user?.id}-${Math.random()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) return null;
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        if (!uploaded) {
          toast({ title: "Erreur", description: "Upload avatar échoué", variant: "destructive" });
          setSaving(false);
          return;
        }
        avatarUrl = uploaded;
      }

      let phone = formData.phone;
      if (phone) {
        phone = phone.replace(/[\s\-\(\)]/g, "");
        if (phone.startsWith("+33")) phone = "0" + phone.substring(3);
        else if (phone.startsWith("33") && phone.length === 11) phone = "0" + phone.substring(2);
        else if (phone.length === 9 && /^[1-9]/.test(phone)) phone = "0" + phone;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          display_name: formData.display_name || null,
          bio: formData.bio || null,
          phone: phone || null,
          age: formData.age,
          favorite_sport: formData.favorite_sport || null,
          country: formData.country || null,
          avatar_url: avatarUrl,
          is_private: formData.is_private,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast({ title: "Profil mis à jour !" });
      navigate(-1);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || formData.avatar_url;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1 bg-secondary"
        header={
          <CoachingFullscreenHeader
            title="Modifier le profil"
            onBack={() => navigate(-1)}
            rightSlot={
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="text-[17px] font-semibold text-primary disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "OK"}
              </button>
            }
          />
        }
        scrollClassName="bg-secondary py-4"
      >
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <button type="button" onClick={handleAvatarPick} className="group relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-active:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <button
            type="button"
            onClick={handleAvatarPick}
            className="mt-2 text-[15px] font-medium text-primary"
          >
            Changer la photo
          </button>
        </div>

        {/* Informations */}
        <IOSListGroup header="INFORMATIONS">
          <IOSListItem
            title="Pseudo"
            showChevron={false}
            rightElement={
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="border-0 bg-transparent p-0 text-right text-[17px] text-foreground shadow-none focus-visible:ring-0 h-auto"
                placeholder="pseudo"
              />
            }
          />
          <IOSListItem
            title="Nom d'affichage"
            showChevron={false}
            rightElement={
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="border-0 bg-transparent p-0 text-right text-[17px] text-foreground shadow-none focus-visible:ring-0 h-auto"
                placeholder="Nom"
              />
            }
          />
          <IOSListItem
            title="Âge"
            showChevron={false}
            rightElement={
              <Input
                type="number"
                value={formData.age ?? ""}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                className="border-0 bg-transparent p-0 text-right text-[17px] text-foreground shadow-none focus-visible:ring-0 w-20 h-auto"
                placeholder="—"
              />
            }
          />
          <IOSListItem
            title="Téléphone"
            showChevron={false}
            rightElement={
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-0 bg-transparent p-0 text-right text-[17px] text-foreground shadow-none focus-visible:ring-0 h-auto"
                placeholder="06 12 34 56 78"
              />
            }
          />
        </IOSListGroup>

        {/* Bio */}
        <IOSListGroup header="BIO">
          <div className="bg-card px-4 py-3">
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Décrivez vos objectifs, vos records..."
              className="min-h-[80px] border-0 bg-transparent p-0 text-[17px] text-foreground shadow-none resize-none focus-visible:ring-0"
              maxLength={200}
            />
            <p className="mt-1 text-right text-[13px] text-muted-foreground">
              {formData.bio.length}/200
            </p>
          </div>
        </IOSListGroup>

        {/* Sport & Pays */}
        <IOSListGroup header="PRÉFÉRENCES">
          <IOSListItem
            title="Sport favori"
            showChevron={false}
            rightElement={
              <select
                value={formData.favorite_sport}
                onChange={(e) => setFormData({ ...formData, favorite_sport: e.target.value })}
                className="appearance-none border-0 bg-transparent text-right text-[17px] text-muted-foreground focus:outline-none"
              >
                {SPORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            }
          />
          <IOSListItem
            title="Pays"
            showChevron={false}
            rightElement={
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="appearance-none border-0 bg-transparent text-right text-[17px] text-muted-foreground focus:outline-none"
              >
                {COUNTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            }
          />
        </IOSListGroup>

        {/* Confidentialité */}
        <IOSListGroup header="CONFIDENTIALITÉ">
          <IOSListItem
            icon={formData.is_private ? Lock : Globe}
            iconBgColor={formData.is_private ? "bg-orange-500" : "bg-green-500"}
            title="Compte privé"
            showChevron={false}
            rightElement={
              <Switch
                checked={formData.is_private}
                onCheckedChange={(v) => setFormData({ ...formData, is_private: v })}
              />
            }
          />
          <div className="bg-card px-4 pb-3 pt-0">
            <p className="text-[13px] text-muted-foreground leading-tight">
              {formData.is_private
                ? "Seuls vos abonnés approuvés peuvent voir vos séances et activités."
                : "Tout le monde peut voir votre profil et vos séances."}
            </p>
          </div>
        </IOSListGroup>

        {/* Save button */}
        <div className="px-4 pb-8 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || !formData.username.trim()}
            className="w-full rounded-xl h-12 text-[17px] font-semibold"
          >
            {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </div>
      </IosFixedPageHeaderShell>

      <ImageCropEditor
        open={showCropEditor}
        onClose={() => setShowCropEditor(false)}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
