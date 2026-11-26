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

## Wspólny seed produktów: Bolma → BaseLinker

```sh
npm run db-seed:products
npm run db-seed:products:apply
```

To jedyne dwie komendy importu produktów: pierwsza wykonuje podgląd obu etapów, druga zapis obu etapów. Flaga `--apply` jest wpisana w alias npm. Obsługiwane jest również `npm_config_apply`, jeśli npm przejmie flagę. Poprzednie osobne komendy Bolmy i BaseLinkera zostały usunięte. Seeder pojazdów jest niezależny.

`src/cli/seedProducts/main.ts` odpowiada za argumenty, kolejność, obsługę sygnałów i zamknięcie klientów baz. Etapy są osobnymi funkcjami: `seedBolmaProduct/runBolmaProductImport.ts` oraz `seedBaselinkerProduct/runBaselinkerProductImport.ts`. Każdy ma własny parser, mapper, repozytorium, serwis, stałe i raport. Nie uruchamiamy podprocesów ani zagnieżdżonych komend npm. Import nie dodaje endpointów, tabel ani pól bazy.

Wymagania: migracje projektu, wygenerowany klient Prisma, zseedowane słowniki działów i pojazdów, `DATABASE_URL` oraz istniejąca konfiguracja `BOLMA_PRODUCTS_CATALOG_MYSQL_*`. Domyślny CSV to `src/cli/seedBaselinkerProduct/data/Eksport_Behemot_2026-11-25_15_59.csv`, skopiowany z dostarczonego surowego eksportu bez modyfikacji. Oryginały w Downloads pozostają bez zmian. Nie zapisuj eksportu w Excelu przed importem, ponieważ może zmienić EAN, SKU i liczby na daty lub zapis wykładniczy.

Opcje po separatorze `--`: `--input <eksport.csv>`, `--output <katalog-raportów>`, `--dry-run`, `--apply`, `--help`. Przykład: `npm run db-seed:products -- --input src/cli/seedBaselinkerProduct/data/inny-eksport.csv`. `--output` wskazuje katalog, nie plik. Domyślnie powstaje `reports/product-seed-<czas>/bolma.jsonl` i `baselinker.jsonl`. Istniejące raporty nie są nadpisywane. Jednoczesne `--apply --dry-run` jest błędem. Pomoc nie inicjalizuje klientów baz.

Oba pliki raportów są otwierane, a cały CSV jest sprawdzany przed odczytem baz i jakimkolwiek zapisem produktów. Błędny CSV lub zajęta ścieżka raportu zatrzyma przebieg przed etapem Bolmy. Pierwszy etap odczytuje MySQL, drugi wyłącznie lokalny CSV. Oba porównują dane z PostgreSQL. Import nie zapisuje do MySQL ani zewnętrznych API, nie tworzy listingów i nie dodaje zadań BullMQ.

### Etap 1 — katalog, nazwy, długość i waga z Bolmy

Odczytujemy tabelę `products`, tylko `status = 1`, rosnąco po liczbowym `p.id`. Dla każdego SKU wybieramy najwyższe ID, a wcześniejsze wystąpienia raportujemy jako pominięte. Dopasowanie jest wyłącznie po przyciętym SKU, bez dopasowania po EAN i bez trwałego powiązania z rekordem źródłowym.

Mapowanie: `nr_kat` → SKU, `tytul` → `customName`, `pozycja_magazynowa` → `warehouseLocation`, `department_sign` → istniejący dział, `id_kat` → fitmenty ze wspólnego zatwierdzonego katalogu pojazdów. Nie wyciągamy pojazdów z tytułu. Każda kategoria może wskazywać wiele zatwierdzonych fitmentów; zapisujemy wszystkie, a pierwszy w kolejności katalogu jest główny. Nie dopowiadamy modeli ani lat. Nieznana/pusta kategoria i dział pozostają puste z ostrzeżeniem. Brak konkretnego pojazdu wymaganego przez mapowanie lub niejednoznaczny słownik daje błąd bez częściowego zapisu. Importer nie tworzy słowników.

Parametry pobieramy z `products_2_params` po `product_id`, zbiorczo dla aktywnych produktów. `param_id = 2` to waga; długość pochodzi najpierw z poprawnego `param_id = 4` (długość całkowita), a przy jego braku lub niepoprawnej wartości z `param_id = 1` (długość). Długości w `mm`, `cm`, `m` przeliczamy na cm, a wagi w `kg`, `g` na kg. Dopuszczamy przecinek lub kropkę dziesiętną i odstępy przed jednostką. Wagi bez jednostki traktujemy jako kg; długości bez jednostki pomijamy. Nie importujemy szerokości ani wysokości z opisów długości.

Z nieregularnych wpisów wybieramy największą wartość po przeliczeniu jednostek: `1065/960 mm` → 106.5 cm, `80 cm / 610 mm` → 80 cm, `930 mm + 70 mm śruba` → 93 cm. Jednostka na końcu listy dotyczy wszystkich jej liczb. Numery obejm i inne liczby bez jednostki w opisach są pomijane. Nie sumujemy wymiarów. Wybrana wartość musi być dodatnia, do 9999.99 i mieścić się po przeliczeniu w dwóch miejscach dziesiętnych bez zaokrąglania. Raport ostrzeżeń zawiera oryginalny nieregularny wpis i wybraną wartość. Brak rozpoznanej wartości lub przekroczenie ograniczeń pola pomija parametr. Sprzeczne lub błędne osobne rekordy tego samego parametru również blokują użycie tego parametru; identyczne po przeliczeniu duplikaty są akceptowane. Nie blokuje to importu pozostałych danych produktu.

Nowy produkt otrzymuje `isLegacy = true`, `contentVersion = 0`, nazwę, dostępną długość i wagę z Bolmy oraz powiązania magazynowe i fitmenty. Pozostałe dane handlowe i ilość pozostają puste. Pusty tytuł nie jest zastępowany SKU ani wymyśloną nazwą. Istniejący aktywny produkt legacy otrzymuje dane z Bolmy wyłącznie w miejsce pustej nazwy i brakującej długości/wagi (null lub wartość niedodatnia). Chroni to dane już uzupełnione przez BaseLinkera. Uzupełnienie jest zapisywane razem z audytem `UPDATE`, a raport zawiera wartości przed i po zmianie.

Brak SKU jest pomijany. Wiele produktów o tym SKU, produkt zarządzany lub usunięty daje konflikt. Produkt przejęty przez Behemotha nigdy nie zostaje ponownie oznaczony jako legacy. Nowy produkt, fitmenty i audyt `CREATE` użytkownika technicznego `cli:bolma-product-import` są zapisywane razem w transakcji `Serializable`. Uzupełnienie nazwy również jest transakcją z blokadą produktu i audytem. Raport Bolmy używa statusów `created`, `would_create`, `updated`, `would_update`, `existing`, `skipped`, `conflict`, `error`.

### Etap 2 — uzupełnienie z BaseLinkera

BaseLinker aktualizuje wyłącznie istniejące produkty legacy, w tym produkty utworzone chwilę wcześniej przez etap Bolmy. SKU nieobecne w Behemocie (w tym customowe) i brak SKU są pomijane. Dopasowanie jest wyłącznie po SKU, z zachowaniem wielkości liter i zer wiodących. Produkt usunięty jest pomijany, a wiele produktów o tym SKU lub produkt zarządzany daje konflikt.

W ramach SKU sortujemy rekordy malejąco po liczbowym ID produktu BaseLinkera. Każde pole jest wybierane osobno: najpierw najwyższe ID, a przy pustym polu, zerze lub opisie bez tekstu kolejne wcześniejsze rekordy. ID nie jest datą ostatniej edycji. Pola mogą pochodzić z różnych rekordów tego samego SKU; nie łączymy różnych SKU. Powtórzone ID w grupie SKU dają konflikt. Zbiorczy wynik zapisujemy przy najwyższym ID, a wcześniejsze wiersze raportujemy jako rekordy pomocnicze `skipped`, także gdy dostarczyły wartości.

Mapowanie pełnego eksportu: `ean` → `ean`, `nazwa_pl` → `customName`, `opis_pl` → `customDescription`, `cena` → `price` (brutto), `waga` → `weight` (kg), `wysokosc`/`dlugosc`/`szerokosc` → `height`/`length`/`width` (cm). Dostępne poprawne dane zastępują odpowiednie wartości produktu. Brak danych w całej grupie SKU pozostawia wartości z Bolmy lub wcześniejszego stanu produktu. W szczególności brak SKU w całym CSV nie kasuje nazwy z Bolmy.

Puste pola i zero, również cena, oznaczają brak. Nie zapisujemy ich i nie kasujemy nimi istniejących wartości. Obowiązują istniejące ograniczenia: nazwa do 255 znaków, liczby do 9999.99 i dwa miejsca po przecinku, EAN jako 8 lub 12–14 cyfr. Niepusta wartość błędna powoduje `error` całego produktu w tym etapie, bez częściowego zapisu, zgadywania, zaokrąglania lub cichego zastąpienia starszą wersją. Dane już zapisane przez etap Bolmy pozostają wtedy zachowane.

Opis jest oczyszczany istniejącymi regułami `prepareListingHtml`: zachowujemy tekst i dozwolone formatowanie, bez obrazów, skryptów, stylów i układu sekcji BaseLinkera. Same puste znaczniki lub obrazy są brakiem treści. Nie pobieramy zdjęć i nie przypisujemy `listingTemplateId`. API potrafi pokazać własną nazwę i opis bez szablonu. Ilość, fitmenty, dział, lokalizacja, producent, zdjęcia, OEM, SKU, `isLegacy` i `contentVersion` nie są zmieniane przez ten etap.

Zmiana produktu i audyt `UPDATE` użytkownika technicznego `cli:baselinker-product-import` są jedną transakcją `Serializable`; przed zapisem produkt jest blokowany i ponownie sprawdzany. Identyczny ponowny import daje `unchanged`, bez zapisu i dodatkowego audytu. `quality.fieldSourceIds` oraz `sourceId` przy każdej zmianie wskazują źródło danego pola. ID pól są też zapisane w komentarzu audytu, bez nowej tabeli mapowań.

Parser obsługuje UTF-8, `;`, cytowane pola, podwojone cudzysłowy i wielowierszowy HTML. Rozpoznaje przekazany krótki eksport 10-kolumnowy i pełny eksport 59-kolumnowy. Mapowanie kolumn i dokładne nagłówki znajdują się w constants. Literalny nagłówek doklejony na końcu wiersza jest sprawdzany i pomijany, również gdy występuje bez separatora po ostatnim cytowanym polu. Parser rozpoznaje go wyłącznie za ostatnią kolumną i przed końcem wiersza/pliku. Nie usuwa podobnego tekstu z opisu. Nieznane końcowe pola i inne uszkodzenia struktury przerywają cały przebieg przed zapisami. Stany magazynowe, ceny zakupu, inne grupy cenowe i dodatkowe opisy nie są importowane.

### Podgląd obu etapów i raporty

Dry run nie zapisuje ani produktów, ani audytu. Przekazuje jednak z etapu Bolmy do etapu BaseLinkera plan utworzenia produktów i uzupełnienia pustych nazw, długości i wag. Dzięki temu drugi etap porównuje dane tak, jakby pierwszy został wykonany. Nowe produkty planowane mają `plannedProduct: true` i nie mają fikcyjnego ID. BaseLinker nie może użyć planu w trybie zapisu — wtedy odczytuje rzeczywisty wynik Bolmy z bazy.

Raport BaseLinkera zawiera statusy `updated`, `would_update`, `unchanged`, `skipped`, `conflict`, `error`, numery rekordów i fizycznych linii CSV, SKU, źródła pól, zmiany przed/po i informacje o brakach. Produkty legacy bez SKU w całym CSV mają osobne wpisy `type: missing_source_product`, nazwę po etapie Bolmy, ID produktu (albo znacznik planowanego utworzenia) i licznik `productsMissingFromExport`. Nie mieszamy ich z brakami pojedynczych pól produktów znalezionych w CSV.

Podsumowanie `completeness` liczy jeden wynik na dopasowany aktywny produkt legacy (również planowany w dry run), w tym wyniki z błędami danych. Nie liczy rekordów pomocniczych, SKU nieobecnych w katalogu ani produktów zarządzanych/usuniętych:

- `matchedProducts` — ocenione produkty;
- `latestIncompleteProducts` / `latestMissingByField` — braki w najnowszym rekordzie BaseLinkera;
- `productsWithFallback` / `fallbackByField` — produkty i pola dobrane ze starszych rekordów;
- `sourceIncompleteProducts` / `sourceMissingByField` — braki po przeszukaniu wszystkich rekordów SKU;
- `productsWithZeroValues` / `zeroValuesByField` — zera w najnowszym rekordzie BaseLinkera;
- `remainingIncompleteProducts` / `remainingMissingByField` — braki po zapisie lub planowanych zmianach; dla błędów pozostaje stan po Bolmie.

Tabela pokazuje: `Brak w najnowszym`, `Ze starszych`, `Brak we wszystkich`, `Brak po zmianach`. Druga kolumna oznacza dobrane wartości, nie potwierdza zapisu — należy sprawdzić także licznik błędów. Niekompletność oznacza brak co najmniej jednego z ośmiu importowanych pól, a nie wszystkich danych wymaganych w panelu. Suma brakujących pól może być większa niż liczba niekompletnych produktów. Końcowy komunikat JSON zawiera podsumowania obu etapów.

### Przerwania i ponowienia

Każdy rekord i jego audyt są atomowe, ale cały przebieg dwóch etapów nie jest jedną transakcją. Błędy pojedynczych rekordów nie blokują pozostałych; po zakończeniu przeglądania Bolmy etap BaseLinkera nadal uzupełnia dostępne produkty. Błąd krytyczny lub przerwanie etapu Bolmy blokuje start BaseLinkera. Błąd drugiego etapu nie cofa wcześniej zatwierdzonych danych Bolmy. Ponowienie rozpoznaje istniejące SKU, uzupełnia nadal puste nazwy i pomija niezmienione dane BaseLinkera.

Każda linia raportu jest opróżniana na dysk. Ctrl+C/SIGTERM kończy bieżący rekord, nie rozpoczyna kolejnego etapu, zamyka raporty i klientów baz. Twarde przerwanie może pozostawić raport bez podsumowania. `completed = true` oznacza koniec przebiegu, nie brak konfliktów/błędów. Błędy/konflikty dają kod wyjścia 1, przerwanie 130. Nie uruchamiaj importu równolegle ze zmianami SKU lub słowników w panelu. Dry run jest prognozą, a późniejsze zmiany źródeł/bazy mogą zmienić wynik zapisu.

Dokumentacja Swagger UI jest dostępna pod `/docs`. Po zmianie API aktualizuj plik `docs` odpowiedniego modułu i regeneruj oba pliki wynikowe. `npm run build` regeneruje Swagger, ale nie kolekcję Postmana. Generator Swagger zgłosi błąd przy brakującej lub nieistniejącej metodzie/ścieżce; zgodność pól, walidacji, odpowiedzi i uprawnień należy sprawdzić z kontrolerem, schematem i serwisem.

Uwierzytelnianie korzysta z sesji cookie `behemot-api-sid`, bez tokenów Bearer. W Postmanie najpierw wykonaj `POST /auth/login` i pozostaw włączony cookie jar. Przed operacjami zależnymi ustaw zmienne identyfikatorów zasobów. Skrypty kolekcji zapisują ID po utworzeniu zasobu; nie wykonują się podczas generowania kolekcji. Zmienne szablonów ogłoszeń, np. `{{customName}}`, są składnią API — nie definiuj ich jako zmiennych Postmana, jeśli mają trafić do backendu dosłownie.
