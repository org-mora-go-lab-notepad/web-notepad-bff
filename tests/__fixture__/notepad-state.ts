import type {
  BookmarkEntry,
  ClosedTabEntry,
  GroupEntry,
  NoteTab,
} from "@/src/4-entity/notepad";

// A saved note tab whose title is its first line, as the app stores it.
export const createTabFixture = (
  id: string,
  content: string,
  overrides: Partial<NoteTab> = {},
): NoteTab => ({
  id,
  open: true,
  title: content.split("\n")[0],
  content,
  savedContent: content,
  selectedLines: [],
  tabColor: "green",
  pinned: false,
  bookmarked: false,
  updatedAt: 1,
  ...overrides,
});

// A group workspace with every tab in the left pane and the first one active.
export const createGroupFixture = (
  id: string,
  name: string,
  tabs: NoteTab[],
  overrides: Partial<GroupEntry> = {},
): GroupEntry => ({
  id,
  name,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  tabs,
  bookmarks: [],
  activeTabId: tabs[0].id,
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
  ...overrides,
});

export const createClosedTabFixture = (
  id: string,
  groupId: string,
  tab: NoteTab,
): ClosedTabEntry => ({ id, groupId, tab, closedAt: 1 });

export const createBookmarkFixture = (
  id: string,
  sourceTabId: string,
  content: string,
  overrides: Partial<BookmarkEntry> = {},
): BookmarkEntry => ({
  id,
  sourceTabId,
  content,
  title: content.split("\n")[0],
  tabColor: "gray",
  selectedLines: [],
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});
