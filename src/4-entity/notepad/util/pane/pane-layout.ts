import type {
  GroupEntry,
  NoteTab,
  PaneColumn,
  PaneId,
  PaneLayout,
} from "../../type";

export const getPaneLayout = (group: GroupEntry): PaneLayout => ({
  activeTabId: group.activeTabId,
  rightTabIds: group.rightTabIds,
  activeRightTabId: group.activeRightTabId,
  leftBottomTabIds: group.leftBottomTabIds,
  activeLeftBottomTabId: group.activeLeftBottomTabId,
  rightBottomTabIds: group.rightBottomTabIds,
  activeRightBottomTabId: group.activeRightBottomTabId,
  activePane: group.activePane,
  splitRatio: group.splitRatio,
  leftRowRatio: group.leftRowRatio,
  rightRowRatio: group.rightRowRatio,
});

// Reading order: down the left column, then down the right column.
export const PANE_IDS: PaneId[] = [
  "left",
  "left-bottom",
  "right",
  "right-bottom",
];

type PaneLists = Record<PaneId, string[]>;
type PaneActives = Record<PaneId, string | null>;

const LIST_KEYS = {
  right: "rightTabIds",
  "left-bottom": "leftBottomTabIds",
  "right-bottom": "rightBottomTabIds",
} as const;

const ACTIVE_KEYS = {
  left: "activeTabId",
  right: "activeRightTabId",
  "left-bottom": "activeLeftBottomTabId",
  "right-bottom": "activeRightBottomTabId",
} as const;

export const getPaneColumn = (pane: PaneId): PaneColumn =>
  pane === "right" || pane === "right-bottom" ? "right" : "left";

export const getBottomPane = (column: PaneColumn): PaneId =>
  column === "right" ? "right-bottom" : "left-bottom";

export const getPaneOfTab = (group: GroupEntry, tabId: string): PaneId => {
  if (group.rightTabIds.includes(tabId)) return "right";
  if (group.leftBottomTabIds.includes(tabId)) return "left-bottom";
  if (group.rightBottomTabIds.includes(tabId)) return "right-bottom";
  return "left";
};

export const getPaneTabs = (group: GroupEntry, pane: PaneId): NoteTab[] =>
  group.tabs.filter((tab) => tab.open && getPaneOfTab(group, tab.id) === pane);

export const getPaneActiveTabId = (
  group: GroupEntry,
  pane: PaneId,
): string | null => group[ACTIVE_KEYS[pane]] || null;

const readLists = (group: GroupEntry): PaneLists => {
  const tabIds = new Set(
    group.tabs.filter((tab) => tab.open).map((tab) => tab.id),
  );
  const seen = new Set<string>();
  const take = (ids: string[]) =>
    ids.filter((id) => {
      if (!tabIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const right = take(group.rightTabIds);
  const leftBottom = take(group.leftBottomTabIds);
  const rightBottom = take(group.rightBottomTabIds);
  return {
    left: group.tabs
      .filter((tab) => tab.open)
      .map((tab) => tab.id)
      .filter((id) => !seen.has(id)),
    right,
    "left-bottom": leftBottom,
    "right-bottom": rightBottom,
  };
};

const readActives = (group: GroupEntry): PaneActives => ({
  left: group.activeTabId || null,
  right: group.activeRightTabId,
  "left-bottom": group.activeLeftBottomTabId,
  "right-bottom": group.activeRightBottomTabId,
});

// Moves the tab into `pane` (or removes it from every pane list when `pane` is null).
export const assignTabToPane = (
  group: GroupEntry,
  tabId: string,
  pane: PaneId | null,
): GroupEntry => {
  const without = (ids: string[]) => ids.filter((id) => id !== tabId);
  const next: GroupEntry = {
    ...group,
    rightTabIds: without(group.rightTabIds),
    leftBottomTabIds: without(group.leftBottomTabIds),
    rightBottomTabIds: without(group.rightBottomTabIds),
  };
  if (pane && pane !== "left") {
    next[LIST_KEYS[pane]] = [...next[LIST_KEYS[pane]], tabId];
  }
  return next;
};

export const setPaneActiveTabId = (
  group: GroupEntry,
  pane: PaneId,
  tabId: string | null,
): GroupEntry => ({
  ...group,
  [ACTIVE_KEYS[pane]]: pane === "left" ? (tabId ?? "") : tabId,
});

// Keeps the layout valid: empty top panes take their bottom pane, an empty left column takes the right column,
// and active tabs and the active pane always point at existing panes.
export const normalizeLayout = (group: GroupEntry): GroupEntry => {
  const lists = readLists(group);
  const actives = readActives(group);
  let activePane = group.activePane;

  const promote = (top: PaneId, bottom: PaneId) => {
    if (lists[top].length > 0 || lists[bottom].length === 0) return;
    lists[top] = lists[bottom];
    lists[bottom] = [];
    actives[top] = actives[bottom];
    if (activePane === bottom) activePane = top;
  };
  promote("left", "left-bottom");
  promote("right", "right-bottom");

  if (lists.left.length === 0 && lists.right.length > 0) {
    lists.left = lists.right;
    lists["left-bottom"] = lists["right-bottom"];
    lists.right = [];
    lists["right-bottom"] = [];
    actives.left = actives.right;
    actives["left-bottom"] = actives["right-bottom"];
    if (activePane === "right") activePane = "left";
    if (activePane === "right-bottom") activePane = "left-bottom";
  }

  for (const pane of PANE_IDS) {
    const ids = lists[pane];
    if (ids.length === 0) actives[pane] = null;
    else if (!actives[pane] || !ids.includes(actives[pane]))
      actives[pane] = ids[0];
  }
  if (lists[activePane].length === 0) {
    const top = getPaneColumn(activePane) === "right" ? "right" : "left";
    activePane = lists[top].length > 0 ? top : "left";
  }

  return {
    ...group,
    rightTabIds: lists.right,
    leftBottomTabIds: lists["left-bottom"],
    rightBottomTabIds: lists["right-bottom"],
    activeTabId: actives.left ?? "",
    activeRightTabId: actives.right,
    activeLeftBottomTabId: actives["left-bottom"],
    activeRightBottomTabId: actives["right-bottom"],
    activePane,
  };
};
