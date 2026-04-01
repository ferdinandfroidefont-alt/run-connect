import type { TutorialStep } from "./types";

/** Étapes du tutoriel principal (carte + navigation) — source unique pour premier lancement et rejouabilité. */
export function getDefaultOnboardingSteps(t: (key: string) => string): TutorialStep[] {
  return [
    {
      target: '[data-tutorial="map-container"]',
      title: t("tutorial.mapTitle"),
      content: t("tutorial.mapContent"),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="create-session"]',
      title: t("tutorial.createTitle"),
      content: t("tutorial.createContent"),
      placement: "top",
    },
    {
      target: '[data-tutorial="nav-sessions"]',
      title: t("tutorial.sessionsTitle"),
      content: t("tutorial.sessionsContent"),
      placement: "top",
    },
    {
      target: '[data-tutorial="nav-messages"]',
      title: t("tutorial.messagesTitle"),
      content: t("tutorial.messagesContent"),
      placement: "top",
    },
    {
      target: '[data-tutorial="nav-feed"]',
      title: t("tutorial.feedTitle"),
      content: t("tutorial.feedContent"),
      placement: "top",
    },
    {
      target: '[data-tutorial="profile-avatar"]',
      title: t("tutorial.profileTitle"),
      content: t("tutorial.profileContent"),
      placement: "bottom",
    },
    {
      target: '[data-tutorial="notifications"]',
      title: t("tutorial.notificationsTitle"),
      content: t("tutorial.notificationsContent"),
      placement: "bottom",
    },
  ];
}

export function pickOnboardingSteps(
  t: (key: string) => string,
  indices: number[]
): TutorialStep[] {
  const all = getDefaultOnboardingSteps(t);
  return indices.map((i) => all[i]).filter(Boolean);
}
