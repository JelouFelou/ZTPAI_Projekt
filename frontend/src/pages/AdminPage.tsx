import { useEffect, useState } from "react";
import { getAllGames, getCategories, getGameCopies } from "../api";
import type { Category, Game, GameCopy } from "../api";
import { useAuth } from "../authContext";
import { CategoryForm, CopyForm, GameForm } from "../components/AdminForms";
import AdminTabs from "../components/AdminTabs";
import Link from "../components/Link";
import AdminLoansPage from "./AdminLoansPage";

type Section = "games" | "categories" | "copies";
type Catalog = { games: Game[]; categories: Category[]; copies: GameCopy[] };
const labels: Record<Section, string> = {
  games: "Gry",
  categories: "Kategorie",
  copies: "Egzemplarze",
};
const copyStatus: Record<GameCopy["status"], string> = {
  AVAILABLE: "Dostępny",
  MAINTENANCE: "W naprawie",
  RETIRED: "Wycofany",
};

export default function AdminPage({ route }: { route: string }) {
  const { user, authorized } = useAuth();
  const tab = new URLSearchParams(route.split("?")[1] ?? "").get("tab");
  const isLoansTab = tab === "loans";
  const section: Section =
    tab === "categories" || tab === "copies" ? tab : "games";
  const [revision, setRevision] = useState(0);
  const [request, setRequest] = useState<{
    key: string;
    data: Catalog | null;
    error: string;
  } | null>(null);
  const [editing, setEditing] = useState<{
    section: Section;
    id: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchState, setSearchState] = useState({ section, value: "" });
  const [pagingState, setPagingState] = useState({ section, page: 1 });
  const query = searchState.section === section ? searchState.value : "";
  const page = pagingState.section === section ? pagingState.page : 1;
  const requestKey = `${user?.id ?? ""}:${revision}`;
  const loading = request?.key !== requestKey;
  const data = loading ? null : request.data;
  const error = loading ? "" : request.error;

  useEffect(() => {
    if (user?.role !== "ADMIN" || isLoansTab) return;
    const controller = new AbortController();
    Promise.all([
      getAllGames(controller.signal),
      getCategories(controller.signal),
      getGameCopies(controller.signal),
    ])
      .then(([games, categories, copies]) => {
        if (!controller.signal.aborted)
          setRequest({
            key: requestKey,
            data: { games, categories, copies },
            error: "",
          });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setRequest({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać danych katalogu.",
          });
      });
    return () => controller.abort();
  }, [user?.id, user?.role, requestKey, isLoansTab]);

  async function mutate(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body: unknown,
    success: string,
  ) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await authorized(path, {
        method,
        ...(body === undefined ? {} : { body }),
      });
      setEditing(null);
      setNotice(success);
      setRevision((value) => value + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Nie udało się zapisać zmian.",
      );
    } finally {
      setBusy(false);
    }
  }

  function edit(section: Section, id: string) {
    setEditing({ section, id });
    setActionError("");
    setNotice("");
    document
      .getElementById("admin-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function remove(section: Section, id: string, name: string) {
    if (!window.confirm(`Usunąć ${name}? Tej operacji nie można cofnąć.`))
      return;
    const path = section === "copies" ? "game-copies" : section;
    const success =
      section === "categories"
        ? "Kategoria została usunięta."
        : section === "games"
          ? "Gra została usunięta."
          : "Egzemplarz został usunięty.";
    void mutate(
      `/${path}/${encodeURIComponent(id)}`,
      "DELETE",
      undefined,
      success,
    );
  }

  if (!user)
    return (
      <main className="container admin-page">
        <div className="state-card">
          <h1>Panel administratora</h1>
          <p>Zaloguj się na konto administratora, aby zarządzać katalogiem.</p>
          <Link className="button button-primary" href="/login?next=%2Fadmin">
            Zaloguj się →
          </Link>
        </div>
      </main>
    );
  if (user.role !== "ADMIN")
    return (
      <main className="container admin-page">
        <div className="state-card" role="alert">
          <h1>Brak dostępu</h1>
          <p>Panel jest dostępny tylko dla administratora.</p>
          <Link className="button button-secondary" href="/games">
            Wróć do katalogu
          </Link>
        </div>
      </main>
    );

  if (isLoansTab) return <AdminLoansPage route={route} />;

  const currentEdit = editing?.section === section ? editing.id : null;
  const filteredGames =
    data?.games.filter((game) =>
      game.title
        .toLocaleLowerCase("pl")
        .includes(query.toLocaleLowerCase("pl")),
    ) ?? [];
  const filteredCopies =
    data?.copies.filter((copy) =>
      `${copy.inventoryCode} ${copy.game.title}`
        .toLocaleLowerCase("pl")
        .includes(query.toLocaleLowerCase("pl")),
    ) ?? [];
  const list =
    section === "games"
      ? filteredGames
      : section === "copies"
        ? filteredCopies
        : (data?.categories ?? []);
  const totalPages = Math.max(1, Math.ceil(list.length / 20));
  const currentPage = Math.min(page, totalPages);
  const visible = list.slice((currentPage - 1) * 20, currentPage * 20);

  return (
    <main className="container admin-page">
      <div className="page-heading">
        <p className="eyebrow">ZARZĄDZANIE KATALOGIEM</p>
        <h1>Panel administratora</h1>
        <p>Dodawaj i aktualizuj gry, kategorie oraz fizyczne egzemplarze.</p>
      </div>
      <AdminTabs current={section} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      {loading && (
        <p className="admin-loading" role="status">
          Ładowanie katalogu…
        </p>
      )}
      {error && (
        <div className="state-card" role="alert">
          <h2>Nie można pobrać katalogu</h2>
          <p>{error}</p>
          <button
            className="button button-secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="admin-summary">
            <div>
              <strong>{data.games.length}</strong>
              <span>gier</span>
            </div>
            <div>
              <strong>{data.categories.length}</strong>
              <span>kategorii</span>
            </div>
            <div>
              <strong>{data.copies.length}</strong>
              <span>egzemplarzy</span>
            </div>
          </div>
          <div className="admin-grid">
            <div className="admin-form-panel" id="admin-form">
              {section === "categories" ? (
                <CategoryForm
                  key={currentEdit ?? "new"}
                  item={
                    data.categories.find(
                      (category) => category.id === currentEdit,
                    ) ?? null
                  }
                  busy={busy}
                  cancel={() => setEditing(null)}
                  save={(body) =>
                    mutate(
                      currentEdit
                        ? `/categories/${currentEdit}`
                        : "/categories",
                      currentEdit ? "PATCH" : "POST",
                      body,
                      currentEdit
                        ? "Kategoria została zaktualizowana."
                        : "Kategoria została dodana.",
                    )
                  }
                />
              ) : section === "games" ? (
                <GameForm
                  key={currentEdit ?? "new"}
                  item={
                    data.games.find((game) => game.id === currentEdit) ?? null
                  }
                  categories={data.categories}
                  busy={busy}
                  cancel={() => setEditing(null)}
                  save={(body) =>
                    mutate(
                      currentEdit ? `/games/${currentEdit}` : "/games",
                      currentEdit ? "PATCH" : "POST",
                      body,
                      currentEdit
                        ? "Gra została zaktualizowana."
                        : "Gra została dodana.",
                    )
                  }
                />
              ) : (
                <CopyForm
                  key={currentEdit ?? "new"}
                  item={
                    data.copies.find((copy) => copy.id === currentEdit) ?? null
                  }
                  games={data.games}
                  busy={busy}
                  cancel={() => setEditing(null)}
                  save={(body) =>
                    mutate(
                      currentEdit
                        ? `/game-copies/${currentEdit}`
                        : "/game-copies",
                      currentEdit ? "PATCH" : "POST",
                      body,
                      currentEdit
                        ? "Egzemplarz został zaktualizowany."
                        : "Egzemplarz został dodany.",
                    )
                  }
                />
              )}
            </div>
            <section className="admin-list" aria-labelledby="admin-list-title">
              <div className="admin-list__heading">
                <div>
                  <h2 id="admin-list-title">{labels[section]}</h2>
                  <p>
                    {list.length}{" "}
                    {section === "games"
                      ? "gier"
                      : section === "copies"
                        ? "egzemplarzy"
                        : "kategorii"}
                  </p>
                </div>
                {section !== "categories" && (
                  <label className="admin-search">
                    Szukaj
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setSearchState({ section, value: event.target.value });
                        setPagingState({ section, page: 1 });
                      }}
                      placeholder={
                        section === "games" ? "Tytuł gry" : "Kod lub tytuł gry"
                      }
                    />
                  </label>
                )}
              </div>
              {visible.length ? (
                <div className="admin-items">
                  {section === "categories"
                    ? (visible as Category[]).map((category) => (
                        <article className="admin-item" key={category.id}>
                          <div>
                            <h3>{category.name}</h3>
                            <p>{category.description || "Bez opisu"}</p>
                          </div>
                          <div className="admin-item__actions">
                            <button
                              onClick={() => edit("categories", category.id)}
                            >
                              Edytuj
                            </button>
                            <button
                              className="admin-delete"
                              disabled={busy}
                              onClick={() =>
                                remove(
                                  "categories",
                                  category.id,
                                  `kategorię „${category.name}”`,
                                )
                              }
                            >
                              Usuń
                            </button>
                          </div>
                        </article>
                      ))
                    : section === "games"
                      ? (visible as Game[]).map((game) => (
                          <article className="admin-item" key={game.id}>
                            <div>
                              <h3>
                                <Link href={`/games/${game.id}`}>
                                  {game.title}
                                </Link>
                              </h3>
                              <p>
                                {game.category.name} · {game.availableCopies}{" "}
                                dostępnych
                              </p>
                            </div>
                            <div className="admin-item__actions">
                              <button onClick={() => edit("games", game.id)}>
                                Edytuj
                              </button>
                              <button
                                className="admin-delete"
                                disabled={busy}
                                onClick={() =>
                                  remove(
                                    "games",
                                    game.id,
                                    `grę „${game.title}”`,
                                  )
                                }
                              >
                                Usuń
                              </button>
                            </div>
                          </article>
                        ))
                      : (visible as GameCopy[]).map((copy) => (
                          <article className="admin-item" key={copy.id}>
                            <div>
                              <h3>{copy.inventoryCode}</h3>
                              <p>
                                {copy.game.title} · {copyStatus[copy.status]}
                                {copy.status === "AVAILABLE" &&
                                !copy.isAvailable
                                  ? " · wypożyczony"
                                  : ""}
                              </p>
                            </div>
                            <div className="admin-item__actions">
                              <button onClick={() => edit("copies", copy.id)}>
                                Edytuj
                              </button>
                              <button
                                className="admin-delete"
                                disabled={busy}
                                onClick={() =>
                                  remove(
                                    "copies",
                                    copy.id,
                                    `egzemplarz „${copy.inventoryCode}”`,
                                  )
                                }
                              >
                                Usuń
                              </button>
                            </div>
                          </article>
                        ))}
                </div>
              ) : (
                <div className="admin-empty">
                  {query
                    ? "Brak wyników wyszukiwania."
                    : "Brak wpisów. Dodaj pierwszy formularzem obok."}
                </div>
              )}
              {totalPages > 1 && (
                <div className="admin-paging">
                  <button
                    className="button button-secondary"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setPagingState({ section, page: currentPage - 1 })
                    }
                  >
                    ← Poprzednia
                  </button>
                  <span>
                    Strona {currentPage} z {totalPages}
                  </span>
                  <button
                    className="button button-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPagingState({ section, page: currentPage + 1 })
                    }
                  >
                    Następna →
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
