import { Hono } from "hono";
import { Env } from "../types";
import {
  getFeishuToken,
  createFeishuRecord,
  listFeishuRecords,
  deleteFeishuRecord,
  listFeishuFieldOptions,
  searchFeishuRecords,
} from "../feishu";

export const bookmarksRouter = new Hono<{ Bindings: Env }>();

async function withFeishu<T>(c: any, fn: (token: string) => Promise<T>): Promise<Response> {
  try {
    const token = await getFeishuToken(c.env.FEISHU_APP_ID, c.env.FEISHU_APP_SECRET);
    const result = await fn(token);
    return c.json(result as any);
  } catch (e: any) {
    console.error("Feishu API error:", e);
    return c.json({ error: e.message || "Feishu API error" }, 500);
  }
}

// List bookmarks
bookmarksRouter.get("/", async (c) => {
  const tag = c.req.query("tag");
  const q = c.req.query("q");
  const pageSize = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const pageToken = c.req.query("cursor");

  return withFeishu(c, async (token) => {
    if (q || tag) {
      const result = await searchFeishuRecords(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, {
        query: q || undefined,
        tag: tag || undefined,
        pageSize,
      });
      return { bookmarks: result.items.map(toBookmark), nextCursor: null };
    }
    const result = await listFeishuRecords(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, pageSize, pageToken || undefined);
    const bookmarks = result.items.map(toBookmark);
    // Sort by date descending (newest first)
    bookmarks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      bookmarks,
      nextCursor: result.has_more ? result.page_token : null,
    };
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
      "URL": body.url ? { text: body.title, link: body.url } : "",
      "标签": body.tags || [],
      "AI摘要": body.summary || "",
      "保存时间": Date.now(),
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
    return { success: true };
  });
});

// List all tags (multi-select options from Feishu)
bookmarksRouter.get("/tags", async (c) => {
  return withFeishu(c, async (token) => {
    // Collect all unique tag names from actual records
    const allTags = new Set<string>();
    let pageToken: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const result = await listFeishuRecords(token, c.env.FEISHU_BASE_APP_TOKEN, c.env.FEISHU_BASE_TABLE_ID, 500, pageToken);
      for (const item of result.items) {
        const tagField = item.fields["标签"];
        if (Array.isArray(tagField)) {
          for (const t of tagField) {
            const name = typeof t === "string" ? t : t.name ?? String(t);
            if (name) allTags.add(name);
          }
        }
      }
      hasMore = result.has_more;
      pageToken = result.page_token ?? undefined;
    }
    return Array.from(allTags).map((name) => ({ name }));
  });
});

function toBookmark(record: { record_id: string; fields: Record<string, any> }) {
  const f = record.fields;
  let url = "";
  if (typeof f["URL"] === "string") url = f["URL"];
  else if (f["URL"] && typeof f["URL"] === "object") url = f["URL"]?.link || f["URL"]?.url || "";

  let tags: string[] = [];
  if (Array.isArray(f["标签"])) {
    tags = f["标签"].map((t: any) => (typeof t === "string" ? t : t.name ?? String(t)));
  }

  // Parse the date: Feishu returns timestamp (ms) or ISO string
  let createdAt = "";
  const rawDate = f["保存时间"];
  if (typeof rawDate === "number") {
    createdAt = new Date(rawDate).toISOString();
  } else if (typeof rawDate === "string") {
    createdAt = rawDate;
  }

  return {
    id: record.record_id,
    title: f["AI标题"] || "",
    original_title: f["原文标题"] || "",
    url,
    tags,
    summary: f["AI摘要"] || "",
    created_at: createdAt,
    source: f["来源"] || "",
  };
}
