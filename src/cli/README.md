# Narzędzia CLI

Polecenia uruchamiaj z katalogu backendu. Narzędzia do zarządzania rolami korzystają z połączenia do bazy skonfigurowanego w `.env`.

| Polecenie | Działanie |
| --- | --- |
| `npm run bootstrap` | Uruchamia kolejno wymagane seedery: role i uprawnienia, a następnie podstawowe działy. Nadpisuje uprawnienia ról `superadmin`, `admin` i `user` zgodnie z `boostrap/seed/rolePrivilegesSeedConfig.ts`. Dodaje działy B — Błotniki, SS — StefanStanley, P — Progi, O — Opaski; identyczne aktywne wpisy pomija, a konflikt nazwy lub skrótu wycofuje transakcję działów. Nie uruchamia migracji ani seedera pojazdów. |
| `npm run auth:assign-role` | Pozwala wybrać konto i nadać mu istniejącą rolę. Nie zmienia statusu aktywacji konta. |
| `npm run auth:grant-all-privileges` | Pozwala wybrać rolę, tworzy lub przywraca uprawnienia z konfiguracji aplikacji i nadaje je tej roli. Dotyczy to również uprawnień `ROLE` i `USER`. |
| `npm run swagger-generate` | Generuje `src/swagger/swagger_output.json` z plików `src/modules/**/docs/*.docs.js` oraz wspólnych opisów w `src/swagger/docs`. Sprawdza zgodność listy metod i ścieżek z deklaracjami tras. Nie uruchamia API ani nie łączy się z bazą. |
| `npm run postman-generate` | Generuje `postman/behemot-api.postman_collection.json` z tras i przykładów w `generatePostmanCollection.ts`. Odczytuje konfigurację `.env` do ustawienia adresu API, ale nie łączy się z bazą ani nie wysyła żądań. |

W skryptach `auth` wybieraj strzałkami ↑/↓ i zatwierdzaj Enterem. Esc lub Ctrl+C anuluje wybór bez zapisu. Długie listy są stronicowane automatycznie.

`boostrap` zawiera skrypty przygotowania świeżej aplikacji z podziałem na `auth` (zmiana dostępu), `seed` (role i uprawnienia) oraz `shared` (obsługa wyboru w terminalu). Seedery zewnętrznych danych, w tym katalogu pojazdów, pozostają poziom wyżej w `cli/seed`. Generator Postmana i kopiowanie zasobów pozostają w głównym katalogu `cli`.

Polecenie `bootstrap` przerywa pracę po błędzie seedera. Seedery zapisują dane osobno: błąd działów nie cofa wcześniejszego seedowania ról i uprawnień. Ponowne uruchomienie przywraca skonfigurowany zestaw uprawnień ról systemowych, również jeśli wcześniej rozszerzono go skryptem `auth:grant-all-privileges`.

## Stały seeder katalogu pojazdów

```sh
npm run db-seed:vehicles
npm run db-seed:vehicles -- --apply
```

Pierwsze polecenie tworzy raport Excel bez zapisu do bazy. Drugie najpierw zapisuje raport, a następnie dopisuje brakujące marki, modele i generacje w jednej transakcji PostgreSQL. Raport domyślnie trafia do `reports/vehicle-seed-<czas>.xlsx`; istniejący plik nie jest nadpisywany. Opcjonalne argumenty skryptu to `--dry-run`, `--apply`, `--output` i `--help`; przekazuj je po separatorze `--`. Bez `--apply` skrypt zawsze działa bez zapisu do bazy.

Seeder znajduje się w `src/cli/seed/seedVehicles.ts`, stałe dane w `src/shared/constants/vehicleCatalog.constants.ts`, a walidacja i normalizacja katalogu w `src/shared/utils/vehicleCatalog.ts`. Z tego samego katalogu korzysta importer produktów Bolmy, bez kopiowania mapowań. Seeder zastępuje poprzedni importer pojazdów Bolmy; stare polecenia `bolma:import-vehicles` zostały usunięte. Nie pobiera danych z MySQL ani strony i nie parsuje tytułów podczas uruchomienia. Zawiera stały, przejrzany snapshot dwóch list strony dostarczonych przez użytkownika 24.11.2026: 877 pozycji oraz cztery grupy bez modeli. `sourceCategories` zachowuje oryginalne grupy marek, tytuły i identyfikatory, a `vehicleCatalog` zawiera już ustalone marki, nazwy modeli z wariantami i zakresy produkcji. Aktualizacja katalogu wymaga jawnej zmiany danych stałych. Dry run seedera pojazdów nie inicjalizuje połączenia do bazy; zapis korzysta ze wspólnej konfiguracji `.env` backendu.

Każdy wpis katalogu to `[model, początekProdukcji, koniecProdukcji, źródłoweId]`. Wartości `null` dla obu lat oznaczają model bez generacji. Koniec `null` przy podanym początku oznacza brak końca w źródle; nie jest ustalany na podstawie bieżącej wiedzy o produkcji. Wpis z modelem `null` tworzy wyłącznie markę. Pojedynczy rok w tytule bez zakresu nie tworzy generacji. Oznaczenia wersji, silników, napędu, liczby drzwi i nadwozia pozostają w nazwie modelu. Usunięto z nazw wyłącznie informacje dotyczące samej części, np. długość obejmy, numer części Iveco lub pojemność zbiornika.

Przykład BMW: `3 (E36)` / 1990–2000, `3 (E36) SDN` / 1990–1996 oraz `3 (E36) KOMBI` / 1996–1999 są trzema osobnymi modelami. Wpis ogólny nie zastępuje wariantów. Łączone są wyłącznie identyczne marki, pełne nazwy wariantów i dokładne zakresy lat; scalony wpis zachowuje wszystkie identyfikatory źródłowe. Różne lub nakładające się zakresy pozostają osobnymi generacjami, także gdy katalog podaje sprzeczne lata. Nie są automatycznie rozszerzane ani poprawiane. Podane w źródle listy pojazdów rozpisano na konkretne modele i przypisane im zakresy; nazwy modeli bez samodzielnego określenia, np. samotne `SDN`, `DŁ.1000 MM` lub `E15`, nie powstają z fragmentów tytułów.

Zachowano wcześniejsze decyzje użytkownika: BERTONE dla FREECLIMBER 2, wspólny zakres ALBEA i PALIO WEEKEND II/III, PASSAT dla B3/B4/B5, oba modele VITO i VARIO, oddzielne marki dla SPRINTERA i LT oraz GRAND VITARA II 2005–2014. Wpis T5 z uszkodzonym zakresem `03-09-` nie występuje w przekazanych listach strony, więc nie został do nich dopisany. Uwagi o konkretnych rozstrzygnięciach i ograniczeniach źródła są zapisane w `sourceNotes` i raporcie.

Przed jakimkolwiek zapisem seeder sprawdza długości nazw, zakresy lat, duplikaty pełnych wpisów i kompletność przypisania wszystkich źródeł. Raport zawiera podsumowanie, marki, osobny arkusz każdej marki, pełne źródła z mapowaniem oraz decyzje i uwagi. Pozwala porównać wariant z oryginalnym tytułem strony. Nie porównuje katalogu z bieżącą bazą docelową.

Zgodnie z decyzją użytkownika stare dane pozostają bez zmian. Seeder nie usuwa, nie przemianowuje, nie scala istniejących rekordów ani nie zmienia powiązań produktów. Powtórne uruchomienie pomija aktywne marki, modele i identyczne zakresy po normalizacji nazw. Istniejące niejednoznaczne duplikaty przerywają transakcję i wymagają osobnego uporządkowania danych; skrypt nie wybiera przypadkowego rekordu. Rekordy usunięte logicznie pozostają bez zmian. Nie uruchamiaj seedera równolegle z ręcznymi zmianami słowników — schemat nie ma ograniczeń ich unikalności. Identyfikatory kategorii służą do kontroli danych i mapowania fitmentów; seeder pojazdów nie zapisuje ich jako relacji w PostgreSQL.

## Produkty Bolmy — etap 1

```sh
npm run db-seed:bolma-products
npm run db-seed:bolma-products:apply
```

Wymagania: migracje z zadania 1, wygenerowany klient Prisma, zseedowane słowniki działów i pojazdów oraz istniejąca konfiguracja `DATABASE_URL` i `BOLMA_PRODUCTS_CATALOG_MYSQL_*`. Importer nie dodaje tabel ani pól do schematu bazy.

Cały importer znajduje się w `src/cli/seedBolmaProduct`: `main.ts` obsługuje CLI, a pozostałe pliki zawierają parser Zod, mapper, repozytorium, serwis przebiegu, stałe i raport. Kod nie jest podpięty do endpointów. Korzysta z istniejącej konfiguracji połączenia MySQL Bolmy oraz wspólnego katalogu pojazdów.

CLI odczytuje bezpośrednio MySQL: tabelę `products`, rekordy `status = 1`, rosnąco po `id`, zgodnie z zakresem cronowego syncu Monday. Nie odrzuca pustych SKU w zapytaniu, aby znalazły się w raporcie. Importuje wyłącznie `nr_kat` → SKU, `pozycja_magazynowa` → `warehouseLocation`, `department_sign` → istniejący dział oraz `id_kat` → fitmenty ze wspólnego, zatwierdzonego katalogu pojazdów. Nie wyciąga pojazdów z tytułu produktu.

Każda kategoria może wskazywać wiele zatwierdzonych fitmentów — zapisywane są wszystkie, a pierwszy w kolejności katalogu jest główny. Kategoria z samą marką lub modelem nie otrzymuje dopowiedzianej generacji. Nieznana/pusta kategoria daje produkt bez fitmentu i ostrzeżenie; nieznany/pusty dział pozostaje pusty z ostrzeżeniem. Brak konkretnej marki/modelu/generacji wskazanej przez katalog lub niejednoznaczny słownik daje błąd bez częściowego zapisu. Importer nie tworzy słowników.

Nowy produkt otrzymuje `isLegacy = true`, `contentVersion = 0`. Nazwy, opisy, zdjęcia, ceny, wymiary, waga i ilość pozostają puste; tablice zdjęć i OEM są puste. Nie wykorzystuje `quantity` z Bolmy i nie ustawia domyślnego zera. Uzupełnienie danych z BaseLinkera to osobny, późniejszy etap.

Trybem domyślnym jest podgląd (również jawnie `--dry-run`): odczytuje MySQL i PostgreSQL, tworzy wyłącznie lokalny raport, bez zapisów do baz. `npm run db-seed:bolma-products:apply` włącza zapis przez flagę `--apply` wpisaną bezpośrednio w polecenie package.json, zgodnie z konwencją Monday. Obsługiwane jest też `npm run db-seed:bolma-products --apply`: skrypt odczytuje `npm_config_apply`, gdy npm przejmie flagę zamiast przekazać ją w argumentach procesu. Jednoczesne `--apply --dry-run` jest błędem. `--output` ustala plik `.jsonl`; domyślnie powstaje `reports/bolma-products-<czas>.jsonl`. Istniejący raport nie jest nadpisywany. `--help` nie inicjalizuje klientów baz.

Powielenia i istniejące produkty są rozpoznawane wyłącznie po SKU. Importer nie przechowuje trwałego powiązania z rekordem Bolmy. Brak SKU daje `skipped`. Dla powtórzonego SKU w aktywnym zestawie źródłowym wybierany jest rekord o najwyższym liczbowym `products.id` (najpóźniejszy dodany rekord, nie data ostatniej edycji). Wszystkie importowane pola, w tym kategoria do fitmentów, pochodzą z tego jednego rekordu. Starsze wystąpienia otrzymują `skipped` z ID wybranego rekordu. Błąd najpóźniejszego rekordu nie powoduje powrotu do starszej wersji. Jeden istniejący, aktywny produkt legacy o tym SKU daje `existing` i pozostaje bez zmian. Wiele produktów o tym SKU, produkt zarządzany lub usunięty dają konflikt. Importer nie nadpisuje ani nie scala produktów. ID Bolmy ustala kolejność wersji w obrębie tego samego SKU oraz jest informacją w raporcie i komentarzu audytu; nie służy do dopasowania produktów. EAN również nie służy do dopasowania.

Każdy zapis produktu, fitmentów i audytu `CREATE` użytkownika technicznego `cli:bolma-product-import` jest jedną transakcją `Serializable`. Błąd wycofuje cały rekord. Ponowienie tego samego polecenia pomija istniejące SKU i próbuje pozostałych rekordów. Zmiana SKU oznacza dla importera nowy produkt, niezależnie od ID Bolmy. Konflikty równoległych zapisów są raportowane i wymagają ponowienia. Nie uruchamiaj importu równolegle ze zmianami SKU lub słowników w panelu — schemat produktu nie wymusza globalnej unikalności SKU.

Raport JSONL zawiera nagłówek, po jednej linii na rekord oraz końcowe podsumowanie. Rekord ma numer w odczytanym zestawie, ID Bolmy, SKU, wynik (`created`, `would_create` w podglądzie, `existing`, `skipped`, `conflict`, `error`), przyczynę, ostrzeżenia, a dla nowych produktów także zmapowane dane i po zapisie ID produktu. Każda zakończona linia jest opróżniana na dysk. Ctrl+C/SIGTERM kończy bieżący rekord i zamyka raport z `completed = false`; po twardym przerwaniu raport może nie mieć podsumowania. Jeżeli proces padnie po zatwierdzeniu transakcji, a przed linią raportu, powtórzenie rozpozna istniejące SKU. Błędy/konflikty dają kod wyjścia 1, przerwanie 130. `completed = true` oznacza koniec przebiegu, nie brak konfliktów — sprawdź liczniki.

Cały aktywny zestaw źródłowy jest odczytywany do pamięci przed zapisem, aby przed zapisem wybrać najpóźniejszy rekord każdego SKU. Sortowanie SQL używa `p.id`, a nie tekstowego aliasu `CAST(p.id AS CHAR) AS id`. Podgląd nie gwarantuje identycznego wyniku późniejszego zapisu, jeżeli źródło lub baza docelowa ulegną zmianie. Istniejące produkty nie są naprawiane przez ponowienie; dotyczy to także fitmentów pozostawionych wcześniej pustych z ostrzeżeniem.

Ten etap nie zawiera danych kont i ofert, więc nie tworzy listingów. Raport wskazuje ich brak. Importer nie importuje usług produktu uruchamiających synchronizację, nie dodaje zadań BullMQ, nie wywołuje zewnętrznych API i nie zapisuje niczego do MySQL ani marketplace. Nie dodaje panelu uploadu.

Dokumentacja Swagger UI jest dostępna pod `/docs`. Po zmianie API aktualizuj plik `docs` odpowiedniego modułu i regeneruj oba pliki wynikowe. `npm run build` regeneruje Swagger, ale nie kolekcję Postmana. Generator Swagger zgłosi błąd przy brakującej lub nieistniejącej metodzie/ścieżce; zgodność pól, walidacji, odpowiedzi i uprawnień należy sprawdzić z kontrolerem, schematem i serwisem.

Uwierzytelnianie korzysta z sesji cookie `behemot-api-sid`, bez tokenów Bearer. W Postmanie najpierw wykonaj `POST /auth/login` i pozostaw włączony cookie jar. Przed operacjami zależnymi ustaw zmienne identyfikatorów zasobów. Skrypty kolekcji zapisują ID po utworzeniu zasobu; nie wykonują się podczas generowania kolekcji. Zmienne szablonów ogłoszeń, np. `{{customName}}`, są składnią API — nie definiuj ich jako zmiennych Postmana, jeśli mają trafić do backendu dosłownie.
