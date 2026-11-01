import { DEFAULT_SETTINGS } from "../../constant";
import type { NoteTab, TabColor, TabStatus } from "../../type";

const graphemeSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const truncateGraphemes = (value: string, maximum: number) =>
  graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
        .slice(0, maximum)
        .join("")
    : Array.from(value).slice(0, maximum).join("");

export const createNoteTab = (
  number: number,
  tabColor: TabColor = DEFAULT_SETTINGS.tabColorCycle[0],
): NoteTab => ({
  id: `tab-${number}`,
  open: true,
  title: "-",
  content: "",
  savedContent: "",
  selectedLines: [],
  tabColor,
  pinned: false,
  bookmarked: false,
  updatedAt: 0,
  dashboardStatus: "todo",
});

export const getNextTabNumber = (
  tabs: NoteTab[],
  reservedIds: string[] = [],
  startAt = 2,
) => {
  const usedIds = new Set([...tabs.map((tab) => tab.id), ...reservedIds]);
  let number = startAt;
  while (usedIds.has(`tab-${number}`)) number += 1;
  return number;
};

// Keeps unique, in-range line indexes in ascending order.
export const sanitizeSelectedLines = (
  value: unknown,
  content: string,
): number[] => {
  if (!Array.isArray(value)) return [];
  const lineCount = content.split("\n").length;
  return [
    ...new Set(
      value.filter(
        (line: unknown): line is number =>
          typeof line === "number" &&
          Number.isInteger(line) &&
          line >= 0 &&
          line < lineCount,
      ),
    ),
  ].sort((first, second) => first - second);
};

export const getTitleFromContent = (content: unknown, fallback: string) => {
  const text = typeof content === "string" ? content : "";
  if (!text.trim()) return "-";

  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? truncateGraphemes(firstLine, 28) : fallback;
};

// Explicit status keeps shared cards stable when collaborators use different color settings.
export const getTabStatus = (
  tab: NoteTab,
  tabColorCycle: TabColor[],
): TabStatus => {
  if (tab.dashboardStatus === "closed") return "done";
  if (tab.dashboardStatus) return tab.dashboardStatus;
  const index = tabColorCycle.indexOf(tab.tabColor);
  if (index >= 0)
    return (["todo", "ready", "in-progress"] as const)[index] ?? "todo";
  return tab.tabColor === "teal" ? "done" : "todo";
};

export const getStatusColor = (
  status: TabStatus,
  cycle: TabColor[],
): TabColor => {
  if (status === "icebox") return "yellow";
  if (status === "done" || status === "closed") return "teal";
  return (
    cycle[(["todo", "ready", "in-progress"] as const).indexOf(status)] ??
    cycle[0]
  );
};
