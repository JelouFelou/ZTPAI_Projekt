import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getCategories, getGames } from "../api";
import type { Category, PaginatedGames } from "../api";
import Link from "../components/Link";
import { navigate } from "../navigation";
import GameCard from "../components/GameCard";
import { catalogPageSize } from "../catalogPageSize";

const PAGE_SIZE = 12;

function readFilters(route: string) {
  const params = new URLSearchParams(route.split("?")[1] ?? "");
  const page = Number(params.get("page"));
  const limit = Number(params.get("limit"));
  return {
    q: params.get("q")?.trim() ?? "",
    categoryId: params.get("categoryId") ?? "",
    page: Number.isSafeInteger(page) && page > 0 && page <= 1000000 ? page : 1,
    limit: [12, 24, 48].includes(limit) ? limit : PAGE_SIZE,
  };
}

function searchFor({
  q,
  categoryId,
  page,
  limit,
}: ReturnType<typeof readFilters>) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoryId) params.set("categoryId", categoryId);
  if (page > 1) params.set("page", String(page));
  params.set("limit", String(limit));
  return params.size ? `?${params}` : "";
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="hero-kicker">
            ✦ &nbsp; Wypożyczalnia gier planszowych
          </span>
          <h1 id="hero-title">
            Więcej gry.
            <br />
            <em>Mniej półek.</em>
          </h1>
          <p>
            Odkrywaj gry na każdą okazję. Wybierz tytuł, sprawdź dostępność i
            zaplanuj kolejny wieczór przy stole.
          </p>
          <Link className="button button-primary hero-button" href="/games">
            Przeglądaj katalog <span aria-hidden="true">→</span>
          </Link>
          <div className="hero-note">
            <span aria-hidden="true">◆ ● ✦</span> Nowe historie zaczynają się od
            jednego ruchu
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-star hero-star--one">✦</span>
          <span className="hero-star hero-star--two">✳</span>
          <div className="hero-board">
            <span className="hero-board__title">
              PLAY
              <br />
              MORE<span>.</span>
            </span>
            <span className="hero-board__subtitle">
              Kolejny ruch należy do Ciebie.
            </span>
            <span className="hero-board__shape" />
          </div>
          <div className="hero-die">
            <span>●</span>
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
          <div className="hero-token hero-token--orange" />
          <div className="hero-token hero-token--purple" />
          <div className="hero-label">TWÓJ WIECZÓR · TWOJA GRA</div>
        </div>
      </div>
    </section>
  );
}

export default function CatalogPage({
  showHero,
  route,
}: {
  showHero: boolean;
  route: string;
}) {
  const catalogRef = useRef<HTMLElement>(null);
  const previousColumns = useRef(0);
  const [columns, setColumns] = useState(1);
  const filters = readFilters(route);
  const pageSize = catalogPageSize(filters.limit, columns);
  const search = searchFor({ ...filters, limit: pageSize });
  const [draftState, setDraftState] = useState({
    query: filters.q,
    value: filters.q,
  });
  const draft = draftState.query === filters.q ? draftState.value : filters.q;
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [request, setRequest] = useState<{
    key: string;
    data: PaginatedGames | null;
    error: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = `${search}|${retry}`;
  const loading = request?.key !== requestKey;
  const result = loading ? null : request.data;
  const error = loading ? "" : request.error;

  useLayoutEffect(() => {
    const section = catalogRef.current;
    if (!section) return;
    const measure = () => {
      const grid = section.querySelector(".game-grid");
      if (!grid) return;
      const tracks = getComputedStyle(grid).gridTemplateColumns;
      if (!tracks || tracks === "none") return;
      const nextColumns = tracks.trim().split(/\s+/).length;
      if (nextColumns === previousColumns.current) return;
      const wasMeasured = previousColumns.current > 0;
      previousColumns.current = nextColumns;
      setColumns(nextColumns);
      const current = readFilters(route);
      if (wasMeasured && current.page > 1)
        navigate(`/games${searchFor({ ...current, page: 1 })}`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    measure();
    return () => observer.disconnect();
  }, [route]);

  useEffect(() => {
    if (
      result &&
      result.pagination.totalPages > 0 &&
      filters.page > result.pagination.totalPages
    )
      navigate(`/games${searchFor({ ...readFilters(route), page: 1 })}`);
  }, [result, filters.page, route]);

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then(setCategories)
      .catch(() => {
        if (!controller.signal.aborted) setCategoriesError(true);
      });
    return () => controller.abort();
  }, [categoryRetry]);
  useEffect(() => {
    const controller = new AbortController();
    getGames(search, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setRequest({ key: requestKey, data, error: "" });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setRequest({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać gier.",
          });
      });
    return () => controller.abort();
  }, [search, requestKey]);

  function changeFilters(next: Partial<typeof filters>) {
    navigate(`/games${searchFor({ ...filters, ...next, page: 1 })}`);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeFilters({ q: draft.trim() });
  }
  const total = result?.pagination.total ?? 0;
  const page = result?.pagination.page ?? filters.page;
  const totalPages = result?.pagination.totalPages ?? 0;

  return (
    <main>
      {showHero && <Hero />}
      <section
        ref={catalogRef}
        className="catalog-section container"
        id="katalog"
        aria-labelledby="catalog-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">KATALOG · TWOJE NASTĘPNE ODKRYCIE</p>
            <h2 id="catalog-title">
              Znajdź grę <span>dla siebie.</span>
            </h2>
            <p>
              Od szybkiej rozgrywki po całonocną przygodę — wybór należy do
              Ciebie.
            </p>
          </div>
          <span className="section-spark" aria-hidden="true">
            ✳
          </span>
        </div>
        <form className="filter-bar" onSubmit={submitSearch} role="search">
          <label className="search-field">
            <span className="field-label">Szukaj gry</span>
            <span className="search-control">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                value={draft}
                onChange={(event) =>
                  setDraftState({ query: filters.q, value: event.target.value })
                }
                placeholder="Tytuł lub opis gry…"
                maxLength={200}
              />
            </span>
          </label>
          <label className="category-field">
            <span className="field-label">Kategoria</span>
            <select
              value={filters.categoryId}
              onChange={(event) =>
                changeFilters({ categoryId: event.target.value })
              }
            >
              <option value="">Wszystkie kategorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {filters.categoryId &&
                !categories.some(
                  (category) => category.id === filters.categoryId,
                ) && (
                  <option value={filters.categoryId}>Wybrana kategoria</option>
                )}
            </select>
          </label>
          <button className="button button-primary filter-submit" type="submit">
            Szukaj <span aria-hidden="true">→</span>
          </button>
        </form>
        {categoriesError && (
          <p className="filter-hint" role="status">
            Nie udało się pobrać kategorii. Wyszukiwanie gier nadal działa.
            <button
              type="button"
              onClick={() => {
                setCategoriesError(false);
                setCategoryRetry((value) => value + 1);
              }}
            >
              Spróbuj ponownie
            </button>
          </p>
        )}
        <div className="results-bar">
          <p aria-live="polite">
            {loading ? (
              "Szukamy gier…"
            ) : error ? (
              "Nie udało się pobrać listy"
            ) : (
              <>
                <strong>{total}</strong>{" "}
                {total === 1 ? "gra" : total > 1 && total < 5 ? "gry" : "gier"}{" "}
                w katalogu
              </>
            )}
          </p>
          <div className="results-actions">
            {(filters.q || filters.categoryId) && (
              <Link className="clear-link" href="/games">
                Wyczyść filtry
              </Link>
            )}
            <label>
              Na stronę{" "}
              <select
                value={filters.limit}
                onChange={(event) =>
                  changeFilters({ limit: Number(event.target.value) })
                }
                aria-label="Liczba gier na stronę"
              >
                {[12, 24, 48].map((size) => (
                  <option key={size} value={size}>
                    {catalogPageSize(size, columns)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {error ? (
          <div className="state-card" role="alert">
            <span className="state-card__icon" aria-hidden="true">
              !
            </span>
            <h3>Coś poszło nie tak</h3>
            <p>{error}</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : loading ? (
          <div className="game-grid" aria-label="Ładowanie gier">
            {Array.from({ length: pageSize }, (_, index) => index).map(
              (item) => (
                <div className="game-card skeleton-card" key={item}>
                  <div className="skeleton-art" />
                  <div className="skeleton-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : result && result.data.length ? (
          <div className="game-grid">
            {result.data.map((game, index) => (
              <GameCard
                key={game.id}
                game={game}
                index={(page - 1) * pageSize + index}
              />
            ))}
          </div>
        ) : (
          <div className="state-card empty-state">
            <span className="state-card__icon" aria-hidden="true">
              ◇
            </span>
            <h3>
              {total > 0
                ? "Ta strona katalogu jest pusta"
                : filters.q || filters.categoryId
                  ? "Nie znaleźliśmy takich gier"
                  : "Katalog czeka na pierwsze gry"}
            </h3>
            <p>
              {total > 0
                ? "Wróć na początek wyników."
                : filters.q || filters.categoryId
                  ? "Zmień wyszukiwane słowo lub kategorię i spróbuj ponownie."
                  : "Gdy administrator doda gry do katalogu, pojawią się tutaj."}
            </p>
            {(total > 0 || filters.q || filters.categoryId) && (
              <Link
                className="button button-secondary"
                href={
                  total > 0
                    ? `/games${searchFor({ ...filters, page: 1 })}`
                    : "/games"
                }
              >
                {total > 0 ? "Pierwsza strona" : "Pokaż wszystkie gry"}
              </Link>
            )}
          </div>
        )}
        {!loading && !error && totalPages > 1 && (
          <nav className="pagination" aria-label="Strony katalogu">
            <Link
              className={`page-link${page === 1 ? " page-link--disabled" : ""}`}
              href={`/games${searchFor({ ...filters, page: page - 1 })}`}
              aria-disabled={page === 1}
              tabIndex={page === 1 ? -1 : undefined}
            >
              ← <span>Poprzednia</span>
            </Link>
            <span>
              Strona <strong>{page}</strong> z <strong>{totalPages}</strong>
            </span>
            <Link
              className={`page-link${page >= totalPages ? " page-link--disabled" : ""}`}
              href={`/games${searchFor({ ...filters, page: page + 1 })}`}
              aria-disabled={page >= totalPages}
              tabIndex={page >= totalPages ? -1 : undefined}
            >
              <span>Następna</span> →
            </Link>
          </nav>
        )}
      </section>
      <section className="how-it-works">
        <div className="container how-grid">
          <div>
            <p className="eyebrow">PROSTO I PRZYJEMNIE</p>
            <h2>
              Dobra gra.
              <br />
              <em>Dobry wieczór.</em>
            </h2>
          </div>
          <p>
            Przeglądaj katalog, sprawdzaj dostępność i wypożyczaj gry. Swoje
            wypożyczenia oraz terminy zwrotów znajdziesz w jednym miejscu.
          </p>
        </div>
      </section>
    </main>
  );
}
