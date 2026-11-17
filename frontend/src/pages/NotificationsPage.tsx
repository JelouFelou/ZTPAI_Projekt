import { useEffect, useState } from "react";
import { useAuth } from "../authContext";
import type { PaginatedNotifications } from "../api";
import { loanDate } from "../loanFormatting";
import Link from "../components/Link";
import "./NotificationsPage.css";

export default function NotificationsPage({ route }: { route: string }) {
  const { user, authorized } = useAuth();
  const userId = user?.id;
  const rawPage = Number(
    new URLSearchParams(route.split("?")[1] ?? "").get("page"),
  );
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 1_000_000
      ? rawPage
      : 1;
  const [retry, setRetry] = useState(0);
  const [request, setRequest] = useState<{
    key: string;
    data: PaginatedNotifications | null;
    error: string;
  } | null>(null);
  const requestKey = `${userId ?? ""}:${page}:${retry}`;
  const loading = request?.key !== requestKey;
  const result = loading ? null : request.data;
  const error = loading ? "" : request.error;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    authorized<PaginatedNotifications>(
      `/notifications/me?page=${page}&limit=10`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted)
          setRequest({ key: requestKey, data, error: "" });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setRequest({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Nie udało się pobrać powiadomień.",
          });
      });
    return () => controller.abort();
  }, [userId, authorized, page, requestKey]);

  if (!user)
    return (
      <main className="container notifications-page">
        <div className="state-card">
          <h1>Powiadomienia</h1>
          <p>
            Zaloguj się, aby zobaczyć powiadomienia o swoich wypożyczeniach.
          </p>
          <Link
            className="button button-primary"
            href="/login?next=%2Fnotifications"
          >
            Zaloguj się →
          </Link>
        </div>
      </main>
    );
  return (
    <main className="container notifications-page">
      <div className="notifications-heading">
        <div className="page-heading">
          <p className="eyebrow">BĄDŹ NA BIEŻĄCO</p>
          <h1>Powiadomienia</h1>
          <p>Potwierdzenia wypożyczeń i przypomnienia o zaległych grach.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={loading}
          onClick={() => setRetry((value) => value + 1)}
        >
          Odśwież
        </button>
      </div>
      {loading ? (
        <p className="notifications-loading" role="status">
          Ładowanie powiadomień…
        </p>
      ) : error ? (
        <div className="state-card" role="alert">
          <h2>Nie można pobrać powiadomień</h2>
          <p>{error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        result && (
          <>
            <div className="notifications-summary">
              <p>
                <strong>{result.pagination.total}</strong> powiadomień · od
                najnowszych
              </p>
              <Link href="/loans">Moje wypożyczenia →</Link>
            </div>
            {result.data.length ? (
              <>
                <div className="notifications-list">
                  {result.data.map((item) => (
                    <article
                      className={`notification-card ${item.type === "LOAN_OVERDUE_REMINDER" ? "notification-card--overdue" : ""}`}
                      key={item.id}
                    >
                      <div className="notification-card__meta">
                        <span className="notification-card__type">
                          {item.type === "LOAN_BORROWED"
                            ? "Potwierdzenie wypożyczenia"
                            : "Przypomnienie o zwrocie"}
                        </span>
                        <time dateTime={item.createdAt}>
                          {loanDate(item.createdAt)}
                        </time>
                      </div>
                      <p>{item.message}</p>
                    </article>
                  ))}
                </div>
                {result.pagination.totalPages > 1 && (
                  <nav className="pagination" aria-label="Strony powiadomień">
                    <Link
                      className="page-link"
                      href={`/notifications?page=${page - 1}`}
                      aria-disabled={page <= 1}
                      tabIndex={page <= 1 ? -1 : undefined}
                    >
                      ← Poprzednia
                    </Link>
                    <span>
                      Strona {page} z {result.pagination.totalPages}
                    </span>
                    <Link
                      className="page-link"
                      href={`/notifications?page=${page + 1}`}
                      aria-disabled={page >= result.pagination.totalPages}
                      tabIndex={
                        page >= result.pagination.totalPages ? -1 : undefined
                      }
                    >
                      Następna →
                    </Link>
                  </nav>
                )}
              </>
            ) : (
              <div className="state-card">
                <h2>
                  {result.pagination.total > 0
                    ? "Ta strona powiadomień jest pusta"
                    : "Nie masz jeszcze powiadomień"}
                </h2>
                <p>
                  {result.pagination.total > 0
                    ? "Wróć na początek listy, aby zobaczyć swoje powiadomienia."
                    : "Po wypożyczeniu gry pojawi się tutaj potwierdzenie z terminem zwrotu."}
                </p>
                <Link
                  className="button button-secondary"
                  href={
                    result.pagination.total > 0 ? "/notifications" : "/games"
                  }
                >
                  {result.pagination.total > 0
                    ? "Pierwsza strona"
                    : "Przeglądaj katalog →"}
                </Link>
              </div>
            )}
          </>
        )
      )}
    </main>
  );
}
