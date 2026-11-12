# BoardRent

Projekt aplikacji internetowej do zarządzania wypożyczalnią gier planszowych.

## Cel projektu

Aplikacja umożliwia przeglądanie katalogu gier, sprawdzanie dostępności egzemplarzy oraz obsługę kont i wypożyczeń. Kolejne funkcje są dodawane etapami zgodnie z planem projektu.

## Uruchomienie lokalne

Skopiuj przykładową konfigurację, ustaw własny sekret JWT i uruchom PostgreSQL oraz API:

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
# W backend/.env ustaw AUTH_JWT_SECRET na losowy sekret o długości co najmniej 32 bajtów.
cd backend
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run start:dev
```

Jeśli nie masz uruchomionego PostgreSQL na porcie `5432`, przed migracjami wykonaj w katalogu głównym `docker compose up -d db`. Przy istniejącej bazie pomiń ten krok i ustaw odpowiedni `DATABASE_URL` w `backend/.env`.

API domyślnie działa pod `http://localhost:3000`. `.env.example` zawiera ustawienia lokalne; nie używaj ich w środowisku produkcyjnym. Instrukcje generowania sekretu znajdują się w [backend/README.md](./backend/README.md).

## API

- `/api/auth/register` i `/api/auth/login` — rejestracja i logowanie
- `/api/auth/verify` — weryfikacja tokenu Bearer
- `/api/categories` — kategorie gier
- `/api/games` — gry wraz z kategorią; wyszukiwanie, filtrowanie i paginacja
- `/api/auth/me` — profil zalogowanego użytkownika
- `/api/game-copies` — fizyczne egzemplarze gier
- `/api/loans` — wypożyczenie dostępnego egzemplarza; `PATCH /api/loans/:id/return` — zwrot własnego wypożyczenia
- `GET /api/loans/me` — własna historia wypożyczeń; `GET /api/loans` — historia wszystkich użytkowników dla administratora

Endpointy katalogu obsługują listowanie, pobieranie szczegółu, tworzenie, aktualizowanie i usuwanie. Swagger UI jest dostępne pod `/api/docs`.

Hasła są haszowane Argon2id. Token JWT jest podpisany HS256 i wygasa po 15 minutach. Odczyt katalogu jest publiczny, a jego modyfikacja wymaga roli `ADMIN`; rejestracja tworzy konto `USER`. Szczegóły endpointów, odpowiedzi i konfiguracji opisuje [backend/README.md](./backend/README.md).

Zalogowany użytkownik może wypożyczyć dostępny egzemplarz przez `POST /api/loans`. Wypożyczenie trwa 14 dni, a limit wynosi jedno aktywne wypożyczenie na użytkownika.

Zwrot przez `PATCH /api/loans/:id/return` zapisuje `RETURNED` i datę `returnedAt`. Ponowny zwrot zwraca `409`; nieistniejące i cudze wypożyczenia zwracają `404`. Dostępność jest przeliczana automatycznie, z uwzględnieniem stanu egzemplarza.

Historia obejmuje aktywne i zwrócone wypożyczenia, od najnowszych. Obsługuje `status=ACTIVE|RETURNED`, `page` i `limit`; administrator może dodatkowo filtrować po `userId`.

## Frontend

Na Windows możesz uruchomić oba serwery jedną komendą z katalogu głównego (po przygotowaniu bazy, migracji, `backend/.env` i zależności):

```powershell
.\dev.cmd
```

Otwórz `http://127.0.0.1:5173`. Serwery działają w tle, a logi są w `.boardrent-dev`. Zatrzymasz oba poleceniem `.\dev.cmd stop`. Skrypt nie uruchamia ani nie zatrzymuje PostgreSQL.

Możesz też uruchomić frontend osobno:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Vite wypisze lokalny adres aplikacji w terminalu.

Na stronie głównej i pod `/games` można przeglądać katalog, wyszukiwać gry, filtrować po kategorii i otwierać szczegóły. Frontend pobiera dane z backendu przez lokalne proxy Vite. Jeśli baza nie zawiera jeszcze gier, po migracjach uruchom z katalogu `backend` `npm.cmd run db:seed-demo`, aby dodać przykładowy katalog do testów. Więcej informacji znajduje się w [frontend/README.md](./frontend/README.md).

Tworzenie konta administratora i uruchamianie testów opisuje [backend/README.md](./backend/README.md).
API egzemplarzy zwraca `isAvailable`, a API gier `availableCopies`. Status `AVAILABLE` opisuje stan egzemplarza; samo wypożyczenie nie zmienia go.
