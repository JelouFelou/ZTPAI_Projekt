# BoardRent — weryfikacja poprawek audytowych

Data: 17 listopada 2026. Stan początkowy: `d8daf65` (czysty katalog roboczy).

## Wykonane zadania i commity

1. `dccbcd2` — `fix: improve game copy status display`
2. `99737a1` — `fix: clarify admin loan status filters`
3. `2fc036b` — `docs: align password requirements and validation`
4. `fab9c44` — `feat: add user notifications view`
5. `df714e0` — `docs: clarify business rules`
6. Raport końcowej regresji — commit `test: record audit regression results`.

## Zakres

- `isBorrowed` w odpowiedzi API pozwala niezależnie od technicznego statusu rozpoznać aktywne wypożyczenie. Panel administratora pokazuje wszystkie sześć kombinacji zgodnie z wymaganiami. Nie zmieniono znaczenia statusów w bazie.
- Filtry administratora to: Wszystkie, W terminie, Przeterminowane, Zwrócone. Dotychczasowa poprawna logika API (`ACTIVE` i `dueAt >= teraz` / `dueAt < teraz`) pozostała; zmieniono etykiety i ujednolicono daty na `Europe/Warsaw`.
- USER: 8–128 znaków, ADMIN tworzony skryptem: 12–128 znaków. Kod obu ścieżek już poprawnie używał Argon2id. Poprawiono przestarzały zapis w README, opis OpenAPI i dodano testy granic. Nie zmieniono istniejących haseł.
- `GET /api/notifications/me` wymaga zalogowania, pobiera właściciela z tokenu, kontroluje także właściciela powiązanego wypożyczenia, odrzuca selektory innych użytkowników i zwraca stronicowaną listę od najnowszych. DTO, walidacja, Swagger i standardowe błędy są dostępne.
- `/notifications`: nawigacja dla zalogowanych, typ, treść, polska data, paginacja, odświeżanie oraz stany ładowania, błędu i pustej listy. Starsze komunikaty zapisane po angielsku są lokalizowane przy odczycie, bez nadpisywania historii.
- Cztery reguły biznesowe opisano w głównym README z odnośnikami do implementacji i zabezpieczeń. Każda jest egzekwowana przez istniejący kod. Zaległość nie jest przedstawiana jako niezależna piąta reguła.

## Uruchomione kontrole

| Kontrola | Wynik |
| --- | --- |
| Backend: `npm.cmd run build` | PASS |
| Frontend: `npm.cmd run build` | PASS |
| Backend: `npm.cmd run lint` | PASS |
| Frontend: `npm.cmd run lint` | PASS |
| Backend: `npm.cmd test` | 34/34 PASS, 7 plików |
| Frontend: `npm.cmd test` | 8/8 PASS |
| Backend: `npm.cmd run test:e2e` | 78/78 PASS; prawdziwe HTTP z atrapą Prisma |
| Backend: `npm.cmd run test:db` | 22/22 PASS, 2 pliki, rzeczywisty PostgreSQL |
| Swagger UI `/api/docs` | HTTP 200 |
| Dokument `/api/docs-json` | Endpoint powiadomień, Bearer JWT, parametry i odpowiedzi zweryfikowane testem API i na uruchomionym serwerze |
| `git diff --check` | PASS |

Testy PostgreSQL uruchomiono na świeżej, oddzielnej bazie `boardrent_audit_test_<identyfikator>`, po zastosowaniu wszystkich pięciu istniejących migracji. Zweryfikowano zapis asynchroniczny, izolację użytkowników, paginację, współbieżne wypożyczenia, zwroty, limit konta, ochronę historii oraz deduplikację przypomnień przy dwóch równoczesnych uruchomieniach. Sprawdzono również skrypt administratora z hasłami 12 i 128 znaków, Argon2id i brak nadpisania istniejącego konta. Tymczasowa baza została usunięta. Testy nie korzystały z bazy aplikacji jako bazy testowej.

## Sprawdzenie w przeglądarce i na działającym API

Wykorzystano izolowany profil Chrome i tymczasowe konta/rekordy. Dane przygotowane do kontroli interfejsu zostały usunięte po testach.

- Sześć kombinacji statusu egzemplarza i wypożyczenia daje dokładnie oczekiwane etykiety.
- Cztery filtry panelu administratora i statusy wyników są zgodne z definicjami; USER dostaje 403 dla listy wypożyczeń administratora, ADMIN ma dostęp.
- Powiadomienia dwóch kont są odizolowane; ADMIN widzi własną listę. Próba `userId` w zapytaniu jest odrzucana. Widok anonimowy wymaga logowania.
- Potwierdzono rzeczywistą paginację 11 powiadomień (10 + 1), polską treść wcześniejszego przypomnienia, stan oczekiwania na odpowiedź, błąd serwera, ponowienie oraz pustą listę. Błąd i pusta odpowiedź były kontrolowanie zasymulowane wyłącznie w izolowanej przeglądarce.
- Brak poziomego przepełnienia nowego widoku i nawigacji dla USER i ADMIN przy szerokościach 320, 375, 768, 1024 i 1920 px; obejrzano zrzut widoku mobilnego.
- Potwierdzono anulowanie odbioru bez zapisu, faktyczne wypożyczenie z terminem 14 dni, zmianę liczby wypożyczonych kopii, blokadę kolejnego wypożyczenia w interfejsie, anulowanie zwrotu i zapis rzeczywistego zwrotu z przeniesieniem do historii.
- Faktyczne wypożyczenie wywołało zdarzenie asynchroniczne; jego powiadomienie pojawiło się w nowym API.
- Nowy token nie ma `exp`; test API weryfikuje go również z zegarem przesuniętym o rok. Ręczne wylogowanie usuwa sesję i przeładowuje stronę. Zachowano `sessionStorage`.

## Model bazy i zachowane założenia

Nie zmieniono `schema.prisma`, nie dodano migracji, encji ani statusów. `isBorrowed` to pole wyliczane w odpowiedzi API. Limit jednej aktywnej gry i 14-dniowy okres pozostają bez zmian. Nie dodano płatności, rezerwacji, e-maili, WebSocketów ani oznaczania powiadomień jako przeczytane. Nie rozpoczęto ERD ani filmu demonstracyjnego.

## Pozostałe ograniczenia

- Zdarzenia wypożyczenia są przetwarzane w pamięci procesu. Nagłe zakończenie procesu po zatwierdzeniu wypożyczenia, ale przed obsługą zdarzenia, może zgubić jego powiadomienie. To istniejące ograniczenie; architektura nie była przebudowywana.
- Harmonogram 9:00 korzysta ze strefy procesu. Docker ustawia `Europe/Warsaw`; konfiguracja uruchomienia bez Dockera powinna używać tej strefy. Daty w interfejsie i komunikatach mają ją ustawioną jawnie.
- Model User nie zawiera osobnej flagi dezaktywacji konta. Zachowano istniejącą weryfikację istnienia konta oraz zgodności tokenu z aktualnym adresem i rolą; usunięte konto i nieprawidłowe tokeny są odrzucane. Nie dodawano nowego mechanizmu dezaktywacji.
- Nie stwierdzono niepoprawnych reguł biznesowych ani błędów w zmienionych funkcjach po zakończeniu regresji.

## Zmienione pliki
- `README.md`
- `backend/README.md`
- `backend/src/auth/admin-password.spec.ts`
- `backend/src/auth/dto/register.dto.ts`
- `backend/src/game-copies/dto/game-copy-response.dto.ts`
- `backend/src/game-copies/game-copy.mapper.ts`
- `backend/src/notifications/dto/list-notifications-query.dto.ts`
- `backend/src/notifications/dto/notification-response.dto.ts`
- `backend/src/notifications/notification-message.ts`
- `backend/src/notifications/notifications.controller.ts`
- `backend/src/notifications/notifications.module.ts`
- `backend/src/notifications/notifications.service.spec.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/test/admin-password.db-spec.ts`
- `backend/test/app.e2e-spec.ts`
- `backend/test/borrowing.db-spec.ts`
- `frontend/README.md`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/gameCopyStatus.ts`
- `frontend/src/pages/AdminLoansPage.tsx`
- `frontend/src/pages/AdminPage.tsx`
- `frontend/src/pages/NotificationsPage.css`
- `frontend/src/pages/NotificationsPage.tsx`
- `frontend/tests/gameCopyStatus.test.mjs`
- `frontend/tests/loanFormatting.test.mjs`
- `docs/verification-2026-11-17.md` (ten raport)
