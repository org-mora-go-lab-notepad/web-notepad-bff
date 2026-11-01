import type { TabColor, TabStatus } from "./notepad";

export type BoardPost = {
  id: string;
  local?: boolean;
  system?: boolean;
  viewerRole?: "owner" | "member" | null;
  groupName: string;
  ownerName: string;
  title: string;
  description: string;
  noteCount: number;
  bookmarkCount: number;
  notes: {
    id: string;
    title: string;
    content: string;
    bookmarked: boolean;
    dashboardStatus?: TabStatus;
    tabColor?: TabColor;
    selectedLines?: number[];
    updatedAt: number;
  }[];
  memberCount: number;
  updatedAt: number;
  inviteUrl: string;
};
