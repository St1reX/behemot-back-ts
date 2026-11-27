# Importy

Moduł `imports` zastępuje `bolma` oraz importery produktów CLI. Obecnie obsługuje wyłącznie Bolmę. Importer BaseLinkera i wspólny seeder produktów zostały usunięte.

`imports.routes.ts` → `imports.controller.ts` → `imports.service.ts` → `repositories/bolmaImportRepository.ts`.
Walidacja i mapowanie danych Bolmy są razem w `bolmaProduct.mapper.ts`, a trwały dziennik i raport XLSX w `bolmaImport.report.ts`. Katalog raportów, nazewnictwo i wyszukiwanie najnowszego pliku są w `uploads/imports.upload.ts`, z użyciem wspólnego `getUploadDirectory`. Kontroler odpowiada za wysłanie pliku przez `res.download`. Konfiguracja MySQL pozostaje w `config/database.ts`. Moduł nie implementuje adaptera marketplace.

## API i uprawnienia

- `GET /imports/bolma/configuration` — bezpieczny odczyt konfiguracji, `INTEGRATION:READ`.
- `GET /imports/bolma/status` — sprawdzenie połączenia MySQL dla zalogowanego użytkownika; korzysta z niego także kafelek pulpitu.
- `POST /imports/bolma/products` — `{ confirmed: true }`; synchroniczny import zakończony odpowiedzią XLSX. Wymaga łącznie `INTEGRATION:READ`, `INTEGRATION:UPDATE`, `PRODUCT:CREATE`, `PRODUCT:UPDATE`.
- `GET /imports/bolma/products/report/latest` — pobranie najnowszego gotowego raportu ze wspólnego katalogu Bolmy, `INTEGRATION:READ`. Wybór według daty modyfikacji pliku XLSX. Brak plików daje 404.

Nie ma kolejki ani automatycznych ponowień. Blokada Redis z odnawianą dzierżawą zapobiega równoległym przebiegom, również między instancjami API. Utrata blokady przerywa import przed kolejnym rekordem. Każde potwierdzenie rozpoczyna nowy przebieg; identyfikator i nazwę pliku generuje backend. Frontend nie przechowuje identyfikatorów raportów ani historii w localStorage.

## Zasady zapisu

Źródłem są `products` o `status = 1` i parametry `products_2_params` o ID 1, 2, 4. SKU jest przycinane; dla powtórzeń wygrywa rekord o najwyższym numerycznym ID. Starsze rekordy i brak SKU są pomijane.

Nowe produkty mają `isLegacy = true` i importowaną wersję treści. Mapowane są nazwa, długość w cm, waga w kg, lokalizacja, dział i dopasowania do istniejącego katalogu pojazdów. Parametr długości całkowitej ma pierwszeństwo. Nieznany dział/kategoria daje ostrzeżenie; niejednoznaczny słownik lub niepoprawne dane dają błąd rekordu.

Istniejące aktywne legacy o importowanej wersji treści mogą otrzymać wyłącznie pustą nazwę oraz brakującą lub niepoprawną (<= 0) długość/wagę. Produkty zarządzane przez aplikację, usunięte i niejednoznaczne SKU pozostają bez zmian. Import nie usuwa rekordów, nie zmienia źródła, nie pobiera cen, stanów, zdjęć ani ofert.

Produkt, dopasowania i audyt bieżącego użytkownika zapisują się w jednej transakcji `Serializable`. Cały import nie jest jedną transakcją. Błąd rekordu nie blokuje pozostałych, a przerwanie nie cofa wcześniejszych zapisów. Nie należy równocześnie zmieniać SKU ani słowników w panelu.

## Raport i przerwania

XLSX zawiera dokładnie trzy arkusze: INFO (utworzone, uzupełnione i istniejące produkty), WARNING (pominięcia, konflikty i uwagi do danych), ERROR (błędy rekordów i przerwanie przebiegu). Arkusze zawierają podsumowanie, identyfikatory, SKU, parametry i zmiany przed/po, mają filtry, zamrożone nagłówki i kolorystykę poziomów. Ostrzeżenie może dotyczyć produktu zapisanego poprawnie.

Raport oraz dziennik JSONL są zapisywane w `UPLOADS_ROOT_PATH/imports/bolma/`. Dziennik jest opróżniany na dysk po każdym rekordzie. Gotowy XLSX trafia na docelową ścieżkę dopiero po zamknięciu całego pliku. Nie jest publicznym uploadem. Aplikacja nie usuwa żadnych raportów ani dzienników. Starsze pliki są dostępne administracyjnie przez FTP; panel udostępnia tylko najnowszy gotowy XLSX. Dzienniki JSONL, pliki .part i podkatalogi nie biorą udziału w wyborze najnowszego raportu. Należy uwzględnić pliki w polityce miejsca i kopii zapasowych. Instancje API muszą współdzielić ten katalog przy pracy na wielu serwerach.

Modal blokuje zamknięcie i nawigację podczas żądania. Frontend i odpowiedź serwera nie mają limitu czasu importu; reverse proxy/load balancer musi dopuszczać odpowiednio długie żądania. Utrata połączenia przerywa przetwarzanie przed kolejnym rekordem i finalizuje raport dotychczasowych zapisów. Przycisk w modalu pobiera najnowszy gotowy raport Bolmy niezależnie od przeglądarki i autora importu. Podczas trwającego importu może to być raport poprzedniego przebiegu. Przy twardym zatrzymaniu procesu dziennik może pozostać bez podsumowania i bez XLSX; wymaga wtedy sprawdzenia administracyjnego. Nie należy w takiej sytuacji zakładać, że nie dokonano zapisów.

Frontend korzysta z `api/files/download.ts`, tak jak wzorzec Mondaya: `ImportsApiClient` zwraca `DownloadedFile` (blob i nazwę z Content-Disposition), a komponent wywołuje `saveDownloadedFile`. Klient API nie wykonuje operacji na DOM.
