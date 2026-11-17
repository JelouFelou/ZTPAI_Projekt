import { useState } from "react";
import { navigate } from "../navigation";
import { catalogSearchTarget } from "../catalogSearchTarget";
import "./HeaderSearch.css";

export default function HeaderSearch({ route }: { route: string }) {
  const [path, search = ""] = route.split("?");
  const query =
    path === "/" || path === "/games"
      ? (new URLSearchParams(search).get("q") ?? "")
      : "";
  const [draft, setDraft] = useState({ query, value: query });
  const value = draft.query === query ? draft.value : query;
  return (
    <form
      className="header-search"
      role="search"
      aria-label="Wyszukiwanie gier"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(catalogSearchTarget(route, value));
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
        value={value}
        onChange={(event) => setDraft({ query, value: event.target.value })}
      />
      <button type="submit">Szukaj</button>
    </form>
  );
}
