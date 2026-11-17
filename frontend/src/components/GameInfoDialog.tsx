import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { Game } from "../api";
import { formatDuration, formatPlayers } from "../gameFormatting";
import GameGuide from "./GameGuide";
import GameAvailability from "./GameAvailability";

export default function GameInfoDialog({
  game,
  onClose,
}: {
  game: Game;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (
      !returnFocusRef.current &&
      document.activeElement instanceof HTMLElement
    )
      returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="game-info-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          event.currentTarget.close();
      }}
    >
      <div className="game-info-dialog__header">
        <span className="eyebrow">O grze · {game.category.name}</span>
        <button
          className="game-info-dialog__close"
          type="button"
          aria-label="Zamknij informacje o grze"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <h2 id={titleId}>{game.title}</h2>
      <GameGuide game={game} />
      {!game.gameplay && (
        <p className="game-info-dialog__description">
          {game.description || "Opis tej gry nie został jeszcze dodany."}
        </p>
      )}
      <dl className="game-info-dialog__facts">
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
      <GameAvailability game={game} />
    </dialog>,
    document.body,
  );
}
