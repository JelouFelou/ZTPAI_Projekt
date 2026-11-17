import type { GameCopy } from "./api";

export function gameCopyStatus(
  copy: Pick<GameCopy, "status" | "isBorrowed">,
): string {
  if (copy.isBorrowed) {
    if (copy.status === "MAINTENANCE") return "Wypożyczony — wymaga naprawy";
    if (copy.status === "RETIRED") return "Wypożyczony — wycofany";
    return "Wypożyczony";
  }
  if (copy.status === "MAINTENANCE") return "W naprawie";
  if (copy.status === "RETIRED") return "Wycofany";
  return "Dostępny";
}
