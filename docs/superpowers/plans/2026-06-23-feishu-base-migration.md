# 飞书 Base 存储后端迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 bookmark 聚合器的存储后端从 Cloudflare D1 替换为飞书多维表格 (Base)，D1 相关代码全部移除，Worker 作为代理层

**Architecture:** PWA → Cloudflare Worker (代理层) → 飞书 Base API。Worker 持有飞书凭据，提供统一 REST API 给前端。

**Tech Stack:** Hono (Worker), Feishu Open API (bitable), SenseNova AI

## Global Constraints

- 飞书 app_id / app_secret / app_token / table_id 通过环境变量注入，不硬编码
- tenant_access_token 缓存 2 小时，超时自动刷新
- 前端 Bookmark 接口保持向后兼容，字段名尽量不变
- AI 提取返回增加 title 字段（AI 提炼标题）
- 移除 D1 绑定、db.ts、tags/search 相关 handler

---

### Task 1: 创建 Feishu Base API 客户端

**Files:**
- Create: `worker/src/feishu.ts`

**Interfaces:**
- Consumes: `Env.FEISHU_APP_ID`, `Env.FEISHU_APP_SECRET`, `Env.FEISHU_BASE_APP_TOKEN`, `Env.FEISHU_BASE_TABLE_ID` (from env)
- Produces: `getFeishuToken()`, `createFeishuRecord()`, `listFeishuRecords()`, `deleteFeishuRecord()`, `listFeishuTags()`, `searchFeishuRecords()`

- [ ] **Step 1: Create feishu.ts with token management**

```typescript
// worker/src/feishu.ts
const TOKEN_URL = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
const BASE_URL = "https://open.feishu.cn/open-apis/bitable/v1";

interface TokenCache {
  value: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getFeishuToken(appId: string, appSecret: string): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Feishu token error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { tenant_access_token: string; expire: number };
  tokenCache = { value: data.tenant_access_token, expiresAt: Date.now() + (data.expire - 60) * 1000 };
  return data.tenant_access_token;
}

export interface FeishuRecord {
  record_id: string;
  fields: Record<string, any>;
  created_at?: string;
}

/** Create a record in the Base table */
export async function createFeishuRecord(
  token: string, appToken: string, tableId: string, fields: Record<string, any>
): Promise<FeishuRecord> {
  const res = await fetch(`${BASE_URL}/apps/${appToken}/tables/${tableId}/records`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Feishu create record error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data: { record: FeishuRecord } };
  return data.data.record;
}

/** List records, optionally with page token */
export async function listFeishuRecords(
  token: string, appToken: string, tableId: string, pageSize = 20, pageToken?: string
): Promise<{ items: FeishuRecord[]; page_token: string | null; has_more: boolean }> {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (pageToken) params.set("page_token", pageToken);

  const res = await fetch(`${BASE_URL}/apps/${appToken}/tables/${tableId}/records?${params}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Feishu list error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { items: FeishuRecord[]; page_token: string; has_more: boolean } };
  return data.data;
}

/** Delete a record */
export async function deleteFeishuRecord(
  token: string, appToken: string, tableId: string, recordId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Feishu delete error: ${res.status} ${await res.text()}`);
}

/** List all multi-select options for a field (used for tags) */
export async function listFeishuFieldOptions(
  token: string, appToken: string, tableId: string, fieldName: string
): Promise<{ name: string }[]> {
  const res = await fetch(`${BASE_URL}/apps/${appToken}/tables/${tableId}/fields`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Feishu fields error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { items: Array<{ field_name: string; propertie_options?: Array<{ name: string }> }> } };
  const field = data.data.items.find((f) => f.field_name === fieldName);
  return field?.propertie_options || [];
}

/** Search records with field-level filter */
export async function searchFeishuRecords(
  token: string, appToken: string, tableId: string,
  options: { query?: string; tag?: string; pageSize?: number }
): Promise<{ items: FeishuRecord[] }> {
  const params = new URLSearchParams({ page_size: String(options.pageSize || 50) });
  if (options.query) {
    // Feishu supports field_name contains filter via query params
    // We'll filter in multiple fields using a field_names param
    // For simplicity, use page_size and filter client-side
  }

  const res = await fetch(`${BASE_URL}/apps/${appToken}/tables/${tableId}/records?${params}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Feishu search error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { items: FeishuRecord[] } };
  
  let items = data.data.items;
  // Client-side filter for now (Feishu's API-level filter is complex)
  if (options.query) {
    const q = options.query.toLowerCase();
    items = items.filter((r) => {
      const fields = r.fields;
      return (fields["AI标题"] || "").toLowerCase().includes(q) ||
             (fields["原文标题"] || "").toLowerCase().includes(q) ||
             (fields["AI摘要"] || "").toLowerCase().includes(q);
    });
  }
  if (options.tag) {
    items = items.filter((r) => (r.fields["标签"] || []).includes(options.tag));
  }
  
  return { items };
}
```

- [ ] **Step 2: Verify clean compile**

Run: `npx tsc --noEmit` in `worker/` directory
Expected: No errors

---

### Task 2: 更新 AI Prompt 增加标题提炼

**Files:**
- Modify: `worker/src/sensenova.ts` (link prompt + note prompt update)
- Modify: `worker/src/handlers/ai-extract.ts` (make frontend expect title field)

- [ ] **Step 1: Update LINK_EXTRACT_PROMPT to include title**

Change the link prompt to include title extraction:

```typescript
export const LINK_EXTRACT_PROMPT = `你是一个专业的信息整理助手。根据提供的网页标题和内容，生成以下四部分：

1. 简洁的标题（10字以内）：这个资源真正是什么？去掉营销噱头和震惊体，概括核心内容
   例如："React Server Components 官方文档" 而非 "震惊！React 19 终于发布了"
   例如："TailwindCSS v4 新特性解析" 而非 "前端圈炸了！这个CSS框架彻底颠覆了我们的认知"
   例如："Figma AI 设计工具" 而非 "设计师要失业了？Figma 推出革命性AI功能"
2. 简洁的中文摘要（80-150字）：概括文章的核心观点、主要论据和结论
3. 3-5个中文分类标签（从以下类别中匹配：技术、AI、商业、产品、设计、生活、开源、教程、新闻、观点、工具、资源、阅读、其它）
4. 文章类型（article/video/tool/paper/social）

只返回 JSON 格式，不要包含任何其他内容：
{"title": "...", "summary": "...", "tags": ["..."], "type": "article"}`;
```

Keep NOTE_EXTRACT_PROMPT as-is (it already returns title).

- [ ] **Step 2: Update extract response shape in ai-extract.ts**

当前 ai-extract.ts 的 link branch 返回 `{ summary, tags, type }`，需要加 title。修改：

```typescript
// In the link type handler, after parsing JSON result:
const parsed = JSON.parse(text);
result = {
  title: parsed.title || "",
  summary: parsed.summary || "",
  tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  type: parsed.type || "article",
};
```

And update the type annotation to match:

```typescript
let result: { title?: string; summary?: string; tags: string[]; type?: string };
```

- [ ] **Step 3: Default empty title for note type**

The note type already returns title from AI. Add default fallback for the link type fallback handler:

```typescript
if (body.type === "link") {
  return c.json({ title: "", summary: "", tags: [], _fallback: true });
}
```

---

### Task 3: 重写 Worker 路由，移除 D1

**Files:**
- Modify: `worker/src/types.ts`
- Modify: `worker/src/index.ts` 
- Modify: `worker/wrangler.toml`
- Rewrite: `worker/src/handlers/bookmarks.ts` (use Feishu instead of D1)
- Remove: `worker/src/handlers/tags.ts`
- Remove: `worker/src/handlers/search.ts`
- Remove: `worker/src/db.ts`

- [ ] **Step 1: Update types.ts**

```typescript
export interface FeishuEnv {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  FEISHU_BASE_APP_TOKEN: string;
  FEISHU_BASE_TABLE_ID: string;
}

export interface Env extends FeishuEnv {
  SENSENOVA_API_KEY?: string;
  APP_PASSWORD?: string;
}
```

Remove `DB: D1Database` and all unused types.

- [ ] **Step 2: Update wrangler.toml**

```toml
name = "link-collector-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
APP_PASSWORD = "123456"
SENSENOVA_API_KEY = ""
FEISHU_APP_ID = ""
FEISHU_APP_SECRET = ""
FEISHU_BASE_APP_TOKEN = ""
FEISHU_BASE_TABLE_ID = ""
```

Remove `[[d1_databases]]` section entirely.

- [ ] **Step 3: Rewrite bookmarks handler**

The new handler proxies to Feishu Base API:

```typescript
import { Hono } from "hono";
import { Env } from "../types";
import { getFeishuToken, createFeishuRecord, listFeishuRecords, deleteFeishuRecord, listFeishuFieldOptions, searchFeishuRecords } from "../feishu";

export const bookmarksRouter = new Hono<{ Bindings: Env }>();

// Helper to get authed Feishu token
async function withFeishu(c: any, fn: (token: string) => Promise<Response>): Promise<Response> {
  try {
    const token = await getFeishuToken(c.env.FEISHU_APP_ID, c.env.FEISHU_APP_SECRET);
    return await fn(token);
  } catch (e: any) {
    return c.json({ error: e.message || "Feishu API error" }, 500);
  }
}

// List bookmarks (with optional tag filter, search)
bookmarksRouter.get("/", async (c) => {
  const tag = c.req.query("tag");
  const q = c.req.query("q");
  const pageSize = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const pageToken = c.req.query("cursor");

  return withFeishu(c, async (token) => {
    if (q || tag) {
      const result = await searchFeishuRecords(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, { query: q, tag, pageSize });
      return c.json({ bookmarks: result.items.map(toBookmark), nextCursor: null });
    }
    const result = await listFeishuRecords(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, pageSize, pageToken || undefined);
    return c.json({
      bookmarks: result.items.map(toBookmark),
      nextCursor: result.has_more ? result.page_token : null,
    });
  });
});

// Create bookmark
bookmarksRouter.post("/", async (c) => {
  const body = await c.req.json<{
    url?: string;
    title: string;
    original_title?: string;
    summary?: string;
    tags?: string[];
    source?: string;
  }>();

  if (!body.title) return c.json({ error: "title is required" }, 400);

  return withFeishu(c, async (token) => {
    const fields: Record<string, any> = {
      "AI标题": body.title,
      "原文标题": body.original_title || "",
      "URL": body.url || "",
      "标签": body.tags || [],
      "AI摘要": body.summary || "",
      "保存时间": new Date().toISOString().split("T")[0],
      "来源": body.source || "",
    };
    const record = await createFeishuRecord(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, fields);
    return c.json(toBookmark(record), 201);
  });
});

// Delete bookmark
bookmarksRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  return withFeishu(c, async (token) => {
    await deleteFeishuRecord(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, id);
    return c.json({ success: true });
  });
});

// List all tags (multi-select options)
bookmarksRouter.get("/tags", async (c) => {
  return withFeishu(c, async (token) => {
    const options = await listFeishuFieldOptions(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, "标签");
    return c.json(options.map((o) => ({ name: o.name })));
  });
});

// Convert Feishu record to frontend-friendly format
function toBookmark(record: { record_id: string; fields: Record<string, any> }) {
  const f = record.fields;
  return {
    id: record.record_id,
    title: f["AI标题"] || "",
    original_title: f["原文标题"] || "",
    url: typeof f["URL"] === "object" ? f["URL"]?.link || f["URL"]?.url || "" : f["URL"] || "",
    tags: Array.isArray(f["标签"]) ? f["标签"] : [],
    summary: f["AI摘要"] || "",
    created_at: f["保存时间"] || "",
    source: f["来源"] || "",
  };
}
```

- [ ] **Step 4: Update index.ts**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { Env } from "./types";
import { bookmarksRouter } from "./handlers/bookmarks";
import { fetchMetaRouter } from "./handlers/fetch-meta";
import { aiExtractRouter } from "./handlers/ai-extract";

const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors());

// Auth middleware
const auth = createMiddleware(async (c, next) => {
  if (c.req.path === "/api/health" || c.req.path === "/api/login") {
    return await next();
  }
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== c.env.APP_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

app.use("/api/*", auth);

app.post("/api/login", async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (!password || password !== c.env.APP_PASSWORD) {
    return c.json({ error: "密码错误" }, 401);
  }
  return c.json({ token: password });
});

app.route("/api/bookmarks", bookmarksRouter);
app.route("/api/fetch-meta", fetchMetaRouter);
app.route("/api/ai-extract", aiExtractRouter);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
```

Note: No more `/api/tags`, `/api/search` routes. Tags are under `/api/bookmarks/tags`.

- [ ] **Step 5: Remove old files**

```bash
# Remove D1-related files
Remove-Item -Path "worker/src/db.ts" -Force
Remove-Item -Path "worker/src/handlers/tags.ts" -Force
Remove-Item -Path "worker/src/handlers/search.ts" -Force
```

- [ ] **Step 6: Verify Worker compiles**

Run: `npx tsc --noEmit` in `worker/` directory
Expected: No errors

---

### Task 4: 更新前端类型和 API 层

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Update types.ts**

```typescript
export interface Bookmark {
  id: string;
  title: string;       // AI标题
  original_title?: string;  // 原文标题
  url?: string;
  tags: string[];      // 标签名列表
  summary?: string;    // AI摘要
  created_at: string;  // 保存时间
  source?: string;     // 来源
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
  nextCursor: string | null;
}
```

Remove `Tag` interface (no longer needed as separate entity).

- [ ] **Step 2: Update api.ts**

```typescript
import { Bookmark, BookmarkListResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
    throw new Error("未登录");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  login(password: string) {
    return request<{ token: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  // Bookmarks
  listBookmarks(params?: { cursor?: string; limit?: number; tag?: string; q?: string }) {
    const sp = new URLSearchParams();
    if (params?.cursor) sp.set("cursor", params.cursor);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.tag) sp.set("tag", params.tag);
    if (params?.q) sp.set("q", params.q);
    return request<BookmarkListResponse>(`/bookmarks${sp.toString() ? `?${sp}` : ""}`);
  },

  createBookmark(data: {
    url?: string;
    title: string;
    original_title?: string;
    summary?: string;
    tags?: string[];
    source?: string;
  }) {
    return request<Bookmark>("/bookmarks", { method: "POST", body: JSON.stringify(data) });
  },

  deleteBookmark(id: string) {
    return request<{ success: boolean }>(`/bookmarks/${id}`, { method: "DELETE" });
  },

  // Tags
  listTags() {
    return request<{ name: string }[]>("/bookmarks/tags");
  },

  // Meta fetch
  fetchMeta(url: string) {
    return request<{ title: string; description: string; cover_image: string; source: string; content: string }>(
      "/fetch-meta", { method: "POST", body: JSON.stringify({ url }) }
    );
  },

  // AI extract
  aiExtract(data: { type: "link" | "note"; content: string; title?: string }) {
    return request<{ title?: string; summary?: string; tags: string[]; type?: string; _fallback?: boolean }>(
      "/ai-extract", { method: "POST", body: JSON.stringify(data) }
    );
  },
};
```

---

### Task 5: 更新前端组件

**Files:**
- Modify: `frontend/src/components/BookmarkForm.tsx`
- Modify: `frontend/src/components/SearchBar.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/pages/DetailPage.tsx`
- Modify: `frontend/src/pages/TagFilterPage.tsx`
- Modify: `frontend/src/pages/TagsPage.tsx`

- [ ] **Step 1: Update BookmarkForm.tsx**

Key changes:
- Use AI title from `aiExtract` response as the main preview title
- Remove tag CRUD (createTag/listTags) — tags are now plain strings sent directly
- Save payload uses new `{ title, original_title, summary, tags, url, source }` shape

```typescript
// In handlePaste, change to use AI title:
const meta = await api.fetchMeta(text);
let tags: string[] = [];
let summary = "";
let aiTitle = "";

if (meta.content) {
  try {
    const ai = await api.aiExtract({ type: "link", content: meta.content, title: meta.title });
    aiTitle = ai.title || "";
    tags = ai.tags || [];
    summary = ai.summary || "";
  } catch {}
}

setPreview({
  type: "link",
  url: text,
  title: aiTitle || meta.title || text,  // AI title preferred
  description: meta.description,
  cover_image: meta.cover_image,
  source: meta.source,
  content: meta.content,
  tags,
  ai_summary: summary,
});

// In handleSave, change to:
await api.createBookmark({
  url: preview.url,
  title: preview.title,       // This is now the AI title
  original_title: meta?.title || "",
  summary: preview.ai_summary,
  tags: selectedTags,
  source: preview.source,
});
```

- [ ] **Step 2: Update DetailPage.tsx**

Key changes:
- Remove `is_read` toggle (not in Feishu Base)
- Remove `cover_image` display (not in Feishu Base)
- Remove `notes` editing (not in Feishu Base)
- Remove `content` display for notes (not in Feishu Base)
- Show AI title, original title, URL, tags, summary, source, date
- Tags are now strings, not `Tag` objects — use tag name strings directly

```typescript
// Tags display changes from:
bookmark.tags.map((tag) => (<TagBadge key={tag.id} name={tag.name} />))
// to:
bookmark.tags.map((tag) => (<TagBadge key={tag} name={tag} />))
```

- [ ] **Step 3: Update TagFilterPage.tsx**

```typescript
// Tags are now strings, filter by tag name directly
useEffect(() => {
  if (!tagName) return;
  api.listBookmarks({ tag: tagName, limit: 50 }).then((res) => {
    setBookmarks(res.bookmarks);
    setLoading(false);
  });
}, [tagName]);
```

- [ ] **Step 4: Update TagsPage.tsx**

```typescript
// Tags come from /bookmarks/tags as { name: string }[]
// Remove Tag interface, use simple string
```