import { Link } from "react-router-dom";
import { Bookmark } from "../types";
import TagBadge from "./TagBadge";
import { cleanText } from "../clean";

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  return (
    <Link
      to={`/bookmark/${bookmark.id}`}
      state={{ bookmark }}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-xs mt-0.5">🔗</span>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">{cleanText(bookmark.title)}</h3>
        </div>

        {bookmark.summary && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{cleanText(bookmark.summary)}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {bookmark.source && <span>{bookmark.source}</span>}
          <span>{new Date(bookmark.created_at).toLocaleDateString("zh-CN")}</span>
        </div>

        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bookmark.tags.map((tag) => (<TagBadge key={tag} name={tag} />))}
          </div>
        )}
      </div>
    </Link>
  );
}
