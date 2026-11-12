import { useEffect, useState } from "react";
import { ApiError, getGame } from "../api";
import type { Game } from "../api";
import Link from "../components/Link";
import { GameArtwork } from "../components/GameCard";
import { formatDuration, formatPlayers } from "../gameFormatting";

export default function GameDetailsPage({ id }: { id: string }) {
  const [request, setRequest] = useState<{
    key: number;
    game: Game | null;
    error: string;
    notFound: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const loading = request?.key !== retry;
  const game = loading ? null : request.game;
  const error = loading ? "" : request.error;
  const notFound = !loading && request.notFound;

  useEffect(() => {
    const controller = new AbortController();
    getGame(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setRequest({ key: retry, game: data, error: "", notFound: false });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setRequest({
            key: retry,
            game: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać gry.",
            notFound: cause instanceof ApiError && cause.status === 404,
          });
      });
    return () => controller.abort();
  }, [id, retry]);

  return (
    <main className="details-page container">
      <nav className="breadcrumbs" aria-label="Ścieżka nawigacji">
        <Link href="/games">Katalog gier</Link>
        <span aria-hidden="true">/</span>
        <span>{game?.title ?? "Szczegóły gry"}</span>
      </nav>
      {loading ? (
        <div className="details-loading" role="status">
          Ładowanie gry…
        </div>
      ) : error ? (
        <div className="state-card" role="alert">
          <span className="state-card__icon" aria-hidden="true">
            {notFound ? "◇" : "!"}
          </span>
          <h1>
            {notFound ? "Nie znaleźliśmy tej gry" : "Nie można pobrać gry"}
          </h1>
          <p>{error}</p>
          {notFound ? (
            <Link className="button button-primary" href="/games">
              Wróć do katalogu
            </Link>
          ) : (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Spróbuj ponownie
            </button>
          )}
        </div>
      ) : (
        game && (
          <>
            <div className="details-grid">
              <GameArtwork
                title={game.title}
                variant={game.title.length % 4}
                large
              />
              <div className="details-info">
                <p className="eyebrow">
                  {game.category.name.toLocaleUpperCase("pl")} · GRA PLANSZOWA
                </p>
                <h1>{game.title}</h1>
                <p className="details-lead">
                  {game.description ||
                    "Czas na nową przygodę przy stole. Poznaj tę grę i sprawdź, czy jest dostępna."}
                </p>
                <div
                  className={`details-availability ${game.availableCopies ? "details-availability--yes" : "details-availability--no"}`}
                >
                  <span className="availability-dot" aria-hidden="true" />
                  <div>
                    <strong>
                      {game.availableCopies
                        ? "Dostępna do wypożyczenia"
                        : "Obecnie niedostępna"}
                    </strong>
                    <span>
                      {game.availableCopies
                        ? `${game.availableCopies} ${game.availableCopies === 1 ? "egzemplarz" : game.availableCopies < 5 ? "egzemplarze" : "egzemplarzy"} dostępnych`
                        : "Wróć później i sprawdź ponownie"}
                    </span>
                  </div>
                </div>
                <div className="details-facts">
                  <div>
                    <span className="details-facts__icon" aria-hidden="true">
                      ♟
                    </span>
                    <span>
                      Gracze<strong>{formatPlayers(game)}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="details-facts__icon" aria-hidden="true">
                      ◷
                    </span>
                    <span>
                      Czas gry
                      <strong>{formatDuration(game.durationMinutes)}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="details-facts__icon" aria-hidden="true">
                      ✦
                    </span>
                    <span>
                      Wiek<strong>{game.recommendedAge}+</strong>
                    </span>
                  </div>
                </div>
                <Link
                  className="button button-secondary details-back"
                  href="/games"
                >
                  ← Wróć do katalogu
                </Link>
              </div>
            </div>
            <section className="details-description">
              <p className="eyebrow">O GRZE</p>
              <h2>Co kryje pudełko?</h2>
              <p>
                {game.description ||
                  "Opis tej gry nie został jeszcze dodany. Sprawdź pozostałe tytuły w naszym katalogu."}
              </p>
            </section>
          </>
        )
      )}
    </main>
  );
}
