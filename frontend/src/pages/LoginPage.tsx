import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.login(password);
      localStorage.setItem("auth_token", res.token);
      navigate("/");
    } catch {
      setError("密码错误");
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas)] dark:bg-[var(--color-surface-dark)] px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-[420px] bg-[var(--color-surface-card)] dark:bg-[var(--color-surface-dark-elevated)] rounded-[var(--radius-xl)] p-8"
      >
        <div className="text-center space-y-2 mb-6">
          <div className="text-4xl">🔖</div>
          <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
            拾签
          </h1>
          <p className="text-sm text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)]">
            请输入访问密码
          </p>
        </div>

        <div className="space-y-1 mb-5">
          <label className="block text-sm font-medium text-[var(--color-ink)] dark:text-[var(--color-on-dark)]">
            访问密码
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="请输入密码"
            autoFocus
            className="w-full bg-[var(--color-canvas)] dark:bg-[var(--color-surface-dark-soft)] border border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-elevated)] rounded-[var(--radius-md)] px-4 py-3 text-base text-[var(--color-ink)] dark:text-[var(--color-on-dark)] placeholder:text-[var(--color-muted-soft)] focus-ring outline-none"
          />
        </div>

        {error && (
          <p className="text-[var(--color-error)] text-sm text-center mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] py-2.5 text-sm font-medium btn-press transition-colors disabled:opacity-50"
        >
          {loading ? "验证中..." : "进入"}
        </button>
      </form>
    </div>
  );
}