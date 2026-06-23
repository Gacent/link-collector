import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Bookmark } from "../types";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Bookmark[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { 
      setResults([]); 
      setShowResults(false);
      return; 
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.listBookmarks({ q: query });
        setResults(res.bookmarks.slice(0, 10));
        setShowResults(true);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function goToBookmark(id: string) {
    setShowResults(false);
    setQuery("");
    const b = results.find((r) => r.id === id);
    navigate(`/bookmark/${id}`, { state: { bookmark: b } });
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 
          text-[var(--color-muted-soft)] dark:text-[var(--color-on-dark-soft)] 
          pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setShowResults(true)}
          placeholder="搜索收藏..."
          className="w-full py-2.5 px-4 pl-10 pr-10 
            bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] 
            rounded-[var(--radius-lg)] text-[var(--color-ink)] dark:text-[var(--color-on-dark)]
            text-[14px] font-sans placeholder:text-[var(--color-muted-soft)]
            focus-ring transition-all duration-200"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[var(--color-muted-soft)]/30 
              dark:border-[var(--color-on-dark-soft)]/30
              border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1.5 
          bg-[var(--color-canvas)] dark:bg-[var(--color-surface-dark-elevated)] 
          border border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-soft)] 
          rounded-[var(--radius-lg)] shadow-lg z-20 max-h-[320px] overflow-y-auto 
          fade-in-up">
          {searching ? (
            <div className="p-3 text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] 
              text-[13px] text-center">
              搜索中...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] 
              text-[13px] text-center">
              无结果
            </div>
          ) : (
            results.map((b, i) => (
              <button
                key={b.id}
                onClick={() => goToBookmark(b.id)}
                className={`w-full text-left p-3 
                  hover:bg-[var(--color-surface-soft)] dark:hover:bg-[var(--color-surface-dark-soft)] 
                  border-b border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-soft)] 
                  last:border-0 fade-in-up`}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className="text-[14px] font-sans font-semibold 
                  text-[var(--color-ink)] dark:text-[var(--color-on-dark)] line-clamp-1">
                  {b.title}
                </div>
                {b.summary && (
                  <div className="text-[12px] text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] 
                    line-clamp-1 mt-0.5">
                    {b.summary}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}