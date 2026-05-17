import type { ChangeEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Globe, Loader2 } from "lucide-react";

const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";
const HAIRLINE = "#E5E5EA";
const LABEL_GRAY = "#8E8E93";
const PRIMARY_TEXT = "#0A0F1F";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

const AVATAR_GRADIENT = "linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)";

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        color: LABEL_GRAY,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        margin: 0,
        marginTop: 22,
        marginBottom: 6,
        paddingLeft: 28,
        fontFamily: FONT,
      }}
    >
      {label}
    </p>
  );
}

function FormCard({ children, padding }: { children: ReactNode; padding?: boolean }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: "0 0.5px 0 rgba(0,0,0,0.05)",
        padding: padding ? "14px 16px" : 0,
      }}
    >
      {children}
    </div>
  );
}

function FormRowDivider() {
  return <div style={{ height: 0.5, background: HAIRLINE, marginLeft: 16 }} />;
}

function FormInputRow({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "tel" | "text";
  placeholder?: string;
}) {
  return (
    <div className="flex items-center px-4" style={{ minHeight: 48, gap: 12 }}>
      <label
        className="max-w-[45%] shrink-0 truncate"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: PRIMARY_TEXT,
          letterSpacing: "-0.01em",
          fontFamily: FONT,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-right outline-none"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: PRIMARY_TEXT,
          letterSpacing: "-0.01em",
          fontFamily: FONT,
        }}
      />
    </div>
  );
}

function FormSelectRow({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onClick: () => void;
}) {
  const display = value?.trim() || placeholder;
  const isPlaceholder = !value?.trim();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center px-4 active:bg-[#F8F8F8]"
      style={{ minHeight: 48, gap: 12 }}
    >
      <span
        className="max-w-[55%] shrink-0 truncate text-left"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: PRIMARY_TEXT,
          letterSpacing: "-0.01em",
          fontFamily: FONT,
        }}
      >
        {label}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-right"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: isPlaceholder ? LABEL_GRAY : PRIMARY_TEXT,
          letterSpacing: "-0.01em",
          fontFamily: FONT,
        }}
      >
        {display}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
    </button>
  );
}

function IOSToggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: on ? "#34C759" : "#E9E9EB",
        padding: 2,
      }}
      aria-pressed={on}
    >
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </button>
  );
}

export type ProfileEditMaquetteViewProps = {
  saving: boolean;
  displayAvatar: string;
  avatarInitials: string;
  username: string;
  displayName: string;
  age: string;
  phone: string;
  bio: string;
  sportDisplay: string | null;
  countryDisplay: string | null;
  isPrivate: boolean;
  onBack: () => void;
  onSave: () => void;
  onAvatarClick: () => void;
  onUsernameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  onAgeChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onBioChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSportClick: () => void;
  onCountryClick: () => void;
  onPrivateChange: (v: boolean) => void;
  saveDisabled?: boolean;
};

export function ProfileEditMaquetteView({
  saving,
  displayAvatar,
  avatarInitials,
  username,
  displayName,
  age,
  phone,
  bio,
  sportDisplay,
  countryDisplay,
  isPrivate,
  onBack,
  onSave,
  onAvatarClick,
  onUsernameChange,
  onDisplayNameChange,
  onAgeChange,
  onPhoneChange,
  onBioChange,
  onSportClick,
  onCountryClick,
  onPrivateChange,
  saveDisabled,
}: ProfileEditMaquetteViewProps) {
  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ background: BG, fontFamily: FONT }}
    >
      <header
        className="flex shrink-0 items-center px-4 pb-3"
        style={{
          background: "white",
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingTop: "max(env(safe-area-inset-top), 12px)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center transition-opacity active:opacity-70"
        >
          <ChevronLeft className="h-6 w-6" color={ACTION_BLUE} strokeWidth={2.6} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: ACTION_BLUE,
              letterSpacing: "-0.01em",
            }}
          >
            Retour
          </span>
        </button>
        <h1
          className="min-w-0 flex-1 truncate px-2 text-center"
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: PRIMARY_TEXT,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Modifier le profil
        </h1>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="shrink-0 px-1 transition-opacity active:opacity-70 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" color={ACTION_BLUE} aria-hidden />
          ) : (
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: ACTION_BLUE,
                letterSpacing: "-0.01em",
              }}
            >
              OK
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),32px)]">
        <div className="flex flex-col items-center pb-3 pt-5">
          <button type="button" onClick={onAvatarClick} className="transition-opacity active:opacity-90">
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: displayAvatar
                  ? `url("${displayAvatar.replace(/"/g, '\\"')}") center/cover`
                  : AVATAR_GRADIENT,
                color: "white",
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                border: "3px solid white",
                boxShadow: "0 6px 20px rgba(0,122,255,0.25)",
              }}
            >
              {!displayAvatar && avatarInitials}
            </div>
          </button>
          <button
            type="button"
            onClick={onAvatarClick}
            className="mt-3 transition-opacity active:opacity-70"
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: ACTION_BLUE,
                letterSpacing: "-0.01em",
              }}
            >
              Changer la photo (facultatif)
            </span>
          </button>
        </div>

        <SectionHeader label="Informations" />
        <FormCard>
          <FormInputRow label="Pseudo" value={username} onChange={onUsernameChange} placeholder="pseudo" />
          <FormRowDivider />
          <FormInputRow
            label="Nom d'affichage"
            value={displayName}
            onChange={onDisplayNameChange}
            placeholder="Nom"
          />
          <FormRowDivider />
          <FormInputRow
            label="Âge"
            value={age}
            onChange={onAgeChange}
            type="number"
            inputMode="numeric"
            placeholder="—"
          />
          <FormRowDivider />
          <FormInputRow
            label="Téléphone (facultatif)"
            value={phone}
            onChange={onPhoneChange}
            type="tel"
            inputMode="tel"
            placeholder="—"
          />
        </FormCard>

        <SectionHeader label="Bio" />
        <FormCard padding>
          <textarea
            value={bio}
            onChange={onBioChange}
            rows={5}
            maxLength={200}
            placeholder="Quelques mots sur toi…"
            className="w-full resize-none border-0 bg-transparent outline-none"
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: PRIMARY_TEXT,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              fontFamily: FONT,
            }}
          />
          <p
            className="mt-1 text-right"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: LABEL_GRAY,
              margin: 0,
            }}
          >
            {bio.length}/200
          </p>
        </FormCard>

        <SectionHeader label="Préférences" />
        <FormCard>
          <FormSelectRow
            label="Sport favori (facultatif)"
            value={sportDisplay}
            placeholder="Non renseigné"
            onClick={onSportClick}
          />
          <FormRowDivider />
          <FormSelectRow
            label="Pays (facultatif)"
            value={countryDisplay}
            placeholder="Non renseigné"
            onClick={onCountryClick}
          />
        </FormCard>

        <SectionHeader label="Confidentialité" />
        <FormCard padding>
          <div className="flex items-center gap-3">
            <div
              className="flex shrink-0 items-center justify-center rounded-md"
              style={{ width: 30, height: 30, background: "#34C759" }}
            >
              <Globe className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
            </div>
            <span
              className="min-w-0 flex-1"
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: PRIMARY_TEXT,
                letterSpacing: "-0.01em",
              }}
            >
              Compte privé
            </span>
            <IOSToggle on={isPrivate} onChange={onPrivateChange} />
          </div>
          <p
            style={{
              fontSize: 13,
              color: LABEL_GRAY,
              margin: 0,
              marginTop: 10,
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            {isPrivate
              ? "Seuls vos abonnés peuvent voir votre profil et vos séances."
              : "Tout le monde peut voir votre profil et vos séances."}
          </p>
        </FormCard>

        <div className="mt-6 px-4">
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || saving}
            className="w-full transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{
              padding: "15px",
              background: ACTION_BLUE,
              color: "white",
              borderRadius: 9999,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 14px rgba(0,122,255,0.3)",
              fontFamily: FONT,
            }}
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Enregistrement…
              </span>
            ) : (
              "Enregistrer les modifications"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
