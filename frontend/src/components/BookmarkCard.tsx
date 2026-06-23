import { Link } from "react-router-dom";
import { Bookmark } from "../types";
import TagBadge from "./TagBadge";
import { cleanText } from "../clean";

interface BookmarkCardProps {
  bookmark: Bookmark;
  index?: number;
}

export default function BookmarkCard({ bookmark, index = 0 }: BookmarkCardProps) {
  const staggerClass = index > 0 ? `stagger-${Math.min(index, 5)}` : 'fade-in-up';

  return (
    <Link
      to={`/bookmark/${bookmark.id}`}
      state={{ bookmark }}
      className={`block bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] 
        rounded-[var(--radius-lg)] overflow-hidden card-hover border border-[var(--color-hairline)] 
        dark:border-[var(--color-surface-dark-elevated)] fade-in-up ${staggerClass}`}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.25)}s` }}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 
            dark:bg-[var(--color-primary)]/20
            flex items-center justify-center text-[var(--color-primary)] 
            dark:text-[var(--color-on-dark)] text-xs flex-shrink-0">
            🔗
          </div>
          <h3 className="font-sans font-medium text-[var(--color-ink)] 
            dark:text-[var(--color-on-dark)] text-[15px] 
            line-clamp-2 flex-1 leading-tight">{cleanText(bookmark.title)}</h3>
        </div>

        {bookmark.summary && (
          <p className="text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] 
            text-[13px] line-clamp-2 leading-relaxed">
            {cleanText(bookmark.summary)}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] 
          text-[var(--color-muted-soft)] dark:text-[var(--color-on-dark-soft)]">
          {bookmark.source && <span>{bookmark.source}</span>}
          <span>•</span>
          <span>{new Date(bookmark.created_at).toLocaleDateString("zh-CN")}</span>
        </div>

        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {bookmark.tags.map((tag) => (
              <TagBadge key={tag} name={tag} />
            ))}
          </div>
        )}

        <div className="pt-1">
          <Link 
            to={`/bookmark/${bookmark.id}`}
            className="text-[var(--color-primary)] dark:text-[var(--color-on-dark)] 
              text-[12px] font-sans hover:underline transition-colors">
            阅读原文
          </Link>
        </div>
      </div>
    </Link>
  );
}