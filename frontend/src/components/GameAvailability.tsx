import { useEffect, useState } from "react";
import type { Game } from "../api";
import { loanDate } from "../loanFormatting";

export default function GameAvailability({ game }: { game: Game }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section
      className="game-availability"
      aria-label="Egzemplarze i terminy zwrotów"
    >
      <dl className="game-availability__counts">
        <div>
          <dt>Dostępne</dt>
          <dd>{game.availableCopies}</dd>
        </div>
        <div>
          <dt>Wypożyczone</dt>
          <dd>{game.borrowedCopies}</dd>
        </div>
      </dl>
      {game.expectedReturns.length > 0 ? (
        <>
          <h3>Przewidywane powroty egzemplarzy</h3>
          <ul className="game-availability__returns">
            {game.expectedReturns.map((copy) => (
              <li key={copy.inventoryCode}>
                <span>{copy.inventoryCode}</span>
                <div>
                  <time dateTime={copy.dueAt}>{loanDate(copy.dueAt)}</time>
                  {new Date(copy.dueAt).getTime() < now && (
                    <small className="game-availability__overdue">
                      Termin minął — czekamy na zwrot
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p>
            To terminy planowane. Dostępność zaktualizuje się po faktycznym
            zwrocie.
          </p>
        </>
      ) : (
        <p>Żaden egzemplarz tej gry nie jest obecnie wypożyczony.</p>
      )}
    </section>
  );
}
