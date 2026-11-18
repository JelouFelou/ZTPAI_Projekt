import { useEffect, useState } from "react";
import { ApiError, getGame } from "../api";
import type { Game } from "../api";
import BorrowAction from "../components/BorrowAction";
import Link from "../components/Link";
import { GameArtwork } from "../components/GameCard";
import { formatDuration, formatPlayers } from "../gameFormatting";
import GameGuide from "../components/GameGuide";
import GameAvailability from "../components/GameAvailability";
import "./GameDetailsPage.css";

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
    <main className="details-page game-page container">
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
            <header className="game-page__heading">
              <p className="eyebrow">{game.category.name} · gra planszowa</p>
              <h1>{game.title}</h1>
            </header>
            <div className="game-page__layout">
              <section
                className="game-showcase"
                aria-label="Prezentacja i parametry gry"
              >
                <GameArtwork game={game} large />
                <dl className="game-showcase__facts">
                  <div>
                    <dt>Gracze</dt>
                    <dd>{formatPlayers(game)}</dd>
                  </div>
                  <div>
                    <dt>Czas gry</dt>
                    <dd>{formatDuration(game.durationMinutes)}</dd>
                  </div>
                  <div>
                    <dt>Wiek</dt>
                    <dd>{game.recommendedAge}+</dd>
                  </div>
                </dl>
              </section>
              <section
                className="game-story"
                aria-labelledby="game-story-title"
              >
                <h2 id="game-story-title">O tej grze</h2>
                <p className="game-story__intro">
                  {game.description ||
                    "Opis tej gry nie został jeszcze dodany. Sprawdź parametry i dostępność egzemplarzy."}
                </p>
                <GameGuide game={game} />
              </section>
              <aside
                className="game-rental"
                aria-labelledby="game-rental-title"
              >
                <div className="game-rental__heading">
                  <p className="eyebrow">Twoja kolej na grę</p>
                  <h2 id="game-rental-title">Wypożycz egzemplarz</h2>
                  <span
                    className={`game-rental__status ${game.availableCopies ? "game-rental__status--available" : "game-rental__status--unavailable"}`}
                  >
                    <span className="availability-dot" aria-hidden="true" />
                    {game.availableCopies
                      ? "Dostępna do wypożyczenia"
                      : "Obecnie niedostępna"}
                  </span>
                </div>
                <BorrowAction game={game} />
                {!game.availableCopies && (
                  <p className="game-rental__unavailable">
                    Teraz nie ma wolnego egzemplarza. Sprawdź planowane zwroty
                    poniżej.
                  </p>
                )}
                <GameAvailability game={game} />
                <button
                  className="game-rental__refresh"
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Odśwież dostępność
                </button>
              </aside>
            </div>
          </>
        )
      )}
    </main>
  );
}
