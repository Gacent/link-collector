import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );
  const navigate = useNavigate();

  function toggleDarkMode() {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    navigate("/login");
  }

  async function handleExport() {
    setExporting(true);
    const all: any[] = [];
    let cursor: string | null = null;
    do {
      const res = await api.listBookmarks({
        cursor: cursor || undefined,
        limit: 50,
      });
      all.push(...res.bookmarks);
      cursor = res.nextCursor;
    } while (cursor);

    const blob = new Blob([JSON.stringify(all, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stashtab-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="py-6 space-y-6">
      <h2 className="font-[var(--font-display)] text-xl text-[var(--color-ink)] dark:text-[var(--color-on-dark)] mb-6">
        设置
      </h2>

      {/* Display Settings */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[var(--color-muted-soft)] mb-3 px-1">
          显示
        </h3>
        <div className="bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
                深色模式
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-10 h-5 rounded-full transition-colors ${
                darkMode
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-muted-soft)]"
              }`}
            >
              <div
                className={`w-4 h-4 bg-[var(--color-on-primary)] dark:bg-[var(--color-on-dark)] rounded-full shadow transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[var(--color-muted-soft)] mb-3 px-1">
          数据管理
        </h3>
        <div className="bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
                导出备份
              </p>
              <p className="text-xs text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)] text-right">
                JSON 格式
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium btn-press transition-colors disabled:opacity-50"
            >
              {exporting ? "导出中..." : "导出"}
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[var(--color-muted-soft)] mb-3 px-1">
          账号
        </h3>
        <div className="bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
                退出登录
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--color-error)] text-sm font-medium hover:opacity-80 transition-opacity"
            >
              退出
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="text-center text-xs text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)]">
        <p>拾签 StashTab v1.0</p>
      </section>
    </div>
  );
}