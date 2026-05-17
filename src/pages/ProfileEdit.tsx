import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { ProfileEditMaquetteView } from "@/components/profile/ProfileEditMaquetteView";
import {
  HomeMapFilterGroupedList,
  HomeMapFilterRow,
  HomeMapFilterSheet,
} from "@/components/map/HomeMapFilterSheet";
import { prepareImageForProfileCrop } from "@/lib/prepareImageForProfileCrop";
import { COUNTRY_LABELS } from "@/lib/countryLabels";
import {
  PROFILE_SPORT_KEYS,
  PROFILE_SPORT_LABELS,
  type ProfileSportKey,
  parseProfileSports,
} from "@/lib/profileSports";
import { Camera, Loader2, Trash2, ImageIcon } from "lucide-react";

const COUNTRY_CODES = Object.keys(COUNTRY_LABELS);

function profileInitials(
  fullName: string | null | undefined,
  username: string | null | undefined
): string {
  const source = (fullName || username || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

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
    is_private: true,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState("");
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [preparingAvatarCrop, setPreparingAvatarCrop] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "username, display_name, bio, phone, age, favorite_sport, country, avatar_url, is_private"
          )
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
      } catch (e: unknown) {
        console.error("ProfileEdit fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [user]);

  const primarySportKey = useMemo(() => {
    const keys = parseProfileSports(formData.favorite_sport);
    return keys[0] as ProfileSportKey | undefined;
  }, [formData.favorite_sport]);

  const sportDisplay = useMemo(() => {
    if (!primarySportKey || !(primarySportKey in PROFILE_SPORT_LABELS)) return null;
    const meta = PROFILE_SPORT_LABELS[primarySportKey];
    return `${meta.emoji} ${meta.label}`;
  }, [primarySportKey]);

  const countryDisplay = useMemo(() => {
    if (!formData.country) return null;
    return COUNTRY_LABELS[formData.country] ?? formData.country;
  }, [formData.country]);

  const openCropFromPreparedInput = async (input: File | string) => {
    setPreparingAvatarCrop(true);
    try {
      const imageSrc = await prepareImageForProfileCrop(input);
      setOriginalImageSrc(imageSrc);
      setShowCropEditor(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de préparer cette image pour le recadrage.",
        variant: "destructive",
      });
    } finally {
      setPreparingAvatarCrop(false);
    }
  };

  const handlePickFromGallery = async () => {
    setShowAvatarSheet(false);
    try {
      const isNative = !!(window as Window & { Capacitor?: unknown }).Capacitor;
      if (isNative) {
        const result = await selectFromGallery();
        if (result) {
          if (result.size > 5 * 1024 * 1024) {
            toast({ title: "Erreur", description: "Max 5 Mo", variant: "destructive" });
            return;
          }
          await openCropFromPreparedInput(result);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Erreur", description: "Max 5 Mo", variant: "destructive" });
            return;
          }
          void openCropFromPreparedInput(file);
        };
        input.click();
      }
    } catch {
      // cancelled
    }
  };

  const handleTakePhoto = async () => {
    setShowAvatarSheet(false);
    try {
      const isNative = !!(window as Window & { Capacitor?: unknown }).Capacitor;
      if (isNative) {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import(
          "@capacitor/camera"
        );
        const photo = await CapCamera.getPhoto({
          quality: 82,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (photo.dataUrl) {
          await openCropFromPreparedInput(photo.dataUrl);
        }
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.setAttribute("capture", "environment");
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Erreur", description: "Max 5 Mo", variant: "destructive" });
            return;
          }
          void openCropFromPreparedInput(file);
        };
        input.click();
      }
    } catch {
      // cancelled
    }
  };

  const handleDeleteAvatar = () => {
    setShowAvatarSheet(false);
    setAvatarFile(null);
    setAvatarPreview("");
    setFormData((prev) => ({ ...prev, avatar_url: "" }));
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(blob));
    setShowCropEditor(false);
    setOriginalImageSrc("");
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
        phone = phone.replace(/[\s\-()]/g, "");
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || formData.avatar_url;
  const avatarInitials = profileInitials(formData.display_name, formData.username);

  const selectSport = (key: ProfileSportKey | "") => {
    setFormData((prev) => ({
      ...prev,
      favorite_sport: key || "",
    }));
    setSportSheetOpen(false);
  };

  const selectCountry = (code: string) => {
    setFormData((prev) => ({ ...prev, country: code }));
    setCountrySheetOpen(false);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: "#F2F2F7" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <>
      <ProfileEditMaquetteView
        saving={saving}
        displayAvatar={displayAvatar}
        avatarInitials={avatarInitials}
        username={formData.username}
        displayName={formData.display_name}
        age={formData.age != null ? String(formData.age) : ""}
        phone={formData.phone}
        bio={formData.bio}
        sportDisplay={sportDisplay}
        countryDisplay={countryDisplay}
        isPrivate={formData.is_private}
        onBack={() => navigate(-1)}
        onSave={() => void handleSave()}
        onAvatarClick={() => setShowAvatarSheet(true)}
        onUsernameChange={(username) => setFormData((prev) => ({ ...prev, username }))}
        onDisplayNameChange={(display_name) => setFormData((prev) => ({ ...prev, display_name }))}
        onAgeChange={(raw) => {
          const parsed = parseInt(raw, 10);
          setFormData((prev) => ({
            ...prev,
            age: raw === "" || Number.isNaN(parsed) ? null : parsed,
          }));
        }}
        onPhoneChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
        onBioChange={(e) =>
          setFormData((prev) => ({ ...prev, bio: e.target.value.slice(0, 200) }))
        }
        onSportClick={() => setSportSheetOpen(true)}
        onCountryClick={() => setCountrySheetOpen(true)}
        onPrivateChange={(is_private) => setFormData((prev) => ({ ...prev, is_private }))}
        saveDisabled={!formData.username.trim()}
      />

      <HomeMapFilterSheet
        open={sportSheetOpen}
        onClose={() => setSportSheetOpen(false)}
        title="Sport favori"
        titleId="profile-edit-sport-title"
        variant="tall"
      >
        <HomeMapFilterGroupedList>
          <HomeMapFilterRow
            label="Non renseigné"
            selected={!primarySportKey}
            onClick={() => selectSport("")}
          />
          {PROFILE_SPORT_KEYS.map((key) => {
            const meta = PROFILE_SPORT_LABELS[key];
            return (
              <HomeMapFilterRow
                key={key}
                label={`${meta.emoji} ${meta.label}`}
                selected={primarySportKey === key}
                onClick={() => selectSport(key)}
              />
            );
          })}
        </HomeMapFilterGroupedList>
      </HomeMapFilterSheet>

      <HomeMapFilterSheet
        open={countrySheetOpen}
        onClose={() => setCountrySheetOpen(false)}
        title="Pays"
        titleId="profile-edit-country-title"
        variant="tall"
      >
        <HomeMapFilterGroupedList>
          <HomeMapFilterRow
            label="Non renseigné"
            selected={!formData.country}
            onClick={() => selectCountry("")}
          />
          {COUNTRY_CODES.map((code) => (
            <HomeMapFilterRow
              key={code}
              label={COUNTRY_LABELS[code]!}
              selected={formData.country === code}
              onClick={() => selectCountry(code)}
            />
          ))}
        </HomeMapFilterGroupedList>
      </HomeMapFilterSheet>

      {preparingAvatarCrop && (
        <div className="fixed inset-0 z-[260] flex flex-col items-center justify-center gap-3 bg-black/55 px-6">
          <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden />
          <p className="text-center text-[15px] font-medium text-white">Préparation de la photo…</p>
        </div>
      )}

      <ImageCropEditor
        open={showCropEditor}
        onClose={() => {
          setShowCropEditor(false);
          setOriginalImageSrc("");
        }}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />

      {showAvatarSheet && (
        <div
          className="pointer-events-auto fixed inset-0 z-[250] flex items-end justify-center"
          role="presentation"
          onClick={() => setShowAvatarSheet(false)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden />
          <div
            className="relative z-10 w-full max-w-md px-2 pb-[max(env(safe-area-inset-bottom),8px)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Actions photo de profil"
          >
            <div className="mb-2 overflow-hidden rounded-2xl bg-white shadow-lg">
              {displayAvatar && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  className="flex w-full items-center gap-3 border-b border-[#E5E5EA]/80 px-4 py-3.5 text-left text-[16px] font-normal text-destructive transition-colors active:bg-[#F2F2F7]"
                >
                  <Trash2 className="h-5 w-5 shrink-0" />
                  Supprimer la photo
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTakePhoto()}
                className="flex w-full items-center gap-3 border-b border-[#E5E5EA]/80 px-4 py-3.5 text-left text-[16px] font-normal text-[#0A0F1F] transition-colors active:bg-[#F2F2F7]"
              >
                <Camera className="h-5 w-5 shrink-0 text-[#8E8E93]" />
                Prendre une photo
              </button>
              <button
                type="button"
                onClick={() => void handlePickFromGallery()}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[16px] font-normal text-[#0A0F1F] transition-colors active:bg-[#F2F2F7]"
              >
                <ImageIcon className="h-5 w-5 shrink-0 text-[#8E8E93]" />
                Choisir une photo existante
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarSheet(false)}
              className="w-full rounded-2xl bg-white py-3.5 text-center text-[17px] font-semibold text-[#007AFF] shadow-lg transition-colors active:bg-[#F2F2F7]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}
