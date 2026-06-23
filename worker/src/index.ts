import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { Env } from "./types";
import { bookmarksRouter } from "./handlers/bookmarks";
import { fetchMetaRouter } from "./handlers/fetch-meta";
import { aiExtractRouter } from "./handlers/ai-extract";

const app = new Hono<{ Bindings: Env }>();
app.use("/*", cors());

const auth = createMiddleware(async (c, next) => {
  if (c.req.path === "/api/health" || c.req.path === "/api/login") return await next();
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== c.env.APP_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

app.use("/api/*", auth);

app.post("/api/login", async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (!password || password !== c.env.APP_PASSWORD) return c.json({ error: "密码错误" }, 401);
  return c.json({ token: password });
});

app.route("/api/bookmarks", bookmarksRouter);
app.route("/api/fetch-meta", fetchMetaRouter);
app.route("/api/ai-extract", aiExtractRouter);

app.get("/api/health", (c) => c.json({ ok: true }));
export default app;
