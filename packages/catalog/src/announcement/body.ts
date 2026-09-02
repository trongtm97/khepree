import { renderContentMarkdown } from "../content/markdown";
import { stripUnsafeMarkdownSource } from "../content/sanitize";

/** Strip raw HTML — announcements accept plain text / limited markdown only. */
export function sanitizeAnnouncementBody(body: string | null | undefined): string | null {
  if (!body?.trim()) return null;
  let text = stripUnsafeMarkdownSource(body.trim());
  text = text.replace(/<[^>]+>/g, "");
  return text.trim() || null;
}

export function renderAnnouncementBodyHtml(body: string | null | undefined): string {
  const safe = sanitizeAnnouncementBody(body);
  if (!safe) return "";
  return renderContentMarkdown(safe);
}
