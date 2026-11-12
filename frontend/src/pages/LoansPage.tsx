import { useEffect, useState } from "react";
import { useAuth } from "../authContext";
import type { Loan, PaginatedLoans } from "../api";
import Link from "../components/Link";
import { navigate } from "../navigation";

const date = (value: string) =>
  new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
    new Date(value),
  );

export default function LoansPage({ route }: { route: string }) {
  const { user, authorized } = useAuth();
  const userId = user?.id;
  const params = new URLSearchParams(route.split("?")[1] ?? "");
  const requestedPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const [request, setRequest] = useState<{
    page: number;
    data: PaginatedLoans | null;
    error: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [returning, setReturning] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState(
    params.has("new") ? "Gra została wypożyczona." : "",
  );
  const loading = request?.page !== page || (!request.data && !request.error);
  const data = !loading ? request?.data : null;
  const error = !loading ? request?.error : "";

  function reload() {
    setRefresh((value) => value + 1);
  }
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    authorized<PaginatedLoans>(`/loans/me?page=${page}&limit=10`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setNow(Date.now());
          setRequest({ page, data: result, error: "" });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setRequest({
            page,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać wypożyczeń.",
          });
      });
    return () => controller.abort();
  }, [userId, authorized, page, refresh]);

  async function returnLoan(loan: Loan) {
    if (
      returning ||
      !window.confirm(`Potwierdzasz zwrot gry „${loan.gameCopy.game.title}”?`)
    )
      return;
    setReturning(loan.id);
    setActionError("");
    setSuccess("");
    try {
      await authorized(`/loans/${loan.id}/return`, { method: "PATCH" });
      setSuccess("Zwrot został zapisany.");
      reload();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Nie udało się zwrócić gry.",
      );
      reload();
    } finally {
      setReturning(null);
    }
  }

  if (!user)
    return (
      <main className="container loans-page">
        <div className="state-card">
          <h1>Twoje wypożyczenia</h1>
          <p>Zaloguj się, aby zobaczyć historię i zwracać gry.</p>
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
        <p>Sprawdzaj terminy zwrotów i historię swoich gier.</p>
      </div>
      {success && (
        <p className="notice" role="status">
          {success}
        </p>
      )}
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
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
      {loading && <p role="status">Ładowanie wypożyczeń…</p>}
      {data &&
        (data.data.length ? (
          <>
            <div className="loan-list">
              {data.data.map((loan) => {
                const overdue =
                  loan.status === "ACTIVE" &&
                  new Date(loan.dueAt).getTime() < now;
                return (
                  <article className="loan-card" key={loan.id}>
                    <div>
                      <span
                        className={`loan-status ${overdue ? "loan-status--overdue" : ""}`}
                      >
                        {loan.status === "RETURNED"
                          ? "Zwrócona"
                          : overdue
                            ? "Po terminie"
                            : "Wypożyczona"}
                      </span>
                      <h2>
                        <Link href={`/games/${loan.gameCopy.game.id}`}>
                          {loan.gameCopy.game.title}
                        </Link>
                      </h2>
                      <p>Egzemplarz {loan.gameCopy.inventoryCode}</p>
                    </div>
                    <div className="loan-dates">
                      <span>
                        Wypożyczono <strong>{date(loan.borrowedAt)}</strong>
                      </span>
                      <span>
                        Termin zwrotu <strong>{date(loan.dueAt)}</strong>
                      </span>
                      {loan.returnedAt && (
                        <span>
                          Zwrócono <strong>{date(loan.returnedAt)}</strong>
                        </span>
                      )}
                    </div>
                    {loan.status === "ACTIVE" && (
                      <button
                        className="button button-secondary"
                        disabled={returning !== null}
                        onClick={() => returnLoan(loan)}
                      >
                        {returning === loan.id ? "Zapisywanie…" : "Zwróć grę"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {data.pagination.totalPages > 1 && (
              <nav className="pagination" aria-label="Strony wypożyczeń">
                <Link
                  className="page-link"
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                  href={`/loans?page=${page - 1}`}
                >
                  ← Poprzednia
                </Link>
                <span>
                  Strona {page} z {data.pagination.totalPages}
                </span>
                <Link
                  className="page-link"
                  aria-disabled={page >= data.pagination.totalPages}
                  tabIndex={page >= data.pagination.totalPages ? -1 : undefined}
                  href={`/loans?page=${page + 1}`}
                >
                  Następna →
                </Link>
              </nav>
            )}
          </>
        ) : (
          <div className="state-card">
            <h2>Jeszcze nic tu nie ma</h2>
            <p>Wybierz grę z katalogu i rozpocznij swoją przygodę.</p>
            <Link className="button button-primary" href="/games">
              Przeglądaj gry →
            </Link>
          </div>
        ))}
      {data &&
        data.pagination.total > 0 &&
        page > data.pagination.totalPages && (
          <button
            className="button button-secondary"
            onClick={() => navigate("/loans")}
          >
            Pierwsza strona
          </button>
        )}
    </main>
  );
}
