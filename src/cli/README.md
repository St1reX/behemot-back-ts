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

## Import produktów

Import produktów Bolmy został przeniesiony do modułu `src/modules/imports` i jest uruchamiany z panelu „Integracje → Importy”. Polecenia `db-seed:products`, wspólny seeder i importer BaseLinkera zostały usunięte. Zasady mapowania, uprawnienia, raporty i obsługę przerwań opisuje `src/modules/imports/README.md`.

Dokumentacja Swagger UI jest dostępna pod `/docs`. Po zmianie API aktualizuj plik `docs` odpowiedniego modułu i regeneruj oba pliki wynikowe. `npm run build` regeneruje Swagger, ale nie kolekcję Postmana. Generator Swagger zgłosi błąd przy brakującej lub nieistniejącej metodzie/ścieżce; zgodność pól, walidacji, odpowiedzi i uprawnień należy sprawdzić z kontrolerem, schematem i serwisem.

Uwierzytelnianie korzysta z sesji cookie `behemot-api-sid`, bez tokenów Bearer. W Postmanie najpierw wykonaj `POST /auth/login` i pozostaw włączony cookie jar. Przed operacjami zależnymi ustaw zmienne identyfikatorów zasobów. Skrypty kolekcji zapisują ID po utworzeniu zasobu; nie wykonują się podczas generowania kolekcji. Zmienne szablonów ogłoszeń, np. `{{customName}}`, są składnią API — nie definiuj ich jako zmiennych Postmana, jeśli mają trafić do backendu dosłownie.
