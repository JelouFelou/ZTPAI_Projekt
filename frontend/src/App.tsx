import { useSyncExternalStore } from "react";
import Link from "./components/Link";
import { AuthProvider } from "./auth";
import { useAuth } from "./authContext";
import { currentRoute, subscribe } from "./navigation";
import CatalogPage from "./pages/CatalogPage";
import GameDetailsPage from "./pages/GameDetailsPage";
import AuthPage from "./pages/AuthPage";
import LoansPage from "./pages/LoansPage";
import AdminPage from "./pages/AdminPage";
import NotificationsPage from "./pages/NotificationsPage";
import "./App.css";

function App() {
  const route = useSyncExternalStore(subscribe, currentRoute);
  const path = route.split("?")[0];
  const gameId = /^\/games\/([^/]+)$/.exec(path)?.[1];
  const { user, logout } = useAuth();
  const next =
    new URLSearchParams(route.split("?")[1] ?? "").get("next") ?? "/loans";

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
            {user && (
              <Link
                href="/loans"
                aria-current={path === "/loans" ? "page" : undefined}
              >
                Moje wypożyczenia
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                aria-current={path === "/admin" ? "page" : undefined}
              >
                Panel admina
              </Link>
            )}
            {user && (
              <Link
                href="/notifications"
                aria-current={path === "/notifications" ? "page" : undefined}
              >
                Powiadomienia
              </Link>
            )}
          </nav>
          {user ? (
            <div className="header-account">
              <span>Cześć, {user.firstName}</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.replace("/");
                }}
              >
                Wyloguj
              </button>
            </div>
          ) : (
            <Link className="header-action" href="/login">
              Zaloguj się <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </header>

      {path === "/" || path === "/games" ? (
        <CatalogPage route={route} showHero={path === "/"} />
      ) : gameId ? (
        <GameDetailsPage key={gameId} id={gameId} />
      ) : path === "/login" || path === "/register" ? (
        <AuthPage
          key={path}
          mode={path === "/login" ? "login" : "register"}
          next={next}
        />
      ) : path === "/loans" ? (
        <LoansPage route={route} />
      ) : path === "/notifications" ? (
        <NotificationsPage route={route} />
      ) : path === "/admin" ? (
        <AdminPage route={route} />
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
        <div className="container footer-credit">
          <span>Adrian Bober · nr albumu 152685</span>
          <a href="mailto:adrian.bober@student.pk.edu.pl">
            adrian.bober@student.pk.edu.pl
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
