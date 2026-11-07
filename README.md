# BoardRent

Projekt aplikacji internetowej do zarządzania wypożyczalnią gier planszowych.

## Cel projektu

Aplikacja ma umożliwiać przeglądanie katalogu gier, sprawdzanie dostępności egzemplarzy oraz obsługę wypożyczeń i zwrotów. Szczegóły i kolejne funkcje będą dodawane etapami zgodnie z planem projektu.

## Status

Repozytorium, backend NestJS, frontend React oraz początkowy schemat bazy PostgreSQL zarządzany przez Prisma. Kolejne elementy aplikacji będą dodawane etapami zgodnie z planem projektu.

## Backend

Przed uruchomieniem API przygotuj lokalną bazę:

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up -d db
cd backend
npm run db:generate
npm run db:migrate
npm run start:dev
```

Domyślnie API uruchamia się pod adresem `http://localhost:3000`. `.env.example` zawiera dane wyłącznie do lokalnego developmentu; nie używaj ich w środowisku produkcyjnym.

Podstawowe endpointy katalogu:

- `/api/categories` — kategorie gier
- `/api/games` — gry wraz z kategorią
- `/api/game-copies` — fizyczne egzemplarze gier

Każdy zasób obsługuje `GET` listy i szczegółu, `POST`, `PATCH` oraz `DELETE`. Uwierzytelnianie i ograniczenia dostępu będą dodane w późniejszym etapie.

## Frontend

```powershell
cd frontend
npm run dev
```

Vite wypisze adres lokalnej aplikacji w terminalu.
