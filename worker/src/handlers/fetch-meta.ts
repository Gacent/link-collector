import { Hono } from "hono";
import { Env } from "../types";

export const fetchMetaRouter = new Hono<{ Bindings: Env }>();

// Search engine bot UAs that bypass byted_acrawler (Toutiao/ByteDance anti-bot)
const BOT_UAs = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
];

// POST /api/fetch-meta - Fetch link preview info
fetchMetaRouter.post("/", async (c) => {
  const { url: rawUrl } = await c.req.json<{ url: string }>();
  if (!rawUrl) return c.json({ error: "url is required" }, 400);

  try {
    const url = cleanUrl(rawUrl);
    const hostname = new URL(url).hostname;
    const html = await tryFetch(url);

    if (!html) {
      return c.json(fallback(url, hostname));
    }

    const title = decode(decodeURIComponent(extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html) || ""));
    const description = decode(extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractMeta(html, "description") || "");
    const image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || "";

    return c.json({
      title: title || hostname,
      description: description || `来自 ${hostname}`,
      cover_image: image,
      source: hostname,
      content: extractContent(html).slice(0, 2000),
    });
  } catch {
    try {
      return c.json(fallback(rawUrl, new URL(rawUrl).hostname));
    } catch {
      return c.json({ title: rawUrl, description: "", cover_image: "", source: "", content: "" });
    }
  }
});

/** Strip tracking params and keep only meaningful ones */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

/** Try to fetch the page, falling back through multiple UAs */
async function tryFetch(url: string): Promise<string | null> {
  // Try search engine bot UAs first — these bypass byted_acrawler anti-bot on Toutiao
  const allUAs = [
    ...BOT_UAs,
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
  ];

  for (const ua of allUAs) {
    try {
      const html = await fetchWithUA(url, ua);
      if (!html) continue;

      // Must have OG meta or a proper title tag
      if (!html.includes("og:title") && !html.includes("<title")) continue;
      // Must be substantial enough to be a real page
      if (html.length < 2000) continue;

      return html;
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchWithUA(url: string, userAgent: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Reject known anti-bot / challenge pages
  const signals = [
    "安全验证", "captcha", "verification",
    "Checking your browser", "人机验证", "byted_acrawler",
  ];
  if (signals.some((s) => html.toLowerCase().includes(s.toLowerCase()))) return null;
  // Obfuscated JS bundle with empty body = anti-bot challenge
  if (html.includes("<body></body>") || html.includes("<head></head>")) return null;

  return html;
}

function fallback(url: string, hostname: string) {
  return {
    title: makeReadableTitle(url, hostname),
    description: `来自 ${hostname}`,
    cover_image: "",
    source: hostname,
    content: "",
  };
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const p of patterns) { const m = html.match(p); if (m) return m[1]; }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1] : null;
}

function extractContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function makeReadableTitle(url: string, hostname: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);

    if (hostname.includes("toutiao")) {
      const id = parts.find((p) => /^\d+$/.test(p)) || "";
      return `今日头条文章 ${id ? `#${id.slice(0, 8)}` : ""}`.trim();
    }
    if (hostname.includes("mp.weixin") || hostname.includes("weixin.qq")) {
      return "微信公众号文章";
    }
    if (hostname.includes("twitter") || hostname.includes("x.com")) {
      return `Twitter ${parts[0] ? `@${parts[0]}` : ""}`.trim();
    }
    if (hostname.includes("github.com")) {
      if (parts.length >= 2) return `GitHub: ${parts[0]}/${parts[1]}`;
    }
    if (hostname.includes("zhihu")) {
      if (parts[0] === "question") return `知乎问题 #${(parts[1] || "").slice(0, 8)}`;
      if (parts[0] === "answer") return `知乎回答 #${(parts[1] || "").slice(0, 8)}`;
      return "知乎";
    }
    if (hostname.includes("bilibili") || hostname.includes("b23")) {
      return `B站视频 ${u.searchParams.get("bvid") || parts.find((p) => /^BV/i.test(p)) || ""}`.trim();
    }

    const path = parts.slice(0, 2).join(" › ");
    return path ? `${hostname} › ${path}` : hostname;
  } catch {
    return hostname;
  }
}