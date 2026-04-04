import type { TutorialStep } from "./types";
import { getDefaultOnboardingSteps, pickOnboardingSteps } from "./onboardingSteps";

export const TUTORIAL_PENDING_STORAGE_KEY = "runconnect.pendingTutorialReplay";

export type TutorialReplayId =
  | "full"
  | "map"
  | "create"
  | "sessions"
  | "messages"
  | "feed"
  | "profile"
  | "notifications"
  | "leaderboard"
  | "routes"
  | "coaching";

export type TutorialReplayDefinition = {
  id: TutorialReplayId;
  /** Route à ouvrir avant le tutoriel */
  path: string;
  /** Délai après navigation avant affichage (carte, etc.) */
  startDelayMs: number;
  getSteps: (t: (key: string) => string) => TutorialStep[];
  /** Si la cible du premier pas n’est pas dans le DOM au bout du délai, on attend encore (ms). */
  waitForTargetExtraMs?: number;
};

export function pathMatchesTutorial(pathname: string, def: TutorialReplayDefinition): boolean {
  if (pathname === def.path) return true;
  if (def.id === "profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  if (def.id === "routes") {
    return (
      pathname === "/route-create" ||
      pathname === "/route-creation" ||
      pathname === "/itinerary" ||
      pathname.startsWith("/itinerary/")
    );
  }
  return false;
}

function introStep(
  target: string,
  t: (key: string) => string,
  i18nKey: string,
  placement: TutorialStep["placement"] = "bottom"
): TutorialStep {
  return {
    target,
    title: t(`${i18nKey}.title`),
    content: t(`${i18nKey}.content`),
    placement,
    disableBeacon: true,
  };
}

function pageStep(
  t: (key: string) => string,
  i18nKey: string,
  placement: TutorialStep["placement"] = "bottom"
): TutorialStep {
  const targets: Record<string, string> = {
    "tutorial.replayPages.leaderboard": '[data-tutorial="tutorial-leaderboard"]',
    "tutorial.replayPages.routes": '[data-tutorial="tutorial-itinerary-hub"]',
    "tutorial.replayPages.coaching": '[data-tutorial="tutorial-coaching"]',
  };
  const target = targets[i18nKey] ?? "body";
  return introStep(target, t, i18nKey, placement);
}

export const TUTORIAL_REPLAY_DEFINITIONS: Record<TutorialReplayId, TutorialReplayDefinition> = {
  full: {
    id: "full",
    path: "/",
    startDelayMs: 550,
    waitForTargetExtraMs: 2000,
    getSteps: (t) => getDefaultOnboardingSteps(t),
  },
  map: {
    id: "map",
    path: "/",
    startDelayMs: 550,
    waitForTargetExtraMs: 2000,
    getSteps: (t) => pickOnboardingSteps(t, [0]),
  },
  create: {
    id: "create",
    path: "/",
    startDelayMs: 550,
    waitForTargetExtraMs: 2000,
    getSteps: (t) => pickOnboardingSteps(t, [1]),
  },
  sessions: {
    id: "sessions",
    path: "/my-sessions",
    startDelayMs: 380,
    getSteps: (t) => [
      introStep('[data-tutorial="tutorial-my-sessions"]', t, "tutorial.replayPages.sessions", "bottom"),
    ],
  },
  messages: {
    id: "messages",
    path: "/messages",
    startDelayMs: 380,
    getSteps: (t) => [
      introStep('[data-tutorial="tutorial-messages"]', t, "tutorial.replayPages.messages", "bottom"),
    ],
  },
  feed: {
    id: "feed",
    path: "/",
    startDelayMs: 380,
    waitForTargetExtraMs: 900,
    getSteps: (t) => [
      introStep('[data-tutorial="tutorial-feed"]', t, "tutorial.replayPages.feed", "bottom"),
    ],
  },
  profile: {
    id: "profile",
    path: "/profile",
    startDelayMs: 480,
    getSteps: (t) => [
      introStep('[data-tutorial="tutorial-profile-page"]', t, "tutorial.replayPages.profile", "bottom"),
    ],
  },
  notifications: {
    id: "notifications",
    path: "/",
    startDelayMs: 550,
    waitForTargetExtraMs: 2000,
    getSteps: (t) => pickOnboardingSteps(t, [6]),
  },
  leaderboard: {
    id: "leaderboard",
    path: "/leaderboard",
    startDelayMs: 400,
    getSteps: (t) => [
      pageStep(t, "tutorial.replayPages.leaderboard", "bottom"),
    ],
  },
  routes: {
    id: "routes",
    path: "/itinerary",
    startDelayMs: 700,
    getSteps: (t) => [
      pageStep(t, "tutorial.replayPages.routes", "bottom"),
    ],
  },
  coaching: {
    id: "coaching",
    path: "/coaching",
    startDelayMs: 400,
    getSteps: (t) => [
      pageStep(t, "tutorial.replayPages.coaching", "bottom"),
    ],
  },
};

/** Ordre d’affichage dans le catalogue tutoriels (Paramètres → Aide & Support). */
export const TUTORIAL_REPLAY_MENU_ORDER: TutorialReplayId[] = [
  "full",
  "map",
  "create",
  "sessions",
  "messages",
  "feed",
  "profile",
  "notifications",
  "leaderboard",
  "routes",
  "coaching",
];

export function requestTutorialReplay(id: TutorialReplayId): void {
  if (!TUTORIAL_REPLAY_DEFINITIONS[id]) return;
  try {
    sessionStorage.setItem(TUTORIAL_PENDING_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** À appeler après `navigate()` pour relancer le flux même si la route ne change pas. */
export function notifyTutorialReplayQueued(): void {
  try {
    window.dispatchEvent(new CustomEvent("runconnect-tutorial-replay"));
  } catch {
    /* ignore */
  }
}

export function readPendingTutorialReplay(): TutorialReplayId | null {
  try {
    const raw = sessionStorage.getItem(TUTORIAL_PENDING_STORAGE_KEY);
    if (!raw) return null;
    if (raw in TUTORIAL_REPLAY_DEFINITIONS) return raw as TutorialReplayId;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingTutorialReplay(): void {
  try {
    sessionStorage.removeItem(TUTORIAL_PENDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
