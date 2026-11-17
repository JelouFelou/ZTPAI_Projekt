# BoardRent frontend

Katalog i panel wypożyczeń gier planszowych zbudowany w React, TypeScript i Vite.

## Uruchomienie lokalne

Uruchom PostgreSQL i backend według głównego `README.md`. W osobnym terminalu:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Otwórz adres wypisany przez Vite (zwykle `http://localhost:5173`). Serwer Vite przekazuje żądania `/api` do backendu pod `http://127.0.0.1:3000`, więc lokalnie nie trzeba ustawiać CORS ani adresu API. Przy innym adresie backendu zmień proxy w `vite.config.ts`. Dla osobno hostowanego frontendu ustaw `VITE_API_BASE_URL` przed budowaniem, np. `https://example.com/api`. Jeśli frontend i API mają różne domeny, skonfiguruj również CORS w backendzie albo wspólny reverse proxy.

Jeśli katalog jest pusty, z katalogu `backend` uruchom `npm.cmd run db:seed-demo` po zastosowaniu migracji. Skrypt dodaje 14 przykładowych gier i ich egzemplarze, więc można też sprawdzić paginację; można uruchamiać go ponownie bez tworzenia tych samych wpisów.

## Dostępne widoki

Formularz rejestracji konta `USER` wymaga hasła od 8 do 128 znaków. Minimum 12 znaków dotyczy wyłącznie administratora tworzonego skryptem backendu. Hasła są weryfikowane również w API i haszowane Argon2id.

- `/` — strona główna z katalogiem.
- `/games` — katalog z wyszukiwaniem po tytule lub opisie, filtrem kategorii i paginacją.
- `/games/:id` — szczegóły gry oraz liczba dostępnych egzemplarzy.
- `/login` i `/register` — logowanie oraz rejestracja konta.
- `/loans` — własne wypożyczenia, terminy zwrotu i zwracanie gier.
- `/notifications` — własne potwierdzenia wypożyczeń i przypomnienia o zaległych grach; widok dla zalogowanych, z paginacją, odświeżaniem, obsługą ładowania, błędów i pustej listy. Daty są wyświetlane po polsku w strefie `Europe/Warsaw`.
- `/admin` — panel administratora: dodawanie, edycja i usuwanie gier, kategorii oraz egzemplarzy; zakładka „Wypożyczenia” pokazuje historię wszystkich użytkowników z filtrami i paginacją po stronie API.

Wypożyczenie ma etap podsumowania: użytkownik widzi konkretny egzemplarz, okres wypożyczenia i swoje dane, a następnie zaznacza potwierdzenie i zapisuje wypożyczenie. Dopiero wtedy powstaje aktywny rekord. „Moje wypożyczenia” pokazują aktualną grę, dokładny termin w czasie polskim, czas pozostały do zwrotu oraz potwierdzenie do pobrania. Historia zwróconych gier jest osobna. Zwrot wymaga potwierdzenia oddania kompletnego egzemplarza; anulowanie okienka nie zmienia danych. Użytkownik z aktywnym wypożyczeniem od razu widzi tę informację przy kolejnej grze. Czas wypożyczenia i limit są pobierane z `GET /api/loans/policy`; ostateczną dostępność sprawdza backend podczas zapisu.

Filtry, rozmiar strony i numer strony są zapisane w adresie. Można skopiować link do wyników lub wrócić do nich przyciskiem Wstecz w przeglądarce. Po zalogowaniu można wypożyczyć dostępny egzemplarz ze strony szczegółów gry. Sesja jest zapisana w sessionStorage bieżącej karty przeglądarki i nie wygasa po określonym czasie. Wylogowanie usuwa sesję, a zamknięcie karty kończy jej przechowywanie (przeglądarka może ją przywrócić przy odtwarzaniu kart). Panel administratora wymaga konta z rolą `ADMIN`. Utwórz je zgodnie z [instrukcją backendu](../backend/README.md#administrator), a następnie zaloguj się na stronie. Formularze wyświetlają błędy walidacji, odmowy dostępu i konfliktów zapisu; przed usunięciem wpisu proszą o potwierdzenie.

## Kontrole

Filtry panelu wypożyczeń administratora: „Wszystkie” obejmuje całą historię, „W terminie” wybiera `ACTIVE` z `dueAt >= teraz`, „Przeterminowane” wybiera `ACTIVE` z `dueAt < teraz`, a „Zwrócone” wybiera `RETURNED`. Filtrowanie i paginacja odbywają się w API. Daty są pokazywane po polsku w strefie `Europe/Warsaw`, niezależnie od strefy przeglądarki.

Potwierdzenie odebrania konkretnego, kompletnego egzemplarza uruchamia wypożyczenie, a potwierdzenie fizycznego oddania je zamyka. Daty tych operacji są widoczne w wypożyczeniu i pobieranym potwierdzeniu. Na stronie gry i w okienku „i” widać liczbę dostępnych i wypożyczonych kopii oraz planowane zwroty. Terminy po czasie są oznaczone jako zaległe. Układ stron korzysta z szerokości okna; katalog automatycznie dobiera liczbę kolumn, a aktywne wypożyczenie i historia na szerokim ekranie stoją obok siebie.

```powershell
npm.cmd run build
npm.cmd run lint
```
