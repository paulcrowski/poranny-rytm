# Poranny rytm

Prosta, polska aplikacja PWA do porannego treningu i medytacji, z minutnikiem. Domyślnie plan jest zapisywany w przeglądarce.

[Wypróbuj aplikację](https://poranny-rytm-paul.morepol00.chatgpt.site).

## Uruchomienie

`python -m http.server 5173 --directory dist`

Otwórz http://localhost:5173. Instalacja na telefonie wymaga hostingu HTTPS. Android: menu przeglądarki → Zainstaluj aplikację / Dodaj do ekranu głównego. iPhone: Safari → Udostępnij → Do ekranu początkowego.

## Zakres

- Trzy oddzielne zestawy z edytowalnymi krokami: rozgrzewka poranna, trening siłowy i medytacja.
- Dodawanie, edycja, usuwanie i zmiana kolejności pozycji.
- Czas 5–3600 sekund i opcjonalna wskazówka dla każdej pozycji.
- Pięć sekund przygotowania; przerwy 0–30 sekund między ćwiczeniami.
- Timer, pauza, pomijanie i delikatne sygnały rozpoczęcia i zakończenia etapu.
- Próba utrzymania ekranu włączonego, jeśli przeglądarka to obsługuje.
- Automatyczna pauza po ukryciu aplikacji. Sesja nie jest wznawiana po odświeżeniu.
- Service worker zapisuje pliki do pracy offline po pierwszym udanym otwarciu.

Przykładowe ćwiczenia mają proste autorskie ilustracje SVG. Ilustracje nie są animowanym instruktażem. Bez konfiguracji Convex dane zostają na urządzeniu. Wyczyszczenie danych witryny usuwa lokalny plan. Zmiany plików aplikacji wymagają podbicia wersji cache w `dist/sw.js`.

## Opcjonalna synchronizacja

Uruchom `npm ci` i `npx convex dev` z własnym projektem Convex. Wpisz adres wdrożenia w `dist/cloud-config.js`. Synchronizacja treningu siłowego korzysta z klucza udostępniania planu. Rozgrzewka i medytacja zapisują się lokalnie.

## Sprawdzenie

`node check.mjs`

Sprawdza logikę sesji i zasoby PWA. Nie zastępuje sprawdzenia instalacji, dźwięku i działania offline na docelowym telefonie.
