export async function readClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch {
    return "";
  }
}

export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+/.test(text.trim());
}
