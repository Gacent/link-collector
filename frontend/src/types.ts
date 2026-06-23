export interface Bookmark {
  id: string;
  title: string;           // AI标题 - from Feishu
  original_title?: string;  // 原文标题 - from Feishu
  url?: string;
  tags: string[];          // tag names as strings (no longer Tag objects)
  summary?: string;        // AI摘要
  created_at: string;      // 保存时间
  source?: string;         // 来源
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
  nextCursor: string | null;
}