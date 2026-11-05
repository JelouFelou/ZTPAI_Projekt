# BoardRent backend

REST API aplikacji BoardRent zbudowane w NestJS i TypeScript.

## Uruchomienie

```powershell
npm install
npm run start:dev
```

API domyślnie nasłuchuje na porcie `3000`. Port można zmienić zmienną środowiskową `PORT`.

## Dostępne skrypty

- `npm run start` — uruchomienie aplikacji
- `npm run start:dev` — uruchomienie w trybie obserwowania zmian
- `npm run start:debug` — uruchomienie w trybie debugowania
- `npm run build` — kompilacja aplikacji
- `npm run start:prod` — uruchomienie skompilowanej aplikacji
- `npm test` — testy jednostkowe
- `npm run test:e2e` — testy end-to-end

## Struktura

- `src/main.ts` — punkt startowy serwera
- `src/app.module.ts` — główny moduł NestJS
- `src/app.controller.ts` — bazowy kontroler HTTP
- `src/app.service.ts` — bazowy serwis
- `test/` — testy end-to-end
