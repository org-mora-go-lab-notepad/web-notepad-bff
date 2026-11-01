import { DASHBOARD_STATUSES, DEFAULT_SETTINGS } from "../constant";
import type { GroupEntry, SharedGroupData } from "../type";
import { getTabStatus } from "./note";
import { normalizeLayout } from "./pane";

export const SHARED_TAB_DELETE_INTENT_EVENT =
  "notepad-shared-tab-delete-intent";
export const PERSONAL_TAB_DELETE_INTENT_EVENT =
  "notepad-personal-tab-delete-intent";
export const PERSONAL_TAB_TRANSFER_INTENT_EVENT =
  "notepad-personal-tab-transfer-intent";

export const sharedGroupId = (shareId: string) => `shared-${shareId}`;
export const isSharedGroupId = (id: string) =>
  /^shared-[0-9a-f-]{36}$/i.test(id);

export const hasBoardVisibleSharedContent = (content: string) =>
  content.trim().length > 2;

// Resolve legacy records against a common palette, never a viewer's preferences.
export function normalizeSharedGroupData(
  data: SharedGroupData,
): SharedGroupData {
  return {
    ...data,
    tabs: data.tabs.map((tab) =>
      tab.dashboardStatus && DASHBOARD_STATUSES.includes(tab.dashboardStatus)
        ? tab
        : {
            ...tab,
            dashboardStatus: getTabStatus(
              {
                ...tab,
                dashboardStatus:
                  tab.dashboardStatus === "closed" ? "done" : undefined,
              },
              DEFAULT_SETTINGS.tabColorCycle,
            ),
          },
    ),
  };
}

export function namespaceGroup(group: GroupEntry, shareId: string): GroupEntry {
  const id = sharedGroupId(shareId);
  const tabId = (value: string) => `${id}-${value}`;
  const bookmarkId = (value: string) => `${id}-${value}`;
  const data = normalizeSharedGroupData(group);
  return {
    ...group,
    id,
    tabs: data.tabs.map((tab) => ({
      ...tab,
      id: tabId(tab.id),
    })),
    bookmarks: data.bookmarks.map((bookmark) => ({
      ...bookmark,
      id: bookmarkId(bookmark.id),
      sourceTabId: tabId(bookmark.sourceTabId),
    })),
    activeTabId: tabId(group.activeTabId),
    rightTabIds: group.rightTabIds.map(tabId),
    activeRightTabId: group.activeRightTabId
      ? tabId(group.activeRightTabId)
      : null,
    leftBottomTabIds: group.leftBottomTabIds.map(tabId),
    activeLeftBottomTabId: group.activeLeftBottomTabId
      ? tabId(group.activeLeftBottomTabId)
      : null,
    rightBottomTabIds: group.rightBottomTabIds.map(tabId),
    activeRightBottomTabId: group.activeRightBottomTabId
      ? tabId(group.activeRightBottomTabId)
      : null,
  };
}

export function toSharedGroupData(group: GroupEntry): SharedGroupData {
  return normalizeSharedGroupData({
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    tabs: group.tabs,
    bookmarks: group.bookmarks,
    dashboardStatusNames: group.dashboardStatusNames,
  });
}

export function applySharedGroupData(
  group: GroupEntry,
  data: SharedGroupData,
): GroupEntry {
  data = normalizeSharedGroupData(data);
  const openIds = new Set(
    data.tabs.filter((tab) => tab.open).map((tab) => tab.id),
  );
  const activeTabId = openIds.has(group.activeTabId)
    ? group.activeTabId
    : (data.tabs.find((tab) => tab.open)?.id ?? "");
  return normalizeLayout({
    ...group,
    ...data,
    pinned: group.pinned,
    sortOrder: group.sortOrder,
    dashboardVisibility: group.dashboardVisibility,
    activeTabId,
    rightTabIds: group.rightTabIds.filter((id) => openIds.has(id)),
    leftBottomTabIds: group.leftBottomTabIds.filter((id) => openIds.has(id)),
    rightBottomTabIds: group.rightBottomTabIds.filter((id) => openIds.has(id)),
  });
}

export function createJoinedGroup(data: SharedGroupData): GroupEntry {
  data = normalizeSharedGroupData(data);
  const firstOpenTab = data.tabs.find((tab) => tab.open);
  return normalizeLayout({
    ...data,
    pinned: false,
    activeTabId: firstOpenTab?.id ?? "",
    rightTabIds: [],
    activeRightTabId: null,
    leftBottomTabIds: [],
    activeLeftBottomTabId: null,
    rightBottomTabIds: [],
    activeRightBottomTabId: null,
    activePane: "left",
    splitRatio: 0.5,
    leftRowRatio: 0.5,
    rightRowRatio: 0.5,
  });
}
