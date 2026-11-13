import Link from "./Link";

const tabs = [
  { id: "games", label: "Gry" },
  { id: "categories", label: "Kategorie" },
  { id: "copies", label: "Egzemplarze" },
  { id: "loans", label: "Wypożyczenia" },
] as const;

export default function AdminTabs({ current }: { current: string }) {
  return (
    <nav className="admin-tabs" aria-label="Sekcje panelu">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/admin?tab=${tab.id}`}
          className={current === tab.id ? "admin-tabs__active" : ""}
          aria-current={current === tab.id ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
