# BoardRent backend

REST API aplikacji BoardRent zbudowane w NestJS i TypeScript.

## Uruchomienie

Z katalogu `backend` skopiuj przykładową konfigurację i ustaw własny sekret JWT:

```powershell
npm install
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

Wypożyczenie trwa 14 dni. Użytkownik może mieć jedno aktywne wypożyczenie; zaległe wypożyczenie blokuje kolejne. Egzemplarz musi mieć status `AVAILABLE` i nie może mieć aktywnego wypożyczenia. Brak egzemplarza zwraca `404`, a naruszenie reguł biznesowych `409`. Zwracany rekord zawiera termin zwrotu oraz podstawowe informacje o egzemplarzu i grze. Endpoint zwrotu zostanie dodany w następnym etapie.

Żądania z body i parametry zapytań są walidowane; nieznane pola zwracają `400`. ID w ścieżkach muszą być UUID. Każda odpowiedź z błędem ma format `{ "error": { "code", "message", "details?", "requestId" } }`; `requestId` jest również zwracany w nagłówku `X-Request-Id`. Nieoczekiwane błędy są logowane po stronie serwera, bez ujawniania szczegółów klientowi. Usunięcie zasobu używanego przez inne rekordy zwraca `409 Conflict`.

### Dokumentacja API

Swagger UI jest dostępne pod `http://localhost:3000/api/docs`; surowy dokument OpenAPI pod `http://localhost:3000/api/docs-json`.
