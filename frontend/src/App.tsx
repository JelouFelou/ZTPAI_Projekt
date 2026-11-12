import { useSyncExternalStore } from "react";
import Link from "./components/Link";
import { currentRoute, subscribe } from "./navigation";
import CatalogPage from "./pages/CatalogPage";
import GameDetailsPage from "./pages/GameDetailsPage";
import "./App.css";

function App() {
  const route = useSyncExternalStore(subscribe, currentRoute);
  const path = route.split("?")[0];
  const gameId = /^\/games\/([^/]+)$/.exec(path)?.[1];

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link
            className="brand"
            href="/"
            aria-label="BoardRent — strona główna"
          >
            <span className="brand-mark" aria-hidden="true">
              ✦
            </span>
            Board<span>Rent</span>
          </Link>
          <nav className="header-nav" aria-label="Nawigacja główna">
            <Link
              href="/games"
              aria-current={path === "/games" ? "page" : undefined}
            >
              Katalog gier
            </Link>
          </nav>
          <Link className="header-action" href="/games">
            Odkryj gry <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {path === "/" || path === "/games" ? (
        <CatalogPage route={route} showHero={path === "/"} />
      ) : gameId ? (
        <GameDetailsPage key={gameId} id={gameId} />
      ) : (
        <main className="container not-found">
          <p className="eyebrow">404 · Nie znaleziono strony</p>
          <h1>Ta ścieżka nie prowadzi do gry.</h1>
          <p>Wróć do katalogu i wybierz coś dla siebie.</p>
          <Link className="button button-primary" href="/games">
            Przeglądaj gry →
          </Link>
        </main>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <span className="footer-brand">
            Board<span>Rent</span>.
          </span>
          <span>Gry planszowe, które łączą przy stole.</span>
          <Link href="/games">Katalog ↗</Link>
        </div>
      </footer>
    </div>
  );
}

export default App;
