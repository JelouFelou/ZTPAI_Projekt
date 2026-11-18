import { useEffect, useId, useRef, useState } from "react";
import { navigate } from "../navigation";
import { catalogSearchTarget } from "../catalogSearchTarget";
import { getGames } from "../api";
import type { Game } from "../api";
import { gameArtworkVariant } from "../gameArtworkVariant";
import "./HeaderSearch.css";

export default function HeaderSearch({ route }: { route: string }) {
  const [path, search = ""] = route.split("?");
  const query =
    path === "/" || path === "/games"
      ? (new URLSearchParams(search).get("q") ?? "")
      : "";
  const [draft, setDraft] = useState({ query, value: query });
  const value = draft.query === query ? draft.value : query;
  const formRef = useRef<HTMLFormElement>(null);
  const listId = useId();
  const [popupRoute, setPopupRoute] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [request, setRequest] = useState<{
    key: string;
    games: Game[];
    total: number;
    error: boolean;
  } | null>(null);
  const term = value.trim();
  const params = new URLSearchParams(
    catalogSearchTarget(route, term).split("?")[1],
  );
  params.set("limit", "5");
  const searchKey = `?${params}`;
  const visible = popupRoute === route && term.length > 0;
  const current = request?.key === searchKey ? request : null;
  const games = current?.games ?? [];
  const activeGame = games[activeIndex];

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      getGames(searchKey, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted)
            setRequest({
              key: searchKey,
              games: result.data,
              total: result.pagination.total,
              error: false,
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setRequest({ key: searchKey, games: [], total: 0, error: true });
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchKey, visible]);

  useEffect(() => {
    if (!visible) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !formRef.current?.contains(event.target)
      )
        setPopupRoute(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [visible]);

  useEffect(() => {
    if (visible && activeIndex >= 0)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, visible]);

  function showResults() {
    setPopupRoute(null);
    setActiveIndex(-1);
    navigate(catalogSearchTarget(route, value));
  }

  function choose(game: Game) {
    setPopupRoute(null);
    setActiveIndex(-1);
    setDraft({ query: "", value: game.title });
    navigate(`/games/${encodeURIComponent(game.id)}`);
  }
  return (
    <form
      ref={formRef}
      className="header-search"
      role="search"
      aria-label="Wyszukiwanie gier"
      onSubmit={(event) => {
        event.preventDefault();
        showResults();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPopupRoute(null);
      }}
    >
      <svg
        className="header-search__icon"
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        type="search"
        name="q"
        aria-label="Szukaj gry po tytule lub opisie"
        placeholder="Szukaj gry…"
        maxLength={200}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? listId : undefined}
        aria-activedescendant={
          visible && activeGame ? `${listId}-${activeIndex}` : undefined
        }
        value={value}
        onFocus={() => {
          setPopupRoute(route);
          setActiveIndex(-1);
        }}
        onClick={() => setPopupRoute(route)}
        onChange={(event) => {
          setDraft({ query, value: event.target.value });
          setPopupRoute(route);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setPopupRoute(null);
            setActiveIndex(-1);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setPopupRoute(route);
            if (games.length)
              setActiveIndex((index) =>
                event.key === "ArrowDown"
                  ? (index + 1) % games.length
                  : index <= 0
                    ? games.length - 1
                    : index - 1,
              );
          } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (visible && activeGame) choose(activeGame);
            else showResults();
          }
        }}
      />
      <button type="submit">Szukaj</button>
      {visible && (
        <div className="search-suggestions">
          <p className="search-suggestions__heading">Pasujące gry</p>
          {!current ? (
            <p className="search-suggestions__message" role="status">
              Szukam gier…
            </p>
          ) : current.error ? (
            <p className="search-suggestions__message" role="status">
              Nie udało się pobrać podpowiedzi. Naciśnij Enter, aby wyszukać w
              katalogu.
            </p>
          ) : (
            !games.length && (
              <p className="search-suggestions__message" role="status">
                Brak pasujących gier. Spróbuj innego tytułu lub fragmentu opisu.
              </p>
            )
          )}
          <ul
            id={listId}
            className="search-suggestions__list"
            role="listbox"
            aria-label="Pasujące gry"
            aria-busy={!current}
          >
            {games.map((game, index) => (
              <li
                key={game.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className="search-suggestion"
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => choose(game)}
              >
                <span
                  className="search-suggestion__art"
                  data-variant={gameArtworkVariant(game.id)}
                  aria-hidden="true"
                >
                  {game.title.trim().charAt(0).toLocaleUpperCase("pl")}
                </span>
                <span className="search-suggestion__copy">
                  <strong>{game.title}</strong>
                  <small>{game.category.name}</small>
                </span>
                <span
                  className={`search-suggestion__availability ${game.availableCopies ? "search-suggestion__availability--yes" : ""}`}
                >
                  {game.availableCopies ? "Dostępna" : "Niedostępna"}
                </span>
              </li>
            ))}
          </ul>
          {!!games.length && (
            <button
              className="search-suggestions__all"
              type="button"
              onClick={showResults}
            >
              Pokaż wszystkie wyniki ({current?.total}){" "}
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      )}
    </form>
  );
}
