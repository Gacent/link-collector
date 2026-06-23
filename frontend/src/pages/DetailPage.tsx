import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { Bookmark } from "../types";
import TagBadge from "../components/TagBadge";
import { cleanText } from "../clean";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookmark = (location.state as { bookmark?: Bookmark } | null)?.bookmark ?? null;

  if (!bookmark) {
    return (
      <div className="py-4">
      <button onClick={() => navigate(-1)} className="text-[var(--color-primary)] font-medium text-sm hover:text-[var(--color-primary-active)] transition-colors">← 返回</button>
      <div className="text-center text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] py-8">未找到</div>
      </div>
    );
  }

  async function handleDelete() {
    if (!confirm("确定删除？")) return;
    await api.deleteBookmark(bookmark!.id);
    navigate("/");
  }

  return (
    <div className="py-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-[var(--color-primary)] font-medium text-sm hover:text-[var(--color-primary-active)] transition-colors">← 返回</button>

      <h1 className="font-[var(--font-display)] text-xl leading-snug text-[var(--color-ink)] dark:text-[var(--color-on-dark)] mt-2">
  {cleanText(bookmark.title)}
</h1>

      {bookmark.original_title && bookmark.original_title !== bookmark.title && (
        <p className="text-sm text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] mt-1 italic">
          {cleanText(bookmark.original_title)}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-soft)] dark:text-[var(--color-on-dark-soft)] mt-3">
        {bookmark.source && <span>{bookmark.source}</span>}
        {bookmark.created_at && <span>{new Date(bookmark.created_at).toLocaleString("zh-CN")}</span>}
      </div>

      {bookmark.summary && (
        <div className="bg-[var(--color-surface-soft)] dark:bg-[var(--color-surface-dark-soft)] p-4 rounded-[var(--radius-lg)] mt-4">
          <p className="text-sm text-[var(--color-body)] dark:text-[var(--color-on-dark)] leading-relaxed">
            {cleanText(bookmark.summary)}
          </p>
        </div>
      )}

      {bookmark.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {bookmark.tags.map((tag) => (
            <TagBadge key={tag} name={tag} />
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-elevated)]">
        {bookmark.url && (
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] text-sm text-center font-medium btn-press transition-colors">
            阅读原文
          </a>
        )}
        <button onClick={handleDelete} className="py-2.5 px-5 text-sm text-[var(--color-error)] hover:opacity-80 transition-opacity">
          删除
        </button>
      </div>
    </div>
  );
}