import { Hono } from "hono";
import { Env } from "../types";

export const fetchMetaRouter = new Hono<{ Bindings: Env }>();

// POST /api/fetch-meta - Fetch link preview info
fetchMetaRouter.post("/", async (c) => {
  const { url } = await c.req.json<{ url: string }>();

  if (!url) {
    return c.json({ error: "url is required" }, 400);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkCollector/1.0)",
      },
    });

    const html = await response.text();

    // Extract meta tags
    const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html) || url;
    const description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractMeta(html, "description") || "";
    const image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || "";
    const hostname = new URL(url).hostname;

    return c.json({
      title,
      description,
      cover_image: image,
      source: hostname,
      content: extractTextContent(html).slice(0, 2000), // First 2000 chars for AI
    });
  } catch (e) {
    return c.json({
      title: url,
      description: "",
      cover_image: "",
      source: new URL(url).hostname,
      content: "",
    });
  }
});

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

function extractTextContent(html: string): string {
  // Remove scripts, styles, and tags
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}