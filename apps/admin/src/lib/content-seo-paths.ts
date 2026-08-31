export function buildContentCanonicalPath(contentType: string, slug: string): string {
  const prefix = contentType === "doc" ? "/docs" : contentType === "page" ? "/pages" : "/blog";
  const clean = slug.trim().replace(/^\/+/, "");
  return clean ? `${prefix}/${clean}` : prefix;
}
