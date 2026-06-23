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
        <button onClick={() => navigate(-1)} className="text-sm text-blue-500 hover:text-blue-600">← 返回</button>
        <div className="text-center text-gray-400 py-8">未找到</div>
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
      <button onClick={() => navigate(-1)} className="text-sm text-blue-500 hover:text-blue-600">← 返回</button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{cleanText(bookmark.title)}</h1>

      {bookmark.original_title && bookmark.original_title !== bookmark.title && (
        <p className="text-sm text-gray-400">原文标题：{bookmark.original_title}</p>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        {bookmark.source && <span>{bookmark.source}</span>}
        <span>{new Date(bookmark.created_at).toLocaleString("zh-CN")}</span>
      </div>

      {bookmark.summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300">
          <strong>AI 摘要：</strong>{cleanText(bookmark.summary)}
        </div>
      )}

      {bookmark.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">{bookmark.tags.map((tag) => (<TagBadge key={tag} name={tag} />))}</div>
      )}

      <div className="flex gap-2 pt-2">
        {bookmark.url && (
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm text-center font-medium">阅读原文</a>
        )}
        <button onClick={handleDelete} className="py-2 px-4 text-red-500 text-sm">删除</button>
      </div>
    </div>
  );
}