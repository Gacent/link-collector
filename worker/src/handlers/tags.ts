import { Hono } from "hono";
import { Env, Tag } from "../types";

export const tagsRouter = new Hono<{ Bindings: Env }>();

// List all tags with bookmark count
tagsRouter.get("/", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT t.*, COUNT(bt.bookmark_id) as count
     FROM tags t
     LEFT JOIN bookmark_tags bt ON bt.tag_id = t.id
     GROUP BY t.id
     ORDER BY count DESC, t.name ASC`
  ).all();
  return c.json(result.results);
});

// Create a tag
tagsRouter.post("/", async (c) => {
  const body = await c.req.json<{ name: string; color?: string }>();
  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB
    .prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
    .bind(id, body.name.trim(), body.color || "")
    .run();

  const tag = await c.env.DB
    .prepare("SELECT * FROM tags WHERE id = ?")
    .bind(id)
    .first<Tag>();

  return c.json(tag, 201);
});

// Delete tag
tagsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});
