import { useEffect, useState } from "react";
import type { AdminLoan, AdminPaginatedLoans } from "../api";
import { useAuth } from "../authContext";
import AdminTabs from "../components/AdminTabs";
import Link from "../components/Link";
import { navigate } from "../navigation";

type Filter = "all" | "active" | "returned" | "overdue";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "active", label: "Aktywne" },
  { id: "returned", label: "Zwrócone" },
  { id: "overdue", label: "Przeterminowane" },
];
const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function date(value: string) {
  return dateTime.format(new Date(value));
}

function routeFor(filter: Filter, page: number) {
  const params = new URLSearchParams({ tab: "loans" });
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  return `/admin?${params}`;
}

function apiQuery(filter: Filter, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (filter === "active") {
    params.set("status", "ACTIVE");
    params.set("overdue", "false");
  } else if (filter === "returned") {
    params.set("status", "RETURNED");
  } else if (filter === "overdue") {
    params.set("overdue", "true");
  }
  return `/loans?${params}`;
}

function loanStatus(loan: AdminLoan, now: number) {
  if (loan.status === "RETURNED")
    return { text: "Zwrócone", className: "loan-status loan-status--returned" };
  if (new Date(loan.dueAt).getTime() < now)
    return {
      text: "Przeterminowane",
      className: "loan-status loan-status--overdue",
    };
  return { text: "Aktywne", className: "loan-status" };
}

export default function AdminLoansPage({ route }: { route: string }) {
  const { user, authorized } = useAuth();
  const params = new URLSearchParams(route.split("?")[1] ?? "");
  const rawFilter = params.get("filter");
  const filter: Filter =
    rawFilter === "active" ||
    rawFilter === "returned" ||
    rawFilter === "overdue"
      ? rawFilter
      : "all";
  const rawPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 1_000_000
      ? rawPage
      : 1;
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [request, setRequest] = useState<{
    key: string;
    data: AdminPaginatedLoans | null;
    error: string;
  } | null>(null);
  const requestKey = `${user?.id ?? ""}:${filter}:${page}:${retry}`;
  const loading = request?.key !== requestKey;
  const result = loading ? null : request.data;
  const error = loading ? "" : request.error;

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    const controller = new AbortController();
    authorized<AdminPaginatedLoans>(apiQuery(filter, page), {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setNow(Date.now());
        setRequest({ key: requestKey, data, error: "" });
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setRequest({
          key: requestKey,
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Nie udało się pobrać wypożyczeń.",
        });
      });
    return () => controller.abort();
  }, [authorized, filter, page, requestKey, user?.role]);

  return (
    <main className="container admin-page admin-loans-page">
      <div className="page-heading">
        <p className="eyebrow">MONITOROWANIE WYPOŻYCZEŃ</p>
        <h1>Wypożyczenia</h1>
        <p>Przeglądaj historię, sprawdzaj terminy zwrotu i zaległe gry.</p>
      </div>
      <AdminTabs current="loans" />
      <div className="admin-loan-filters" aria-label="Filtr wypożyczeń">
        {filters.map((item) => (
          <Link
            key={item.id}
            href={routeFor(item.id, 1)}
            className={filter === item.id ? "admin-loan-filters__active" : ""}
            aria-current={filter === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {loading && (
        <div className="admin-loan-state" role="status">
          Ładowanie wypożyczeń…
        </div>
      )}
      {error && (
        <div className="state-card" role="alert">
          <h2>Nie można pobrać wypożyczeń</h2>
          <p>{error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
      {result && (
        <>
          <div className="admin-loan-results" aria-live="polite">
            <strong>{result.pagination.total}</strong>{" "}
            {result.pagination.total === 1
              ? "wypożyczenie"
              : result.pagination.total > 1 && result.pagination.total < 5
                ? "wypożyczenia"
                : "wypożyczeń"}{" "}
            · {result.pagination.totalPages}{" "}
            {result.pagination.totalPages === 1
              ? "strona"
              : result.pagination.totalPages > 1 &&
                  result.pagination.totalPages < 5
                ? "strony"
                : "stron"}
          </div>
          {result.data.length ? (
            <div className="admin-loan-list">
              {result.data.map((loan) => {
                const status = loanStatus(loan, now);
                return (
                  <article className="admin-loan-card" key={loan.id}>
                    <div className="admin-loan-card__head">
                      <div>
                        <h2>
                          <Link href={`/games/${loan.gameCopy.game.id}`}>
                            {loan.gameCopy.game.title}
                          </Link>
                        </h2>
                        <p>
                          Egzemplarz:{" "}
                          <strong>{loan.gameCopy.inventoryCode}</strong>
                        </p>
                      </div>
                      <span className={status.className}>{status.text}</span>
                    </div>
                    <dl className="admin-loan-card__details">
                      <div>
                        <dt>Użytkownik</dt>
                        <dd>
                          {loan.user.firstName} {loan.user.lastName}
                        </dd>
                      </div>
                      <div>
                        <dt>E-mail</dt>
                        <dd>{loan.user.email}</dd>
                      </div>
                      <div>
                        <dt>Wypożyczono</dt>
                        <dd>{date(loan.borrowedAt)}</dd>
                      </div>
                      <div>
                        <dt>Planowany zwrot</dt>
                        <dd>{date(loan.dueAt)}</dd>
                      </div>
                      <div>
                        <dt>Faktyczny zwrot</dt>
                        <dd>{loan.returnedAt ? date(loan.returnedAt) : "—"}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="state-card admin-loan-empty">
              <h2>
                {result.pagination.total > 0
                  ? "Ta strona jest pusta"
                  : filter === "all"
                    ? "Brak wypożyczeń"
                    : "Brak wypożyczeń w tym filtrze"}
              </h2>
              <p>
                {result.pagination.total > 0
                  ? "Wróć na pierwszą stronę wyników."
                  : filter === "all"
                    ? "Gdy użytkownicy wypożyczą gry, pojawią się tutaj."
                    : "Wybierz inny filtr lub sprawdź ponownie później."}
              </p>
              {result.pagination.total > 0 ? (
                <Link
                  className="button button-secondary"
                  href={routeFor(filter, 1)}
                >
                  Pierwsza strona
                </Link>
              ) : filter !== "all" ? (
                <Link
                  className="button button-secondary"
                  href={routeFor("all", 1)}
                >
                  Pokaż wszystkie
                </Link>
              ) : null}
            </div>
          )}
          {result.pagination.totalPages > 1 && (
            <nav className="admin-loan-paging" aria-label="Strony wypożyczeń">
              <button
                className="button button-secondary"
                type="button"
                disabled={page <= 1}
                onClick={() => navigate(routeFor(filter, page - 1))}
              >
                ← Poprzednia
              </button>
              <span>
                Strona <strong>{page}</strong> z{" "}
                <strong>{result.pagination.totalPages}</strong>
              </span>
              <button
                className="button button-secondary"
                type="button"
                disabled={page >= result.pagination.totalPages}
                onClick={() => navigate(routeFor(filter, page + 1))}
              >
                Następna →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
