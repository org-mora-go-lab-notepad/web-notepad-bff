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
    selectedLines?: number[];
    updatedAt: number;
  }[];
  memberCount: number;
  updatedAt: number;
  inviteUrl: string;
};
