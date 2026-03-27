export interface TutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  disableBeacon?: boolean;
}
