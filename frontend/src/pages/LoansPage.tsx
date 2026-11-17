import { useEffect, useState } from "react";
import { useAuth } from "../authContext";
import type { Loan, PaginatedLoans } from "../api";
import Link from "../components/Link";
import ActionDialog from "../components/ActionDialog";
import { loanDate, timeToReturn } from "../loanFormatting";

function downloadReceipt(loan: Loan, borrower: string) {
  const text = [
    "BoardRent — potwierdzenie odbioru i wypożyczenia",
    `Numer: ${loan.id}`,
    `Wypożyczający: ${borrower}`,
    `Gra: ${loan.gameCopy.game.title}`,
    `Egzemplarz: ${loan.gameCopy.inventoryCode}`,
    `Odebrano: ${loanDate(loan.borrowedAt)}`,
    `Zwrot do: ${loanDate(loan.dueAt)} (czas polski)`,
    loan.returnedAt
      ? `Oddano: ${loanDate(loan.returnedAt)}`
      : "Status: aktywne wypożyczenie",
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `BoardRent-${loan.id}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LoansPage({ route }: { route: string }) {
  const { user, authorized } = useAuth();
  const userId = user?.id;
  const params = new URLSearchParams(route.split("?")[1] ?? "");
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 1_000_000
      ? requestedPage
      : 1;
  const [request, setRequest] = useState<{
    key: string;
    history: PaginatedLoans | null;
    active: Loan | null;
    error: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [returning, setReturning] = useState(false);
  const [returnTarget, setReturnTarget] = useState<Loan | null>(null);
  const [returnedComplete, setReturnedComplete] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [actionError, setActionError] = useState("");
  const [returnedLoan, setReturnedLoan] = useState<Loan | null>(null);
  const requestKey = `${userId ?? ""}:${page}:${refresh}`;
  const loading = request?.key !== requestKey;
  const history = !loading ? request?.history : null;
  const active = !loading ? request?.active : null;
  const error = !loading ? request?.error : "";
  const newlyBorrowed = !!active && params.get("new") === active.id;
  const overdue = !!active && new Date(active.dueAt).getTime() < now;

  function reload() {
    setRefresh((value) => value + 1);
  }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    Promise.all([
      authorized<PaginatedLoans>("/loans/me?status=ACTIVE&limit=1", {
        signal: controller.signal,
      }),
      authorized<PaginatedLoans>(
        `/loans/me?status=RETURNED&page=${page}&limit=10`,
        { signal: controller.signal },
      ),
    ])
      .then(([current, previous]) => {
        if (!controller.signal.aborted) {
          setNow(Date.now());
          setRequest({
            key: requestKey,
            history: previous,
            active: current.data[0] ?? null,
            error: "",
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setRequest({
            key: requestKey,
            history: null,
            active: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać wypożyczeń.",
          });
      });
    return () => controller.abort();
  }, [userId, authorized, page, requestKey]);

  async function returnLoan() {
    if (!returnTarget || returning || !returnedComplete) return;
    setReturning(true);
    setActionError("");
    try {
      const result = await authorized<Loan>(
        `/loans/${returnTarget.id}/return`,
        { method: "PATCH" },
      );
      setReturnedLoan(result);
      setReturnTarget(null);
      reload();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Nie udało się zapisać zwrotu.",
      );
      reload();
    } finally {
      setReturning(false);
    }
  }

  if (!user)
    return (
      <main className="container loans-page">
        <div className="state-card">
          <h1>Twoje wypożyczenia</h1>
          <p>
            Zaloguj się, aby sprawdzić termin zwrotu i zarządzać wypożyczoną
            grą.
          </p>
          <Link className="button button-primary" href="/login?next=%2Floans">
            Zaloguj się →
          </Link>
        </div>
      </main>
    );
  return (
    <main className="container loans-page">
      <div className="page-heading">
        <p className="eyebrow">TWOJA PÓŁKA</p>
        <h1>Moje wypożyczenia</h1>
        <p>
          Twoja gra, termin oddania i potwierdzenie zwrotu — wszystko w jednym
          miejscu.
        </p>
      </div>
      {newlyBorrowed && (
        <p className="notice" role="status">
          Odbiór potwierdzony. Egzemplarz {active.gameCopy.inventoryCode} jest
          przypisany do Ciebie. Zwróć go do {loanDate(active.dueAt)}.
        </p>
      )}
      {returnedLoan && (
        <p className="notice" role="status">
          Oddanie gry „{returnedLoan.gameCopy.game.title}” zapisane{" "}
          {loanDate(returnedLoan.returnedAt!)}. Możesz wypożyczyć kolejną grę.
        </p>
      )}
      {error && (
        <div className="state-card" role="alert">
          <h2>Nie można pobrać wypożyczeń</h2>
          <p>{error}</p>
          <button className="button button-secondary" onClick={reload}>
            Spróbuj ponownie
          </button>
        </div>
      )}
      {loading && <p role="status">Sprawdzanie Twoich wypożyczeń…</p>}
      {!loading && !error && (
        <div className="loans-workspace">
          {active ? (
            <section
              className={`active-loan ${overdue ? "active-loan--overdue" : ""}`}
              aria-labelledby="active-loan-title"
            >
              <div className="active-loan__header">
                <span
                  className={`loan-status ${overdue ? "loan-status--overdue" : ""}`}
                >
                  {overdue ? "Po terminie" : "Aktualnie u Ciebie"}
                </span>
                <span className="active-loan__countdown">
                  {timeToReturn(active.dueAt, now)}
                </span>
              </div>
              <h2 id="active-loan-title">
                <Link href={`/games/${active.gameCopy.game.id}`}>
                  {active.gameCopy.game.title}
                </Link>
              </h2>
              <p className="active-loan__copy">
                Twój egzemplarz:{" "}
                <strong>{active.gameCopy.inventoryCode}</strong>
              </p>
              <dl className="active-loan__dates">
                <div>
                  <dt>Odbiór potwierdzony</dt>
                  <dd>{loanDate(active.borrowedAt)}</dd>
                </div>
                <div>
                  <dt>Zwróć najpóźniej</dt>
                  <dd>{loanDate(active.dueAt)}</dd>
                </div>
              </dl>
              <p className="loan-explanation">
                {overdue
                  ? "Termin zwrotu minął. Oddaj kompletny egzemplarz i potwierdź zwrot poniżej. Do tego czasu nie możesz wypożyczyć kolejnej gry."
                  : "Zwróć kompletny egzemplarz przed terminem. Po oddaniu gry zapisz zwrot tutaj — wtedy możesz wypożyczyć następny tytuł."}
              </p>
              <div className="active-loan__actions">
                <button
                  className="button button-primary"
                  onClick={() => {
                    setActionError("");
                    setReturnedComplete(false);
                    setReturnTarget(active);
                  }}
                >
                  Oddaj grę
                </button>
                <button
                  className="loan-receipt-link"
                  onClick={() =>
                    downloadReceipt(
                      active,
                      `${user.firstName} ${user.lastName}`,
                    )
                  }
                >
                  Pobierz potwierdzenie ↓
                </button>
              </div>
              <details className="loan-reference">
                <summary>Numer wypożyczenia</summary>
                <code>{active.id}</code>
              </details>
            </section>
          ) : (
            <section className="state-card loans-no-active">
              <h2>Nie masz teraz wypożyczonej gry</h2>
              <p>
                Wybierz tytuł, sprawdź podsumowanie i potwierdź wypożyczenie.
                Termin zwrotu pojawi się tutaj.
              </p>
              <Link className="button button-primary" href="/games">
                Wybierz grę →
              </Link>
            </section>
          )}
          <section
            className="loan-history"
            aria-labelledby="loan-history-title"
          >
            <h2 id="loan-history-title">Zakończone wypożyczenia</h2>
            {history?.data.length ? (
              <>
                <div className="loan-list">
                  {history.data.map((loan) => (
                    <article
                      className="loan-card loan-card--history"
                      key={loan.id}
                    >
                      <div>
                        <span className="loan-status loan-status--returned">
                          Zwrócona
                        </span>
                        <h3>
                          <Link href={`/games/${loan.gameCopy.game.id}`}>
                            {loan.gameCopy.game.title}
                          </Link>
                        </h3>
                        <p>Egzemplarz {loan.gameCopy.inventoryCode}</p>
                      </div>
                      <div className="loan-dates">
                        <span>
                          Wypożyczono{" "}
                          <strong>{loanDate(loan.borrowedAt)}</strong>
                        </span>
                        <span>
                          Zwrócono{" "}
                          <strong>
                            {loan.returnedAt ? loanDate(loan.returnedAt) : "—"}
                          </strong>
                        </span>
                      </div>
                      <button
                        className="loan-receipt-link"
                        onClick={() =>
                          downloadReceipt(
                            loan,
                            `${user.firstName} ${user.lastName}`,
                          )
                        }
                      >
                        Potwierdzenie ↓
                      </button>
                    </article>
                  ))}
                </div>
                {history.pagination.totalPages > 1 && (
                  <nav
                    className="pagination"
                    aria-label="Strony historii wypożyczeń"
                  >
                    <Link
                      className="page-link"
                      aria-disabled={page <= 1}
                      tabIndex={page <= 1 ? -1 : undefined}
                      href={`/loans?page=${page - 1}`}
                    >
                      ← Poprzednia
                    </Link>
                    <span>
                      Strona {page} z {history.pagination.totalPages}
                    </span>
                    <Link
                      className="page-link"
                      aria-disabled={page >= history.pagination.totalPages}
                      tabIndex={
                        page >= history.pagination.totalPages ? -1 : undefined
                      }
                      href={`/loans?page=${page + 1}`}
                    >
                      Następna →
                    </Link>
                  </nav>
                )}
              </>
            ) : (
              <p className="loan-history__empty">
                {page > 1 && (history?.pagination.total ?? 0) > 0 ? (
                  <Link href="/loans">Wróć na pierwszą stronę historii →</Link>
                ) : (
                  "Po zwrocie pierwszej gry znajdziesz tutaj potwierdzenie i historię."
                )}
              </p>
            )}
          </section>
        </div>
      )}
      {returnTarget && (
        <ActionDialog
          title="Oddaj egzemplarz i zakończ wypożyczenie"
          busy={returning}
          onClose={() => {
            if (!returning) setReturnTarget(null);
          }}
        >
          <p className="action-dialog__lead">
            {returnTarget.gameCopy.game.title}
          </p>
          <p className="loan-explanation">
            Oddajesz egzemplarz {returnTarget.gameCopy.inventoryCode}. Czas
            potwierdzenia zostanie zapisany jako moment zwrotu. Potwierdź
            dopiero po oddaniu kompletnej gry.
          </p>
          <label className="loan-agreement">
            <input
              type="checkbox"
              checked={returnedComplete}
              disabled={returning}
              onChange={(event) => setReturnedComplete(event.target.checked)}
            />
            <span>
              Oddałem/am właściwy egzemplarz wraz ze wszystkimi elementami gry.
            </span>
          </label>
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          <div className="action-dialog__actions">
            <button
              className="button button-primary"
              disabled={returning || !returnedComplete}
              onClick={() => void returnLoan()}
            >
              {returning ? "Zapisywanie oddania…" : "Potwierdzam oddanie"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={returning}
              onClick={() => setReturnTarget(null)}
            >
              Jeszcze nie oddałem/am
            </button>
          </div>
        </ActionDialog>
      )}
    </main>
  );
}
