# BoardRent backend

REST API aplikacji BoardRent zbudowane w NestJS i TypeScript.

## Uruchomienie

Z katalogu `backend` skopiuj przykładową konfigurację i ustaw własny sekret JWT:

```powershell
npm ci
Copy-Item .env.example .env
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Wstaw wygenerowany ciąg jako `AUTH_JWT_SECRET` w `backend/.env`, a następnie uruchom PostgreSQL i API:

```powershell
Set-Location ..
docker compose up -d db
Set-Location backend
npm run db:generate
npm run db:migrate
npm run start:dev
```

API domyślnie nasłuchuje na porcie `3000`; można go zmienić zmienną `PORT`. Aplikacja nie uruchomi się z pustym lub krótszym niż 32 bajty sekretem. Wartości w `.env.example` są przeznaczone wyłącznie do lokalnego developmentu.

## Dostępne skrypty

- `npm run start` — uruchomienie aplikacji
- `npm run start:dev` — uruchomienie z obserwowaniem zmian
- `npm run start:debug` — uruchomienie w trybie debugowania
- `npm run build` — kompilacja aplikacji
- `npm run start:prod` — uruchomienie skompilowanej aplikacji
- `npm run db:generate` — generowanie Prisma Client
- `npm run db:migrate` — utworzenie i zastosowanie migracji developerskiej
- `npm run db:deploy` — zastosowanie przygotowanych migracji
- `npm test` — testy jednostkowe
- `npm run test:e2e` — testy end-to-end

## Struktura

- `src/main.ts` — punkt startowy serwera
- `src/app.module.ts` — główny moduł NestJS
- `src/auth/` — rejestracja, logowanie i weryfikacja JWT
- `src/categories/`, `src/games/`, `src/game-copies/` — moduły katalogu
- `src/common/` — konfiguracja API, obsługa błędów i request ID
- `src/prisma/` — moduł i serwis dostępu do bazy
- `prisma/schema.prisma` — schemat danych
- `prisma/migrations/` — migracje PostgreSQL
- `test/` — testy end-to-end

## API

Wszystkie endpointy są dostępne pod prefiksem `/api`.

### Uwierzytelnianie

- `POST /api/auth/register` — tworzy konto z rolą `USER`; pola: `email`, `password`, `firstName`, `lastName`
- `POST /api/auth/login` — weryfikuje hasło i wydaje token JWT Bearer ważny 15 minut
- `GET /api/auth/verify` — weryfikuje token przekazany w nagłówku `Authorization: Bearer <token>`
- `GET /api/auth/me` — zwraca profil zalogowanego użytkownika; wymaga tokenu `Bearer`

Hasła są haszowane Argon2id. E-mail jest przy rejestracji normalizowany do małych liter. Hasło musi mieć 12–128 znaków. Rejestracja nie przyjmuje roli od klienta i nie zwraca hasła ani jego hashu. Błędne dane logowania zwracają ten sam komunikat `401`; dla nieistniejącego konta wykonywana jest również weryfikacja Argon2id, aby ograniczyć różnice czasu odpowiedzi. Sekret JWT musi być unikalny, przechowywany poza repozytorium i mieć co najmniej 32 bajty.

### Katalog

- `/api/categories` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- `/api/games` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- `/api/game-copies` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`

Listę gier można wyszukiwać i filtrować: `GET /api/games?q=catan&categoryId=<uuid>&page=1&limit=20`. `q` przeszukuje tytuł i opis bez rozróżniania wielkości liter. Paginacja domyślnie używa `page=1` i `limit=20`, a maksymalny limit to 100. Wynik zawiera `data` i `pagination` (`page`, `limit`, `total`, `totalPages`).

Odczyt katalogu (`GET`) jest publiczny. Tworzenie, aktualizowanie i usuwanie kategorii, gier oraz egzemplarzy wymaga tokenu JWT użytkownika z rolą `ADMIN`. Konto rejestrowane przez publiczny endpoint otrzymuje rolę `USER`; nie można ustawić roli w żądaniu rejestracji. Rola i konto są sprawdzane w bazie przy każdym chronionym żądaniu, więc token nie zachowuje uprawnień po zmianie roli ani usunięciu konta. Brak lub nieprawidłowy token zwraca `401`, a poprawny token użytkownika bez wymaganej roli zwraca `403`.

### Wypożyczenia

- `POST /api/loans` — wypożycza egzemplarz, przyjmuje `{ "gameCopyId": "<uuid>" }` i wymaga tokenu JWT; użytkownik jest ustalany na podstawie tokenu
- `GET /api/loans/me` — historia zalogowanego użytkownika; tożsamość pochodzi wyłącznie z tokenu, parametr `userId` jest odrzucany
- `GET /api/loans` — historia wszystkich użytkowników, wymaga roli `ADMIN`; opcjonalny filtr `userId=<uuid>`
- `PATCH /api/loans/:id/return` — zwraca własne aktywne wypożyczenie; wymaga tokenu JWT i UUID wypożyczenia, bez body. Zwraca `200` z wypożyczeniem w statusie `RETURNED` i datą `returnedAt` ustaloną przez serwer. Nie zmienia `borrowedAt` ani `dueAt`.

Wypożyczenie trwa 14 dni. Użytkownik może mieć jedno aktywne wypożyczenie; zaległe wypożyczenie blokuje kolejne. Egzemplarz musi mieć status `AVAILABLE` i nie może mieć aktywnego wypożyczenia. Brak egzemplarza zwraca `404`, a naruszenie reguł biznesowych `409`. Zwracany rekord zawiera termin zwrotu oraz podstawowe informacje o egzemplarzu i grze.

Zwrot nieistniejącego lub cudzego wypożyczenia zwraca `404` (również dla administratora); ponowny zwrot zwraca `409` i zachowuje pierwotną datę zwrotu. Brak tokenu zwraca `401`, a niepoprawny UUID — `400`. Zwrot jest transakcyjny: przy dwóch równoczesnych żądaniach tylko jedno może się powieść. Można zwrócić także zaległą grę. Zwrot zwalnia limit użytkownika i przywraca dostępność egzemplarza tylko wtedy, gdy jego status to `AVAILABLE`; nie zmienia `MAINTENANCE` ani `RETIRED`.

Historia domyślnie obejmuje statusy `ACTIVE` i `RETURNED`. Oba endpointy listowania przyjmują `status=ACTIVE|RETURNED`, `page` (domyślnie 1, maksymalnie 1000000) i `limit` (domyślnie 20, maksymalnie 100). Odpowiedź ma format `{ data: [...], pagination: { page, limit, total, totalPages } }`. Sortowanie: `borrowedAt DESC`, a przy jednakowych datach `id DESC`. Pusta historia ma `totalPages=0`; strona poza zakresem zwraca pustą listę z rzeczywistą liczbą wyników. Lista i licznik są pobierane z jednego obrazu danych w transakcji `RepeatableRead`.

Wpis zawiera daty, status i informacje o egzemplarzu oraz grze. Widok administratora dodaje pole `user` z `id`, `email`, `firstName` i `lastName`, bez hasła i jego hashu. Zwykły użytkownik otrzymuje `403` dla `GET /api/loans`; brak tokenu na obu endpointach zwraca `401`. Niepoprawne filtry i nieznane parametry zwracają `400`. Przykłady: `GET /api/loans/me?status=RETURNED&page=1&limit=10`, `GET /api/loans?status=ACTIVE&userId=<uuid>`.

Żądania z body i parametry zapytań są walidowane; nieznane pola zwracają `400`. ID w ścieżkach muszą być UUID. Każda odpowiedź z błędem ma format `{ "error": { "code", "message", "details?", "requestId" } }`; `requestId` jest również zwracany w nagłówku `X-Request-Id`. Nieoczekiwane błędy są logowane po stronie serwera, bez ujawniania szczegółów klientowi. Usunięcie zasobu używanego przez inne rekordy zwraca `409 Conflict`.

### Dokumentacja API

Swagger UI jest dostępne pod `http://localhost:3000/api/docs`; surowy dokument OpenAPI pod `http://localhost:3000/api/docs-json`.

## Administrator

Po migracjach ustaw lokalnie w `backend/.env` wartości `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12–128 znaków), `ADMIN_FIRST_NAME` i `ADMIN_LAST_NAME` (1–100 znaków). Następnie w katalogu `backend` uruchom:

```powershell
npm run db:create-admin
```

Skrypt tworzy konto `ADMIN` z hasłem haszowanym Argon2id. Istniejącego konta nie zmienia ani nie podnosi jego uprawnień. Po utworzeniu usuń hasło administratora z `.env`; logowanie działa przez zwykły endpoint. Nie dodawaj `.env` do repozytorium.

## Spójność i dostępność

- `GameCopy.status` opisuje stan egzemplarza. `isAvailable` jest prawdziwe tylko przy `AVAILABLE` i braku aktywnego wypożyczenia. Gry zwracają liczbę takich egzemplarzy jako `availableCopies`.
- Zmiana `gameId` egzemplarza z historią wypożyczeń zwraca `409`, również po zwrocie. Edycja pozostałych pól nadal jest możliwa.
- Sprawdzenia i zapis wypożyczenia odbywają się w transakcji `Serializable`. Konflikty serializacji powodują ponowienie całej operacji, maksymalnie trzy próby; nierozstrzygnięty konflikt zwraca `409`.
- Przekroczenie czasu oczekiwania na rozpoczęcie transakcji również pozwala na ponowienie w ramach tych trzech prób. Jeżeli nadal nie można rozpocząć transakcji, API zwraca `503`. Inne błędy `P2028` powstałe już wewnątrz transakcji nie są ponawiane.
- Migracja `20261108220000_unique_active_copy_loan` dodaje częściowy indeks unikalny dla aktywnego wypożyczenia egzemplarza. Prisma nie odwzorowuje go w schemacie — bazę przygotowuj migracjami, nie samym `db push`. Jeśli baza ma już podwójne aktywne wypożyczenia, migracja odmówi ich zaakceptowania; najpierw rozstrzygnij te rekordy.
- Migracja `20261110220000_unique_active_user_loan` dodaje analogiczny indeks dla użytkownika. Baza pilnuje więc limitu jednego aktywnego wypożyczenia również przy zapisach poza serwisem. Zmiana limitu na więcej niż jedno wymaga najpierw zmiany tego indeksu w nowej migracji. Jeśli w bazie istnieją już wielokrotne aktywne wypożyczenia użytkownika, trzeba je rozstrzygnąć przed migracją.
- Limit wynosi jedno aktywne wypożyczenie na użytkownika. To aktualne założenie, zmienione względem roboczego planu przewidującego trzy.

## Weryfikacja

```powershell
npm test
npm run test:e2e
npm run build
npm run lint
```

`test:e2e` sprawdza HTTP, walidację i uprawnienia z atrapą Prisma; nie testuje PostgreSQL. Osobny zestaw `test:db` sprawdza trwały zapis, dostępność, ochronę historii, indeks unikalny oraz równoczesne wypożyczenia przez rzeczywistą bazę.

Przygotuj **osobną bazę testową**, np. `boardrent_test`, i zastosuj w niej migracje. W PowerShell, z katalogu `backend`:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://boardrent:boardrent-local@localhost:5432/boardrent_test?schema=public'
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  npm run db:deploy
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}
npm run test:db
```

Testy tworzą własne rekordy z losowymi identyfikatorami i usuwają je po każdym przypadku. Brak `TEST_DATABASE_URL` kończy zestaw błędem; testy nie użyją automatycznie bazy aplikacji.
