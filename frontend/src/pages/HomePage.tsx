import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "../api";
import { Bookmark } from "../types";
import BookmarkCard from "../components/BookmarkCard";
import BookmarkForm from "../components/BookmarkForm";
import SearchBar from "../components/SearchBar";
import { cleanText } from "../clean";
import { getPageCache, setPageCache, clearPageCache, getScrollPosition, saveScrollPosition } from "../pageCache";
import PullToRefresh from "../components/PullToRefresh";

const CACHE_KEY = "home";

const today = new Date();
today.setHours(0, 0, 0, 0);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

function getDateLabel(dateStr: string): string {
  if (!dateStr) return "未知";
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const time = d.getTime();
  if (time === today.getTime()) return "今天";
  if (time === yesterday.getTime()) return "昨天";
  if (time >= threeDaysAgo.getTime()) return "前3天";
  return "更早";
}

export default function HomePage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => getPageCache<Bookmark[]>(CACHE_KEY) || []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(!getPageCache(CACHE_KEY));
  const restored = useRef(false);

  const loadBookmarks = useCallback(async () => {
    const result = await api.listBookmarks({ limit: 20 });
    setBookmarks(result.bookmarks);
    setCursor(result.nextCursor);
    setPageCache(CACHE_KEY, result.bookmarks);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getPageCache(CACHE_KEY)) {
      loadBookmarks();
    } else {
      setLoading(false);
      // Restore scroll position on re-mount (once)
      if (!restored.current) {
        restored.current = true;
        requestAnimationFrame(() => {
          window.scrollTo(0, getScrollPosition(CACHE_KEY));
        });
      }
    }
    // Save scroll position when leaving the page
    return () => saveScrollPosition(CACHE_KEY);
  }, [loadBookmarks]);

  async function loadMore() {
    if (!cursor) return;
    const result = await api.listBookmarks({ cursor, limit: 20 });
    const all = [...bookmarks, ...result.bookmarks];
    setBookmarks(all);
    setPageCache(CACHE_KEY, all);
    setCursor(result.nextCursor);
  }

  function handleSaved() {
    clearPageCache(CACHE_KEY);
    loadBookmarks();
  }

  async function handleRefresh() {
    clearPageCache(CACHE_KEY);
    await loadBookmarks();
  }

  const groups = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const b of bookmarks) {
      const label = getDateLabel(b.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(b);
    }
    const order = ["今天", "昨天", "前3天", "更早"];
    return order.filter((l) => map.has(l)).map((l) => ({ label: l, items: map.get(l)! }));
  }, [bookmarks]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 py-4">
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 
          bg-[var(--color-canvas)] dark:bg-[var(--color-surface-dark)]
          border-b border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-elevated)]
          space-y-3">
          <SearchBar />
          <BookmarkForm onSaved={handleSaved} />
        </div>

        {loading ? (
          <div className="text-center text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] py-8 loading-pulse">加载中...</div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] text-sm">还没有收藏，粘贴一个链接开始吧</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-muted-soft)] dark:text-[var(--color-on-dark-soft)] mb-3 px-1">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.items.map((bookmark, idx) => (
                    <BookmarkCard key={bookmark.id} bookmark={bookmark} index={idx} />
                  ))}
                </div>
              </div>
            ))}
            {cursor && (
              <button onClick={loadMore} className="w-full py-3 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity font-medium">
                加载更多
              </button>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
