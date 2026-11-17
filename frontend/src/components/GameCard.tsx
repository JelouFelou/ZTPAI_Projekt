import { useState } from "react";
import type { Game } from "../api";
import Link from "./Link";
import GameInfoDialog from "./GameInfoDialog";
import { formatDuration, formatPlayers } from "../gameFormatting";

export function GameArtwork({
  title,
  variant = 0,
  large = false,
}: {
  title: string;
  variant?: number;
  large?: boolean;
}) {
  return (
    <div
      className={`game-art game-art--${variant % 4}${large ? " game-art--large" : ""}`}
      aria-hidden="true"
    >
      <div className="game-art__orbit game-art__orbit--one" />
      <div className="game-art__orbit game-art__orbit--two" />
      <div className="game-art__tile game-art__tile--one" />
      <div className="game-art__tile game-art__tile--two" />
      <div className="game-art__letter">
        {title.trim().charAt(0).toLocaleUpperCase("pl")}
      </div>
      <span className="game-art__caption">BOARDRENT · GRA PLANSZOWA</span>
    </div>
  );
}

export default function GameCard({
  game,
  index,
}: {
  game: Game;
  index: number;
}) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <article className="game-card">
      <GameArtwork title={game.title} variant={index} />
      <div className="game-card__body">
        <div className="card-topline">
          <span className="category-label">{game.category.name}</span>
          <span
            className={`availability ${game.availableCopies ? "availability--yes" : "availability--no"}`}
          >
            <span aria-hidden="true" />
            {game.availableCopies
              ? `Dostępne: ${game.availableCopies}`
              : "Niedostępna"}
          </span>
        </div>
        <h3>
          <Link className="game-card__link" href={`/games/${game.id}`}>
            {game.title}
          </Link>
        </h3>
        <p className="game-card__description">
          {game.description ||
            "Odkryj tę grę planszową i zaproś znajomych do stołu."}
        </p>
        <div className="game-card__bottom">
          <div className="game-facts">
            <span>
              <small>Gracze</small>
              {formatPlayers(game)}
            </span>
            <span>
              <small>Czas gry</small>
              {formatDuration(game.durationMinutes)}
            </span>
          </div>
          <button
            className="card-info"
            type="button"
            aria-label={`Informacje o grze: ${game.title}`}
            aria-haspopup="dialog"
            title="Informacje o grze"
            onClick={() => setShowInfo(true)}
          >
            <span aria-hidden="true">i</span>
          </button>
        </div>
      </div>
      {showInfo && (
        <GameInfoDialog game={game} onClose={() => setShowInfo(false)} />
      )}
    </article>
  );
}
