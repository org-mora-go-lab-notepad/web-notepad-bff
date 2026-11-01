import type { NotepadSettings, TabColor, TabStatus } from "../type";

export const TAB_COLORS: readonly TabColor[] = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "indigo",
  "purple",
  "pink",
];

export const FONT_SCALES: readonly number[] = [0.8, 0.9, 1, 1.1, 1.2, 1.3];

export const CORE_FOOTER_ITEM_IDS = [
  "core:groups",
  "core:dashboard",
  "core:account",
] as const;

export const DEFAULT_SETTINGS: NotepadSettings = {
  fontScale: 0.9,
  tabColorCycle: ["gray", "orange", "indigo"],
  tabColorCycleVersion: 2,
  dashboardStatusDefaults: {},
  language: "en",
  panelSlide: false,
  panelPosition: "right",
  footerItems: [...CORE_FOOTER_ITEM_IDS],
  footerIconsOnly: false,
};

// Dashboard columns, in display order.
export const TAB_STATUSES: readonly TabStatus[] = [
  "todo",
  "ready",
  "in-progress",
  "done",
];
export const DASHBOARD_STATUSES: readonly TabStatus[] = [
  "icebox",
  ...TAB_STATUSES,
];
