/** Clean up text content - remove HTML entities, control chars, and JS escape sequences */
export function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    // HTML entities
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x60;/g, "`")
    .replace(/&nbsp;/g, " ")
    // JS escape sequences
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    // Control characters (keep newlines, tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200F\u2028-\u202E\uFEFF]/g, "")
    .trim();
}