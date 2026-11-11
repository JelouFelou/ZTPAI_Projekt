# BoardRent

Projekt aplikacji internetowej do zarządzania wypożyczalnią gier planszowych.

## Cel projektu

Aplikacja umożliwia przeglądanie katalogu gier, sprawdzanie dostępności egzemplarzy oraz obsługę kont i wypożyczeń. Kolejne funkcje są dodawane etapami zgodnie z planem projektu.

## Uruchomienie lokalne

Skopiuj przykładową konfigurację, ustaw własny sekret JWT i uruchom PostgreSQL oraz API:

```powershell
Copy-Item backend/.env.example backend/.env
# W backend/.env ustaw AUTH_JWT_SECRET na losowy sekret o długości co najmniej 32 bajtów.
docker compose up -d db
cd backend
npm ci
npm run db:generate
npm run db:migrate
npm run start:dev
```

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

```powershell
cd frontend
npm ci
npm run dev
```

Vite wypisze lokalny adres aplikacji w terminalu.

Tworzenie konta administratora i uruchamianie testów opisuje [backend/README.md](./backend/README.md).
API egzemplarzy zwraca `isAvailable`, a API gier `availableCopies`. Status `AVAILABLE` opisuje stan egzemplarza; samo wypożyczenie nie zmienia go.
