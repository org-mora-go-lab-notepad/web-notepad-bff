import type { SharedGroupData } from "@/src/4-entity/notepad";

export function describeGroupUpdate(
  before: SharedGroupData,
  after: SharedGroupData,
) {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`그룹 이름: ${after.name}`);
  const previousTabs = new Map(before.tabs.map((tab) => [tab.id, tab]));
  const nextTabs = new Map(after.tabs.map((tab) => [tab.id, tab]));
  for (const tab of after.tabs) {
    const previous = previousTabs.get(tab.id);
    const title = tab.title || "제목 없는 글";
    if (!previous) changes.push(`글 추가: ${title}`);
    else {
      if (previous.content !== tab.content) changes.push(`글 수정: ${title}`);
      if (
        previous.tabColor !== tab.tabColor ||
        previous.dashboardStatus !== tab.dashboardStatus
      ) {
        changes.push(`상태 변경: ${title}`);
      }
    }
  }
  for (const tab of before.tabs) {
    if (!nextTabs.has(tab.id))
      changes.push(`글 삭제: ${tab.title || "제목 없는 글"}`);
  }
  if (JSON.stringify(before.bookmarks) !== JSON.stringify(after.bookmarks))
    changes.push("북마크 변경");
  if (
    JSON.stringify(before.dashboardStatusNames) !==
    JSON.stringify(after.dashboardStatusNames)
  )
    changes.push("상태 이름 변경");
  if (changes.length === 0) changes.push("그룹 변경");
  return changes.slice(0, 4).join(" · ");
}
