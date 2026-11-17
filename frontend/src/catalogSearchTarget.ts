export function catalogSearchTarget(route: string, query: string): string {
  const [path, search = ""] = route.split("?");
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  if (path === "/" || path === "/games") {
    const category = current.get("categoryId");
    const limit = current.get("limit");
    if (category) next.set("categoryId", category);
    if (limit && ["12", "24", "48"].includes(limit)) next.set("limit", limit);
  }
  if (query.trim()) next.set("q", query.trim());
  return `/games${next.size ? `?${next}` : ""}`;
}
