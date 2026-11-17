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

Hasła są haszowane Argon2id. Token JWT jest podpisany HS256 i dla nowych sesji nie ma limitu czasu ważności. Odczyt katalogu jest publiczny, a jego modyfikacja wymaga roli `ADMIN`; rejestracja tworzy konto `USER`. Szczegóły endpointów, odpowiedzi i konfiguracji opisuje [backend/README.md](./backend/README.md).

Zalogowany użytkownik może wypożyczyć dostępny egzemplarz przez `POST /api/loans`. Wypożyczenie trwa 14 dni, a limit wynosi jedno aktywne wypożyczenie na użytkownika.

Zwrot przez `PATCH /api/loans/:id/return` zapisuje `RETURNED` i datę `returnedAt`. Ponowny zwrot zwraca `409`; nieistniejące i cudze wypożyczenia zwracają `404`. Dostępność jest przeliczana automatycznie, z uwzględnieniem stanu egzemplarza.

Historia obejmuje aktywne i zwrócone wypożyczenia, od najnowszych. Obsługuje `status=ACTIVE|RETURNED`, `page` i `limit`; administrator może dodatkowo filtrować po `userId` oraz po przeterminowaniu (`overdue=true|false`). Panel `/admin?tab=loans` pokazuje tę historię po 20 wpisów na stronę.

## Frontend

### Uruchomienie całej aplikacji w Docker Compose

Skonfiguruj `backend/.env`, ustawiając `AUTH_JWT_SECRET` na własny sekret, a następnie z katalogu głównego uruchom:

```powershell
docker compose --env-file backend/.env up --build
```

Compose uruchamia PostgreSQL, backend i frontend. Migracje są stosowane przed startem API, frontend jest dostępny pod `http://localhost:5173`, a API pod `http://localhost:3000`. Dane bazy pozostają w wolumenie `boardrent-postgres-data`. Zatrzymanie usług: `docker compose down`; dodanie `-v` usuwa również dane bazy.

Na Windows uruchom aplikację jedną komendą z katalogu głównego (wymagane Node.js, npm oraz Docker Desktop lub własny PostgreSQL):

```powershell
.\dev.cmd
```

Skrypt tworzy brakujący `backend/.env` i losowy sekret JWT, instaluje brakujące lub nieaktualne zależności, generuje klienta Prisma i stosuje migracje. Jeśli lokalna baza nie odpowiada, uruchamia Docker Desktop i usługę `db` przez Compose. Przy własnej bazie używa `DATABASE_URL` z `backend/.env`; sprawdza też połączenie i dane logowania podczas migracji. Instalacja zależności może wymagać dostępu do internetu.

Każde uruchomienie `dev.cmd` (również `dev.cmd restart`) restartuje serwery wcześniej uruchomione przez ten skrypt. Gotowość ogłasza dopiero po sprawdzeniu backendu, bazy i pobierania gier przez frontend. Otwórz `http://127.0.0.1:5173`. Serwery działają w tle; po późniejszej awarii uruchom ponownie `dev.cmd`.

- `dev.cmd status` — sprawdza backend, frontend i połączenie z bazą.
- `dev.cmd logs` — pokazuje ostatnie linie logów z `.boardrent-dev`.
- `dev.cmd stop` — zatrzymuje własne serwery; baza pozostaje uruchomiona, a jej dane zachowane.

Przy błędzie skrypt wypisuje etap, wskazówkę i logi oraz zwraca niezerowy kod zakończenia. Obcych procesów zajmujących porty `3000` lub `5173` nie zamyka: wskazuje port i PID. Przed przejściem z pełnego Compose na `dev.cmd` zatrzymaj kontenery `backend` i `frontend` poleceniem `docker compose stop backend frontend`. Skrypt nie monitoruje usług po zakończeniu uruchamiania.

Możesz też uruchomić frontend osobno:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Vite wypisze lokalny adres aplikacji w terminalu.

Na stronie głównej i pod `/games` można przeglądać katalog, wyszukiwać gry, filtrować po kategorii i otwierać szczegóły. Przycisk „i” na kafelku pokazuje informacje bez opuszczania katalogu: okazję, poziom trudności, przebieg rozgrywki, cechy i parametry gry. Administrator uzupełnia te opcjonalne pola w formularzu gry; są też widoczne na stronie szczegółów. Zalogowany użytkownik może wypożyczać i zwracać gry pod `/loans`, a administrator zarządza grami, kategoriami i egzemplarzami pod `/admin`. Frontend pobiera dane z backendu przez lokalne proxy Vite. Po migracjach uruchom z katalogu `backend` `npm.cmd run db:seed-demo`, aby dodać 14 przykładowych gier lub uzupełnić ich brakujące informacje pomocne przy wyborze. Skrypt zachowuje już uzupełnione pola. Więcej informacji znajduje się w [frontend/README.md](./frontend/README.md).

Tworzenie konta administratora i uruchamianie testów opisuje [backend/README.md](./backend/README.md).
API egzemplarzy zwraca `isAvailable`, a API gier `availableCopies`. Status `AVAILABLE` opisuje stan egzemplarza; samo wypożyczenie nie zmienia go.
