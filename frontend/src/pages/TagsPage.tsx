import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function TagsPage() {
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    api.listTags().then((data) => { 
      setTags(data); 
      setLoading(false); 
    }); 
  }, []);

  if (loading) return (
    <div className="text-center text-[var(--color-muted)] py-8">
      <p className="text-4xl mb-2">🏷️</p>
      <p className="text-sm loading-pulse">加载中...</p>
    </div>
  );

  return (
    <div className="py-4 space-y-4">
      <h2 className="font-display text-xl text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
        标签
      </h2>
      {tags.length === 0 ? (
        <div className="text-center text-[var(--color-muted)] py-8">
          <p className="text-4xl mb-2">🏷️</p>
          <p className="text-sm">还没有标签</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tags.map((tag, index) => (
            <Link
              key={tag.name}
              to={`/tags/${encodeURIComponent(tag.name)}`}
              className={`bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] 
                rounded-[var(--radius-lg)] p-4 card-hover border border-[var(--color-hairline)] 
                dark:border-[var(--color-surface-dark-elevated)] fade-in-up`}
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <div className="font-display text-lg font-bold text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
                {tag.name}
              </div>
              <div className="text-sm text-[var(--color-muted-soft)] mt-1">
                {tag.count} 条
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
