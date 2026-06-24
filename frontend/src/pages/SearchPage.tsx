import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Bookmark } from "../types";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Bookmark[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.listBookmarks({ q: query });
        setResults(res.bookmarks);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function goToBookmark(b: Bookmark) {
    navigate(`/bookmark/${b.id}`, { state: { bookmark: b } });
  }

  return (
    <div className="py-4 space-y-4">
      {/* Search input row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-soft)] pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索拾签..."
            className="w-full py-3 px-4 pl-10 bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] rounded-[var(--radius-lg)] text-[var(--color-ink)] dark:text-[var(--color-on-dark)] placeholder:text-[var(--color-muted-soft)] focus:outline-none" />
        </div>
        <button onClick={() => navigate(-1)}
          className="flex-shrink-0 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors font-medium">
          取消
        </button>
      </div>

      {/* Results */}
      <div className="space-y-1">
        {searching && (
          <div className="text-center text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] py-8 loading-pulse">搜索中...</div>
        )}
        {!searching && query && results.length === 0 && (
          <div className="text-center text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] py-8">无结果</div>
        )}
        {results.map((b) => (
          <button key={b.id} onClick={() => goToBookmark(b)}
            className="w-full text-left p-3 hover:bg-[var(--color-surface-soft)] dark:hover:bg-[var(--color-surface-dark-soft)] rounded-[var(--radius-lg)] transition-colors">
            <div className="text-[14px] font-semibold text-[var(--color-ink)] dark:text-[var(--color-on-dark)] line-clamp-1">{b.title}</div>
            {b.summary && <div className="text-[12px] text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] line-clamp-1 mt-0.5">{b.summary}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}