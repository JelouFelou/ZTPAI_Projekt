# BoardRent backend

REST API aplikacji BoardRent zbudowane w NestJS i TypeScript.

## Uruchomienie

Z katalogu `backend` skopiuj przykładową konfigurację, uruchom bazę z katalogu głównego repozytorium i zastosuj migrację:

```powershell
npm install
Copy-Item .env.example .env
Set-Location ..
docker compose up -d db
Set-Location backend
npm run db:generate
npm run db:migrate
npm run start:dev
```

API domyślnie nasłuchuje na porcie `3000`. Port można zmienić zmienną środowiskową `PORT`. Dane w `.env.example` są przeznaczone wyłącznie do lokalnego developmentu.

## Dostępne skrypty

- `npm run start` — uruchomienie aplikacji
- `npm run start:dev` — uruchomienie w trybie obserwowania zmian
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
- `src/app.controller.ts` — bazowy kontroler HTTP
- `src/app.service.ts` — bazowy serwis
- `src/prisma/` — moduł i serwis dostępu do bazy
- `prisma/schema.prisma` — schemat danych
- `prisma/migrations/` — migracje PostgreSQL
- `test/` — testy end-to-end

## API katalogu

Wszystkie endpointy są dostępne pod prefiksem `/api`:

- `/api/categories` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- `/api/games` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- `/api/game-copies` — `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`

Listę gier można wyszukiwać i filtrować: `GET /api/games?q=catan&categoryId=<uuid>&page=1&limit=20`. `q` przeszukuje tytuł i opis bez rozróżniania wielkości liter; `categoryId` ogranicza wyniki do kategorii. Paginacja domyślnie używa `page=1` i `limit=20`, a maksymalny limit to 100. Wynik zawiera `data` oraz `pagination` (`page`, `limit`, `total`, `totalPages`).

Żądania z body i parametry zapytań są walidowane; nieznane pola zwracają `400`. ID w ścieżkach muszą być UUID. Każda odpowiedź z błędem ma format `{ "error": { "code", "message", "details?", "requestId" } }`, a `requestId` jest również zwracany w nagłówku `X-Request-Id`. Nieoczekiwane błędy są logowane po stronie serwera, bez ujawniania szczegółów klientowi. Usunięcie zasobu używanego przez inne rekordy zwraca `409 Conflict`.

Swagger UI jest dostępne pod `http://localhost:3000/api/docs`; surowy dokument OpenAPI pod `http://localhost:3000/api/docs-json`.

Endpointy nie mają jeszcze ochrony rolami; uwierzytelnianie i autoryzacja są osobnym etapem planu.
