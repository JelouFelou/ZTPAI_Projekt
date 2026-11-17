import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import type { Game, GameCopy, Loan, LoanPolicy, PaginatedLoans } from "../api";
import { useAuth } from "../authContext";
import { navigate } from "../navigation";
import { loanDate } from "../loanFormatting";
import Link from "./Link";
import ActionDialog from "./ActionDialog";

export default function BorrowAction({ game }: { game: Game }) {
  const { user, authorized } = useAuth();
  const [availability, setAvailability] = useState<{
    copy: GameCopy | null;
    active: Loan | null;
    policy: LoanPolicy;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [expectedDueAt, setExpectedDueAt] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    Promise.all([
      apiRequest<GameCopy[]>("/game-copies", { signal: controller.signal }),
      authorized<PaginatedLoans>("/loans/me?status=ACTIVE&limit=1", {
        signal: controller.signal,
      }),
      apiRequest<LoanPolicy>("/loans/policy", { signal: controller.signal }),
    ])
      .then(([copies, loans, policy]) => {
        if (!controller.signal.aborted)
          setAvailability({
            copy:
              copies
                .filter((copy) => copy.gameId === game.id && copy.isAvailable)
                .sort((a, b) =>
                  a.inventoryCode.localeCompare(b.inventoryCode),
                )[0] ?? null,
            active: loans.data[0] ?? null,
            policy,
          });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Nie udało się sprawdzić możliwości wypożyczenia.",
          );
      });
    return () => controller.abort();
  }, [game.id, user, authorized, refresh]);

  function checkAgain() {
    setError("");
    setAvailability(null);
    setRefresh((value) => value + 1);
  }

  async function borrow() {
    const copy = availability?.copy;
    if (!copy || busy || !accepted) return;
    setBusy(true);
    setError("");
    try {
      const loan = await authorized<Loan>("/loans", {
        method: "POST",
        body: { gameCopyId: copy.id },
      });
      navigate(`/loans?new=${encodeURIComponent(loan.id)}`);
    } catch (cause) {
      setConfirming(false);
      setAccepted(false);
      setAvailability(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Nie udało się wypożyczyć gry.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!user)
    return game.availableCopies > 0 ? (
      <Link
        className="button button-primary borrow-button"
        href={`/login?next=${encodeURIComponent(`/games/${game.id}`)}`}
      >
        Zaloguj się, aby wypożyczyć →
      </Link>
    ) : null;
  if (availability?.active)
    return (
      <div className="borrow-summary">
        <strong>Masz już wypożyczoną grę</strong>
        <p>
          {availability.active.gameCopy.game.title}
          <br />
          Zwrot do {loanDate(availability.active.dueAt)}
        </p>
        <Link className="button button-secondary" href="/loans">
          Przejdź do mojego wypożyczenia →
        </Link>
        <small>Najpierw zwróć obecną grę, aby wypożyczyć kolejną.</small>
      </div>
    );
  return (
    <div className="borrow-area">
      {error && (
        <>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button
            className="button button-secondary"
            type="button"
            onClick={checkAgain}
          >
            Sprawdź ponownie
          </button>
          <Link href="/loans">Moje wypożyczenia →</Link>
        </>
      )}
      {!error && (
        <>
          <button
            className="button button-primary borrow-button"
            type="button"
            disabled={!availability?.copy}
            onClick={() => {
              setAccepted(false);
              setExpectedDueAt(
                new Date(
                  Date.now() + availability!.policy.durationDays * 86400000,
                ).toISOString(),
              );
              setConfirming(true);
            }}
          >
            {!availability
              ? "Sprawdzanie możliwości wypożyczenia…"
              : availability.copy
                ? "Wypożycz grę →"
                : "Brak wolnego egzemplarza"}
          </button>
          {availability?.copy && (
            <small>
              {availability.policy.durationDays} dni na grę. Przed wypożyczeniem
              potwierdzisz odbiór egzemplarza.
            </small>
          )}
        </>
      )}
      {confirming && availability?.copy && (
        <ActionDialog
          title="Odbierz grę i rozpocznij wypożyczenie"
          busy={busy}
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
        >
          <p className="action-dialog__lead">{game.title}</p>
          <dl className="loan-checkout-facts">
            <div>
              <dt>Twój egzemplarz</dt>
              <dd>{availability.copy.inventoryCode}</dd>
            </div>
            <div>
              <dt>Okres wypożyczenia</dt>
              <dd>{availability.policy.durationDays} dni od odbioru</dd>
            </div>
            <div>
              <dt>Przewidywany termin zwrotu</dt>
              <dd>{loanDate(expectedDueAt)}</dd>
            </div>
            <div>
              <dt>Wypożyczający</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
            </div>
          </dl>
          <p className="loan-explanation">
            Po potwierdzeniu odbioru wypożyczenie od razu stanie się aktywne.
            Dokładny termin zwrotu i egzemplarz znajdziesz w „Moich
            wypożyczeniach”.
          </p>
          <label className="loan-agreement">
            <input
              type="checkbox"
              checked={accepted}
              disabled={busy}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              Odebrałem/am ten egzemplarz i sprawdziłem/am kompletność gry.
              Zwrócę ją w ciągu {availability.policy.durationDays} dni i zapiszę
              zwrot na swoim koncie.
            </span>
          </label>
          <div className="action-dialog__actions">
            <button
              className="button button-primary"
              type="button"
              disabled={busy || !accepted}
              onClick={() => void borrow()}
            >
              {busy
                ? "Zapisywanie odbioru…"
                : "Potwierdzam odbiór i wypożyczam"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Wróć do gry
            </button>
          </div>
        </ActionDialog>
      )}
    </div>
  );
}
