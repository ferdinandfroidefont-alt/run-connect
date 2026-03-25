import { useEffect, useState } from "react";
import { InteractiveTutorial } from "@/components/InteractiveTutorial";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TutorialStep } from "@/hooks/useTutorial";

export type SettingsTutorialPageId =
  | "general"
  | "notifications"
  | "connections"
  | "privacy"
  | "support";

type Props = {
  page: SettingsTutorialPageId;
  active: boolean;
  onDismiss: () => void;
};

function stepsForPage(page: SettingsTutorialPageId, t: (key: string) => string): TutorialStep[] {
  const p = `settings.pageTutorial.${page}`;
  switch (page) {
    case "general":
      return [
        {
          target: '[data-tutorial="settings-general-appearance"]',
          title: t(`${p}.s1Title`),
          content: t(`${p}.s1Content`),
          placement: "bottom",
        },
        {
          target: '[data-tutorial="settings-general-units"]',
          title: t(`${p}.s2Title`),
          content: t(`${p}.s2Content`),
          placement: "top",
        },
        {
          target: '[data-tutorial="settings-general-map"]',
          title: t(`${p}.s3Title`),
          content: t(`${p}.s3Content`),
          placement: "top",
        },
      ];
    case "notifications":
      return [
        {
          target: '[data-tutorial="settings-notifications-push"]',
          title: t(`${p}.s1Title`),
          content: t(`${p}.s1Content`),
          placement: "bottom",
        },
        {
          target: '[data-tutorial="settings-notifications-types"]',
          title: t(`${p}.s2Title`),
          content: t(`${p}.s2Content`),
          placement: "top",
        },
      ];
    case "connections":
      return [
        {
          target: '[data-tutorial="settings-connections-external"]',
          title: t(`${p}.s1Title`),
          content: t(`${p}.s1Content`),
          placement: "bottom",
        },
        {
          target: '[data-tutorial="settings-connections-social"]',
          title: t(`${p}.s2Title`),
          content: t(`${p}.s2Content`),
          placement: "top",
        },
      ];
    case "privacy":
      return [
        {
          target: '[data-tutorial="settings-privacy-consents"]',
          title: t(`${p}.s1Title`),
          content: t(`${p}.s1Content`),
          placement: "bottom",
        },
        {
          target: '[data-tutorial="settings-privacy-analytics"]',
          title: t(`${p}.s2Title`),
          content: t(`${p}.s2Content`),
          placement: "top",
        },
      ];
    case "support":
      return [
        {
          target: '[data-tutorial="settings-support-help"]',
          title: t(`${p}.s1Title`),
          content: t(`${p}.s1Content`),
          placement: "bottom",
        },
        {
          target: '[data-tutorial="settings-support-account"]',
          title: t(`${p}.s2Title`),
          content: t(`${p}.s2Content`),
          placement: "top",
        },
      ];
    default:
      return [];
  }
}

/** Tutoriel contextuel à l’ouverture d’une sous-page Paramètres (depuis le hub). */
export function SettingsSubpageTutorial({ page, active, onDismiss }: Props) {
  const { t } = useLanguage();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!active) {
      setRun(false);
      return;
    }
    const id = window.setTimeout(() => setRun(true), 480);
    return () => window.clearTimeout(id);
  }, [active, page]);

  const steps = stepsForPage(page, t);

  if (!active || !run || steps.length === 0) return null;

  return (
    <InteractiveTutorial
      steps={steps}
      onComplete={() => {
        setRun(false);
        onDismiss();
      }}
      onSkip={() => {
        setRun(false);
        onDismiss();
      }}
    />
  );
}
