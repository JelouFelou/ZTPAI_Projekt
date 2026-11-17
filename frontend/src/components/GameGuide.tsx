import type { Game } from "../api";

const difficultyLabels = {
  EASY: "Łatwa",
  MEDIUM: "Średnia",
  HARD: "Wymagająca",
};

export default function GameGuide({ game }: { game: Game }) {
  if (
    !game.occasion &&
    !game.difficulty &&
    !game.gameplay &&
    !game.highlights?.length
  )
    return null;
  return (
    <div className="game-guide">
      {(game.occasion || game.difficulty) && (
        <dl className="game-guide__summary">
          {game.occasion && (
            <div>
              <dt>Na jaką okazję?</dt>
              <dd>{game.occasion}</dd>
            </div>
          )}
          {game.difficulty && (
            <div>
              <dt>Poziom trudności</dt>
              <dd>{difficultyLabels[game.difficulty]}</dd>
            </div>
          )}
        </dl>
      )}
      {game.gameplay && (
        <section>
          <h3>Na czym polega gra?</h3>
          <p>{game.gameplay}</p>
        </section>
      )}
      {!!game.highlights?.length && (
        <section>
          <h3>Warto wiedzieć</h3>
          <ul>
            {game.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
