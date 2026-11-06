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
