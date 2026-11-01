type SnapshotTab = {
  id: string;
  content: string;
  open?: boolean;
};

type SnapshotGroup = {
  tabs: SnapshotTab[];
  bookmarks?: { sourceTabId: string }[];
};

type SnapshotState = {
  groups: SnapshotGroup[];
  closedTabs: { tab: SnapshotTab }[];
  [key: string]: unknown;
};

/** Validate tab records without treating editor visibility as deletion intent. */
export function sanitizeCloudSnapshot(snapshot: string) {
  const state = JSON.parse(snapshot) as SnapshotState;
  for (const group of state.groups) {
    if (
      !Array.isArray(group.tabs) ||
      group.tabs.some(
        (tab) =>
          !tab || typeof tab.id !== "string" || typeof tab.content !== "string",
      )
    )
      throw new Error("Invalid snapshot tabs");
  }
  if (
    state.closedTabs.some(
      (entry) =>
        !entry?.tab ||
        typeof entry.tab.id !== "string" ||
        typeof entry.tab.content !== "string",
    )
  )
    throw new Error("Invalid archived tabs");
  return JSON.stringify(state);
}
