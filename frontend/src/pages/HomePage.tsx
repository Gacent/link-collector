import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { Bookmark } from "../types";
import BookmarkCard from "../components/BookmarkCard";
import BookmarkForm from "../components/BookmarkForm";
import SearchBar from "../components/SearchBar";

export default function HomePage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    const result = await api.listBookmarks({ limit: 20 });
    setBookmarks(result.bookmarks);
    setCursor(result.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

  async function loadMore() {
    if (!cursor) return;
    const result = await api.listBookmarks({ cursor, limit: 20 });
    setBookmarks((prev) => [...prev, ...result.bookmarks]);
    setCursor(result.nextCursor);
  }

  function handleSaved() { loadBookmarks(); }

  return (
    <div className="space-y-4 py-4">
      <SearchBar />
      <BookmarkForm onSaved={handleSaved} />

      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">还没有收藏，粘贴一个链接开始吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (<BookmarkCard key={bookmark.id} bookmark={bookmark} />))}
          {cursor && (<button onClick={loadMore} className="w-full py-3 text-sm text-blue-500 hover:text-blue-600">加载更多</button>)}
        </div>
      )}
    </div>
  );
}
