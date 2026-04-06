import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Profile } from "@/types/profile";

type Props = {
  formData: Partial<Profile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Profile>>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
};

export function ProfileEditCard({ formData, setFormData, onSave, onCancel, saving }: Props) {
  const { t } = useLanguage();

  return (
    <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
      <div className="overflow-hidden">
        <div className="space-y-ios-3 px-4 py-3 ios-shell:px-2.5 ios-shell:py-2.5">
          <div>
            <label htmlFor="profile-username" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldUsername")}
            </label>
            <Input
              id="profile-username"
              name="username"
              autoComplete="username"
              value={formData.username || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              className="h-11 rounded-ios-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-display-name" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldDisplayName")}
            </label>
            <Input
              id="profile-display-name"
              name="display_name"
              autoComplete="name"
              value={formData.display_name || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_name: e.target.value,
                }))
              }
              className="h-11 rounded-ios-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-age" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldAge")}
            </label>
            <Input
              id="profile-age"
              name="age"
              inputMode="numeric"
              value={formData.age ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  age: parseInt(e.target.value, 10) || null,
                }))
              }
              className="h-11 rounded-ios-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldPhone")}
            </label>
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder={t("profilePage.placeholderPhone")}
              className="h-11 rounded-ios-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-bio" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldBio")}
            </label>
            <Input
              id="profile-bio"
              name="bio"
              value={formData.bio || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  bio: e.target.value,
                }))
              }
              placeholder={t("profilePage.placeholderBio")}
              className="h-11 rounded-ios-sm"
            />
          </div>
          <div>
            <label htmlFor="profile-country" className="text-ios-footnote text-muted-foreground mb-ios-1 block">
              {t("profilePage.fieldCountry")}
            </label>
            <select
              id="profile-country"
              name="country"
              value={formData.country || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  country: e.target.value || null,
                }))
              }
              className="h-11 w-full rounded-ios-sm border border-input bg-background px-3 text-ios-subheadline"
            >
              <option value="">{t("profilePage.countryUnset")}</option>
              <option value="FR">🇫🇷 France</option>
              <option value="BE">🇧🇪 Belgique</option>
              <option value="CH">🇨🇭 Suisse</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="LU">🇱🇺 Luxembourg</option>
              <option value="MA">🇲🇦 Maroc</option>
              <option value="TN">🇹🇳 Tunisie</option>
              <option value="DZ">🇩🇿 Algérie</option>
              <option value="SN">🇸🇳 Sénégal</option>
              <option value="CI">🇨🇮 Côte d&apos;Ivoire</option>
              <option value="ES">🇪🇸 Espagne</option>
              <option value="PT">🇵🇹 Portugal</option>
              <option value="DE">🇩🇪 Allemagne</option>
              <option value="IT">🇮🇹 Italie</option>
              <option value="GB">🇬🇧 Royaume-Uni</option>
              <option value="US">🇺🇸 États-Unis</option>
            </select>
          </div>
          <div className="flex gap-ios-2 pt-ios-2">
            <Button type="button" onClick={onSave} disabled={saving} className="flex-1 h-11 rounded-ios-sm">
              {saving && <Loader2 className="mr-ios-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-ios-sm">
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
