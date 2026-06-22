import { Hono } from "hono";
import { Env, Bookmark, Tag } from "../types";

export const searchRouter = new Hono<{ Bindings: Env }>();

// GET /api/search?q=keyword&tag=tagId&source=domain
searchRouter.get("/", async (c) => {
  const q = c.req.query("q")?.trim();
  const tag = c.req.query("tag");
  const source = c.req.query("source");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);

  if (!q && !tag && !source) {
    return c.json({ bookmarks: [] });
  }

  let query = `SELECT DISTINCT b.* FROM bookmarks b`;
  const params: any[] = [];
  const conditions: string[] = [];

  // Join with bookmark_tags if filtering by tag
  if (tag) {
    query += ` JOIN bookmark_tags bt ON bt.bookmark_id = b.id`;
    conditions.push(`bt.tag_id = ?`);
    params.push(tag);
  }

  if (q) {
    conditions.push(`(b.title LIKE ? OR b.description LIKE ? OR b.notes LIKE ? OR b.ai_summary LIKE ?)`);
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  if (source) {
    conditions.push(`b.source = ?`);
    params.push(source);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY b.created_at DESC LIMIT ?`;
  params.push(limit);

  const result = await c.env.DB.prepare(query).bind(...params).all<Bookmark>();

  // Attach tags to each result
  const bookmarks = [];
  for (const row of result.results) {
    const tags = await c.env.DB
      .prepare(`SELECT t.* FROM tags t JOIN bookmark_tags bt ON bt.tag_id = t.id WHERE bt.bookmark_id = ?`)
      .bind(row.id)
      .all<Tag>();
    bookmarks.push({ ...row, tags: tags.results });
  }

  return c.json({ bookmarks });
});
