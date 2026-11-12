# BoardRent frontend

Publiczny katalog gier planszowych zbudowany w React, TypeScript i Vite.

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

- `/` — strona główna z katalogiem.
- `/games` — katalog z wyszukiwaniem po tytule lub opisie, filtrem kategorii i paginacją.
- `/games/:id` — szczegóły gry oraz liczba dostępnych egzemplarzy.

Filtry, rozmiar strony i numer strony są zapisane w adresie. Można skopiować link do wyników lub wrócić do nich przyciskiem Wstecz w przeglądarce. Na tym etapie frontend jest publiczny; logowanie, wypożyczanie, zwroty i panel administratora są kolejnymi punktami planu.

## Kontrole

```powershell
npm.cmd run build
npm.cmd run lint
```
