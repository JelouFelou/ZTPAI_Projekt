# BoardRent backend

NestJS REST API z PostgreSQL i Prisma. Pełny opis funkcji, ról, reguł i konfiguracji Compose: [README projektu](../README.md). Poniżej opis endpointów, modelu danych i testów. Pełny kontrakt HTTP z przykładami pól i odpowiedzi jest dostępny w Swaggerze uruchomionej aplikacji.

## Praca lokalna

Wymagany Node.js 22.18+ lub 24, npm i działający PostgreSQL 17. W katalogu głównym skopiuj `backend/.env.example` do nieśledzonego `backend/.env`, jeśli jeszcze nie istnieje. Ustaw `DATABASE_URL` i własny losowy `AUTH_JWT_SECRET` (minimum 32 bajty). Nie nadpisuj istniejącej konfiguracji.

Jeśli chcesz użyć bazy z Compose, wykonaj najpierw w katalogu głównym:

```powershell
docker compose --env-file backend/.env up -d db --wait
```

Przy własnym PostgreSQL pomiń ten krok. `DATABASE_URL` musi odpowiadać rzeczywistemu użytkownikowi, hasłu, nazwie bazy i portowi hosta. Do równoczesnego uruchomienia lokalnego API port 3000 musi być wolny; zatrzymaj backend z pełnego Compose, jeśli wcześniej go uruchomiono.

Z katalogu `backend`:

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:deploy
$env:TZ = 'Europe/Warsaw'
npm.cmd run start:dev
```

`db:deploy` stosuje istniejące migracje bez tworzenia nowych. `db:migrate` służy pracy nad nowymi zmianami schematu; nie jest wymagane do zwykłego uruchomienia. `db push` nie odtwarza częściowych indeksów SQL. API: http://localhost:3000/api, Swagger: http://localhost:3000/api/docs, OpenAPI: `/api/docs-json` i `/api/docs-yaml`. Opcjonalna zmienna PORT zmienia port (domyślnie 3000).

## Skrypty i struktura

| Skrypt npm | Zadanie |
| --- | --- |
| start:dev / start:debug | Obserwowanie plików / debugger. |
| build / start:prod | Kompilacja / uruchomienie `dist/main.js`. |
| db:generate | Generowanie Prisma Client. |
| db:deploy / db:migrate | Stosowanie migracji / praca nad nowymi migracjami. |
| db:seed-demo | 14 fikcyjnych gier i kopie; uzupełnia brakujące poradniki, nie dubluje istniejących wpisów. |
| db:create-admin | Nowy ADMIN z lokalnych zmiennych ADMIN_*. |
| test / test:e2e / test:db | Jednostkowe / HTTP z atrapą bazy / prawdziwy PostgreSQL. |
| lint | Analiza kodu, również typów. |

`src/main.ts` i `app.module.ts`: start aplikacji; `common/`: konfiguracja API, Swagger, walidacja, błędy i request ID; `auth/`: JWT, Argon2id i role; `categories/`, `games/`, `game-copies/`: katalog; `loans/`: transakcyjna logika wypożyczania i zwrotów; `notifications/`: zdarzenia i scheduler; `prisma/`: serwis bazy; `prisma/schema.prisma` i migracje: model i SQL; `test/`: testy HTTP oraz integracyjne PostgreSQL.

## Administrator

Po migracjach dodaj do lokalnego `backend/.env` ADMIN_EMAIL, ADMIN_PASSWORD (12–128 znaków), ADMIN_FIRST_NAME i ADMIN_LAST_NAME (1–100 znaków). W `backend` uruchom `npm.cmd run db:create-admin`. Istniejącego konta skrypt nie zmienia i nie nadaje mu nowej roli. Usuń potem ADMIN_PASSWORD z pliku. Nie publikuj danych logowania.

Publiczna rejestracja przyjmuje hasło 8–128 znaków i tworzy USER. Oba rodzaje haseł używają Argon2id. JWT nowych sesji nie ma limitu czasowego. Konto i rola są ponownie sprawdzane w bazie przy chronionym żądaniu.

## REST API

Wszystkie poniższe ścieżki mają prefiks `/api`. JSON wysyłaj z `Content-Type: application/json`. Chronione operacje wymagają `Authorization: Bearer <accessToken>`; token otrzymasz przez logowanie. W Swaggerze użyj Authorize i wklej sam token. JWT oznacza dostęp USER i ADMIN, a ADMIN wymaga tej roli.

| Endpoint | Dostęp i wynik |
| --- | --- |
| `POST /auth/register` | Publiczny; email, password, firstName, lastName; 201 z profilem USER. Rola przesłana przez klienta jest odrzucana. |
| `POST /auth/login` | Publiczny; email i password; 200 z accessToken, tokenType Bearer, expiresIn null i profilem. |
| `GET /auth/me`, `GET /auth/verify` | JWT; własny profil albo potwierdzenie ważności tokenu. |
| `GET /categories`, `GET /categories/:id` | Publiczny; tablica kategorii albo pojedyncza kategoria. |
| `GET /games`, `GET /games/:id` | Publiczny; stronicowana lista albo gra z kategorią, dostępnością i planowanymi zwrotami. |
| `GET /game-copies`, `GET /game-copies/:id` | Publiczny; tablica albo pojedynczy fizyczny egzemplarz z wyliczoną dostępnością. |
| `POST`, `PATCH /:id`, `DELETE /:id` dla categories/games/game-copies | ADMIN; odpowiednio 201, 200 i 204. POST wykonuje się na ścieżce kolekcji, bez ID. |
| `GET /loans/policy` | Publiczny; durationDays 14, maxActiveLoans 1. |
| `POST /loans` | JWT; body zawiera tylko gameCopyId; 201 z nowym własnym ACTIVE i terminem zwrotu. |
| `GET /loans/me` | JWT; własne wypożyczenia z paginacją. |
| `GET /loans` | ADMIN; historia wszystkich z podstawowymi danymi wypożyczającego. |
| `PATCH /loans/:id/return` | JWT i właściciel wypożyczenia; bez body; 200 z RETURNED i datą zwrotu. |
| `GET /notifications/me` | JWT; wyłącznie własne powiadomienia z paginacją. |

Publiczny `GET /api` zwraca tekst `Hello World!`; potwierdza działanie HTTP, nie połączenie z bazą. Katalog sprawdzisz przez `GET /api/games?limit=1`. Swagger: `/api/docs`, OpenAPI JSON: `/api/docs-json`, YAML: `/api/docs-yaml`.

Gry przyjmują `q` (tytuł lub opis, bez rozróżniania wielkości liter, do 200 znaków) i `categoryId` (UUID). Gry, wypożyczenia i powiadomienia przyjmują `page` 1–1000000 oraz `limit` 1–100, domyślnie 1 i 20. Odpowiedź: `{ data: [...], pagination: { page, limit, total, totalPages } }`. Kategorie i egzemplarze zwracają zwykłe tablice.

Historia obsługuje `status=ACTIVE|RETURNED`; lista ADMIN dodatkowo `userId` i `overdue=true|false`. `true` wybiera aktywne po terminie, `false` aktywne jeszcze w terminie. Filtra overdue nie można łączyć ze statusem RETURNED. Własna historia i powiadomienia nie przyjmują userId. Przykłady: `/api/games?q=szach&page=1&limit=20`, `/api/loans/me?status=RETURNED`, `/api/loans?overdue=true`.

UUID, body i parametry z DTO są walidowane; nieznane pola DTO są odrzucane. Błędy mają format `{ error: { code, message, details?, requestId } }` i nagłówek X-Request-Id. Najważniejsze statusy: 400 — walidacja, 401 — brak lub nieprawidłowe uwierzytelnienie, 403 — brak roli, 404 — brak zasobu lub cudze wypożyczenie przy zwrocie, 409 — konflikt reguł/unikalności/relacji, 500 — błąd wewnętrzny, 503 — niedostępność rozpoczęcia transakcji. Odpowiedzi 5xx ukrywają szczegóły błędu. Dane kont nie zawierają hasła ani jego hashu. API nie ma endpointu logout ani odświeżania tokenu.

## Model danych

[Schemat Prisma](prisma/schema.prisma) definiuje sześć encji:

- User — konto USER/ADMIN; unikalny e-mail i hash hasła.
- Category — kategoria o unikalnej nazwie; zawiera wiele gier.
- Game — tytuł, opis, parametry rozgrywki i poradnik; należy do jednej kategorii i ma wiele egzemplarzy.
- GameCopy — fizyczny egzemplarz z unikalnym inventoryCode i statusem AVAILABLE/MAINTENANCE/RETIRED; należy do jednej gry.
- Loan — powiązanie użytkownika z egzemplarzem, status ACTIVE/RETURNED oraz daty odbioru, terminu i oddania. Użytkownik i kopia mogą mieć wiele wpisów historycznych.
- Notification — wiadomość należąca do jednego użytkownika i jednego wypożyczenia; unikalna para (loanId,type).

Klucze główne i obce są UUID, daty mają typ timestamptz(3). FK z Restrict chronią przed usunięciem używanych rekordów. [Migracje](prisma/migrations) dodają również dwa częściowe indeksy UNIQUE na loans(user_id) i loans(game_copy_id), oba tylko WHERE status = 'ACTIVE'. Nie są odwzorowane jako unikalności modeli Prisma; dlatego stosuj pełne migracje. Liczby dostępnych/wypożyczonych kopii i planowane zwroty są wyliczane, nie są dodatkowymi tabelami.

## Wypożyczenia, zdarzenia i przypomnienia

Jedno ACTIVE na użytkownika, okres 14 dni. Odbiór od razu zapisuje ACTIVE, bez rezerwacji i zatwierdzania przez administratora. Zwrot tylko własnego wypożyczenia, również dla ADMIN. Serializable z maksymalnie trzema próbami i częściowe indeksy chronią limit i dostępność; RepeatableRead zapewnia spójny licznik i strony historii/powiadomień. Ponowny zwrot daje 409; zmiana gry egzemplarza z historią również daje 409. Dokładne reguły opisano w [README projektu](../README.md#reguły-biznesowe).

Po zatwierdzeniu transakcji zdarzenie LOAN_BORROWED uruchamia asynchroniczny zapis potwierdzenia. Zdarzenia są w pamięci procesu: awaria pomiędzy zapisem wypożyczenia a listenerem może zgubić potwierdzenie. Błąd listenera jest logowany; nie cofa zatwierdzonego wypożyczenia.

Scheduler sprawdza ACTIVE z dueAt < teraz na starcie i codziennie o 9:00 **w strefie procesu**. Kontener ustawia Europe/Warsaw; dla ręcznego uruchomienia ustaw TZ przed startem. Tworzy LOAN_OVERDUE_REMINDER, a UNIQUE(loanId,type) i createMany(skipDuplicates) zapobiegają duplikatom nawet przy równoległych przebiegach. To jedno przypomnienie danego typu na wypożyczenie, nie nowy wpis codziennie.

`GET /api/notifications/me` udostępnia własne wpisy USER i ADMIN, z paginacją. Starsze angielskie wiadomości są lokalizowane przy odczycie na podstawie własnego wypożyczenia. Brak e-maili, WebSocketów oraz stanu przeczytania.

## Testy

Przed buildem zatrzymaj lokalny watcher API (`dev.cmd stop` z katalogu głównego), ponieważ korzysta z tego samego `dist`. Po kontrolach możesz ponownie uruchomić `dev.cmd`.

W katalogu `backend`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
```

Zestaw HTTP używa atrapy Prisma — nie jest dowodem zachowania prawdziwych transakcji. Testy jednostkowe sprawdzają również scheduler i obsługę zdarzeń.

## Testy PostgreSQL

Utwórz **oddzielną, pustą bazę** `boardrent_test` (np. przez psql lub administratora PostgreSQL). Dla domyślnej lokalnej konfiguracji Compose, z katalogu głównego:

```powershell
docker compose --env-file backend/.env exec db psql -U boardrent -d postgres -c "CREATE DATABASE boardrent_test;"
```

Przy innym POSTGRES_USER dostosuj nazwę użytkownika. Jeśli baza testowa już istnieje, pomiń CREATE DATABASE po upewnieniu się, że to osobna baza przeznaczona na testy. Nie używaj istniejącej bazy aplikacji; nie usuwaj jej danych. Następnie w katalogu `backend` ustaw TEST_DATABASE_URL na URL nowej bazy. Poniższy URL odpowiada wyłącznie publicznym, lokalnym ustawieniom `.env.example`; przy własnej konfiguracji dostosuj dane i zakoduj znaki specjalne hasła w URL:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://boardrent:boardrent-local@localhost:5432/boardrent_test?schema=public'
if (!$env:TEST_DATABASE_URL) { throw 'Ustaw URL osobnej bazy testowej' }
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  npm.cmd run db:deploy
  if ($LASTEXITCODE -ne 0) { throw 'Migracje bazy testowej nie powiodły się' }
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}
npm.cmd run test:db
```

Testy wymagają jawnego TEST_DATABASE_URL i nie przechodzą automatycznie na DATABASE_URL. Odpowiedzialność za wskazanie osobnej bazy pozostaje po stronie uruchamiającego. Tworzą własne rekordy i sprzątają je po przypadkach; obejmują równoczesne wypożyczenia/zwroty, ochronę historii, indeksy, powiadomienia i walidację administratora. Wyniki wypisuje Vitest. Instrukcja nie wymaga czyszczenia ani usuwania bazy aplikacji.
