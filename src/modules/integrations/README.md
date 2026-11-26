# Integracje

Ten dokument opisuje uzgodniony podział modułu. Przed dodaniem obsługi kolejnego API zachowaj poniższe granice odpowiedzialności.

## Stan obecny i docelowa struktura

Obecnie istnieją wspólny odczyt integracji dla panelu, połączenie MySQL Bolmy, dodawanie kont ERLI, PrestaShop i eMAG oraz usuwanie kont marketplace z ich ofertami. Asynchroniczny kontrakt `MarketplaceAdapter.prepareConfiguration()` obejmuje walidację tokenu, pobranie danych sklepu z API i przygotowanie szyfrowanej konfiguracji. Konto jest zapisywane ze statusem `CONNECTED` dopiero po sukcesie odczytu danych konta z API dostawcy.

Ponowna weryfikacja i odświeżanie danych istniejących kont ERLI, PrestaShop i eMAG są dostępne przez wspólny kontrakt `MarketplaceAdapter.checkConnection(context)`. Dodawanie konta korzysta z tej samej metody, bez powielania odczytu i mapowania danych. Wymiana tokenu, OAuth i synchronizacja nie są jeszcze zaimplementowane. Folder Allegro w drzewie poniżej jest planem — dodaj go dopiero wraz z implementacją.

```text
integrations/
├── integration.routes.ts          # wspólny odczyt dla panelu
├── integration.controller.ts
├── integration.service.ts         # zestawienie Bolmy i kont marketplace
├── docs/
├── bolma/                         # istniejące źródło katalogu MySQL
└── marketplace/
    ├── marketplaceIntegration.service.ts
    ├── marketplaceAdapter.factory.ts  # obecnie obsługuje ERLI, PrestaShop i eMAG
    ├── repositories/
    │   └── marketplaceIntegrationRepository.ts
    ├── types/
    │   └── marketplaceAdapter.types.ts
    ├── schemas/
    │   └── marketplaceIntegration.schema.ts
    └── adapters/
        ├── allegro/
        │   ├── allegro.adapter.ts
        │   └── allegro.schema.ts     # walidacja konfiguracji dostawcy
        ├── emag/
        │   ├── emag.adapter.ts
        │   ├── emag.apiClient.ts
        │   └── emag.schema.ts
        ├── erli/
        │   ├── erli.adapter.ts
        │   ├── erli.apiClient.ts
        │   └── erli.schema.ts
        └── prestashop/
            ├── prestashop.adapter.ts
            ├── prestashop.apiClient.ts
            └── prestashop.schema.ts
```

## Podział odpowiedzialności

- Wspólny serwis integracji składa dane do panelu.
- Serwis marketplace koordynuje operacje na kontach i zapis ich wyników.
- Repozytorium marketplace odpowiada za dostęp do tabeli `MarketplaceIntegration`. Odczyt dla panelu jawnie wyklucza sekrety i surowe ustawienia. Login konta w `externalUsername` może być prezentowany w panelu.
- Adapter waliduje konfigurację dostawcy i przygotowuje szyfrowane dane do zapisu. Docelowo odpowiada także za komunikację z dostawcą, mapowanie odpowiedzi i błędów. Nie obsługuje żądań Express ani zapisu przez Prisma.
- Bolma pozostaje niezależnym źródłem katalogu; nie implementuje kontraktu marketplace.

## Organizacja dostawców i kontrakt

- Każdy dostawca ma własny folder `marketplace/adapters/<channel>/`. Jego implementacją wejściową jest `<channel>.adapter.ts`.
- Klasa adaptera implementuje wspólny interfejs, np. `AllegroAdapter implements MarketplaceAdapter`. Wymagane metody wymusza `implements`; nie potrzebujemy dziedziczenia, metod wirtualnych ani wspólnej klasy abstrakcyjnej.
- Kod autoryzacji, klienta API, schematów i mapowania danego dostawcy pozostaje w jego folderze. Wydzielaj kolejne pliki dopiero, gdy wymaga tego rzeczywista implementacja. Nie twórz obowiązkowego kompletu pustych serwisów i klientów dla każdego kanału.
- Różnice konfiguracji w `settings` waliduj schematem Zod właściwym dla dostawcy. Nie traktuj tego pola jako dowolnego, nietypowanego worka danych.
- Wspólna tabela `MarketplaceIntegration` przechowuje konta wszystkich kanałów. Dwa konta Allegro to dwa rekordy korzystające z tej samej klasy adaptera, z osobną konfiguracją i danymi dostępowymi.
- `ProductExternalListing` przechowuje powiązania ofert z kontami. Nie twórz osobnych modeli kont i ofert dla każdego marketplace.
- Nie dodawaj metod na zapas ani pustych implementacji tylko po to, aby spełnić rozbudowany interfejs. Operacje specyficzne dla jednego dostawcy nie powinny wymuszać atrap w pozostałych adapterach.

## Dodawanie kolejnego dostawcy

1. Dodaj implementację `MarketplaceAdapter` w `adapters/<channel>/<channel>.adapter.ts`. Kontrakt obejmuje `prepareConfiguration(input, integrationId, market?)` oraz `checkConnection(context)`. Pierwsza metoda przygotowuje szyfrowaną konfigurację, korzystając z drugiej do sprawdzania połączenia. `checkConnection` zwraca `Promise<MarketplaceAccountData>`: nazwę, tożsamość i zwalidowane ustawienia konta; nie zapisuje do bazy. Kontekst zawiera dane potrzebne przez poszczególne adaptery: opcjonalny odszyfrowany klucz API lub login i odszyfrowane hasło, środowisko oraz opcjonalne `baseUrl` i `market`. Każdy adapter waliduje swój wymagany zestaw danych. Przy wdrażaniu OAuth rozszerz typy o rzeczywiście wymagane dane.
2. Dodaj schemat Zod konfiguracji dostawcy i przygotowanie danych dostępowych po stronie serwera. Nie przekazuj zaszyfrowanych pól bezpośrednio do klienta API ani sekretów do panelu i logów.
3. Rozszerz `marketplaceAdapter.factory.ts`: zwykłą funkcję wybierającą adapter według `MarketplaceIntegrationChannel`. Nieobsługiwane kanały jawnie odrzucają operację.
4. Przy tworzeniu konta serwis generuje jego identyfikator przed szyfrowaniem. Przy kolejnych operacjach pobiera konto z bazy. Konfiguracja i dane dostępowe dotyczą konkretnego konta; nie przechowuj jednego globalnego adaptera z tokenem dla całego kanału.
5. Dodaj endpoint operacji z odpowiednimi uprawnieniami i aktualizacją diagnostyki konta. Długie synchronizacje wykorzystają istniejący BullMQ; zadania przekazują identyfikatory, a aktualne konto jest pobierane przy wykonaniu.

Nie dodawaj osobnych modeli Prisma dla każdego kanału, pustych klientów API ani wspólnej klasy bazowej bez rzeczywistej potrzeby. Kontrakt rozszerzamy wraz z kolejnymi wdrażanymi operacjami. Wspólny `IntegrationEnvironment` może później służyć również integracjom kurierskim, które otrzymają własny kontrakt.

## Konfiguracja ERLI

- `POST /integrations/marketplace/ERLI`, body: `{ "token": "..." }`. Wymaga `INTEGRATION:CREATE`, zwraca `201` i bezpieczne dane konta. Inne pola body są odrzucane. Nie przesyłaj prefiksu `Bearer` ani białych znaków wewnątrz tokenu.
- Podczas dodawania konta adapter wywołuje [GET /me — pobierz mój sklep](https://erli.pl/svc/shop-api/doc/reference/#/shop/get_me). Zapisuje nazwę sklepu w `name` i `externalUsername`, identyfikator jako tekst w `externalAccountId`, status `CONNECTED` i `lastConnectionCheckAt`. W `settings` zapisuje zwalidowane `shopActive`, `scopes` i `markets`.
- Konto zachowuje domyślne środowisko `PRODUCTION`. Lista rynków nie wskazuje jednoznacznie rynku bazowego, więc nie ustawiamy arbitralnie pola `market`. `shopActive` z ERLI jest niezależne od lokalnego `isEnabled`; `CONNECTED` oznacza skuteczny odczyt danych konta.
- [ERLI wymaga klucza API w nagłówku Authorization: Bearer](https://erli.pl/svc/shop-api/doc/). Klient ma limit czasu 10 sekund, nie podąża za przekierowaniami i nie ujawnia tokenu ani surowej odpowiedzi w błędach. Odrzucony token zwraca lokalne `422`, bez wylogowywania użytkownika panelu; limit ERLI zwraca `429`.
- Przy błędzie API lub walidacji odpowiedzi nowe konto nie jest zapisywane. Starsze wpisy `PENDING` można uzupełnić przyciskiem sprawdzania połączenia. Ponowne dodanie tego samego sklepu odrzuca wspólna walidacja duplikatów.
- Repozytorium zwraca wyłącznie jawną projekcję bez sekretów. Odpowiedź API i log audytowy nie zawierają tokenu ani jego szyfrogramu.
- Frontend ma osobny formularz `components/erli/ErliConfigurationDialog.tsx`, korzystający ze wspólnych komponentów shadcn/ui. Formularze kolejnych dostawców mogą przyjmować inne dane; nie buduj jednego formularza z rosnącą liczbą warunkowych parametrów.
- Uprawnienie `INTEGRATION:CREATE` jest częścią wspólnej konfiguracji uprawnień. Nie dodajemy osobnej migracji danych dla jego przypisania; obowiązuje istniejący mechanizm seedowania i zarządzania rolami.
- Klienci HTTP frontendu są rozdzieleni: `src/api/integrations/IntegrationApiClient.ts` odpowiada za wspólny odczyt, sprawdzanie połączenia i usuwanie, `erli/ErliApiClient.ts` za operacje ERLI, `prestashop/PrestashopApiClient.ts` za operacje PrestaShop, a `bolma/BolmaApiClient.ts` za operacje Bolmy. Kolejnych dostawców dodawaj w osobnych podfolderach.

## Konfiguracja PrestaShop

- `POST /integrations/marketplace/PRESTASHOP`, body: `{ "baseUrl": "https://sklep.pl", "apiKey": "..." }`. Wymaga `INTEGRATION:CREATE` i korzysta ze wspólnej fabryki, serwisu, szyfrowania i repozytorium. Klucz wymaga uprawnienia GET do zasobu `shops`.
- Każda instalacja ma swój adres, przechowywany w istniejącym polu `MarketplaceIntegration.baseUrl`, bez nowej zmiennej `.env`. Przyjmujemy adres sklepu (również w podkatalogu) lub kończący się na `/api/`. Zapisujemy znormalizowany adres API z końcowym ukośnikiem.
- Adapter pobiera `GET <baseUrl>shops?display=full&output_format=JSON&limit=1`. Zgodnie z ustaleniem wybieramy pierwszy zwrócony sklep, bez selektora multistore. Tak samo działa ponowne `checkConnection`; nie przypinamy odczytu do poprzednio zapisanego ID sklepu.
- Nazwa trafia do `name` i `externalUsername`, ID do `externalAccountId`, aktywność i ID grupy do zwalidowanych `settings`. `CONNECTED` oznacza poprawną autoryzację i odczyt; aktywność sklepu jest niezależna od lokalnego `isEnabled`.
- [Autoryzacja Webservice PrestaShop](https://devdocs.prestashop-project.org/9/webservice/tutorials/testing-access/) używa nagłówka Basic z kluczem jako nazwą użytkownika i pustym hasłem. Klucz nigdy nie trafia do URL-a. Dane i nazwa sklepu pochodzą z [zasobu shops](https://devdocs.prestashop-project.org/9/webservice/resources/shops/).
- Adres HTTPS jest ustawiany przez administratora, bez loginu, hasła, query i fragmentu. Klient korzysta ze zwykłego `fetch`, z limitem czasu 10 sekund i wyłączonym śledzeniem przekierowań, analogicznie do ERLI. Nie filtrujemy adresów IP ani nie obsługujemy DNS ręcznie; sklep może działać również w sieci wewnętrznej dostępnej dla backendu.
- Formularz `components/prestashop/PrestashopConfigurationDialog.tsx` jest oddzielny od ERLI. Wspólne szczegóły pokazują adres API oraz pozwalają sprawdzać połączenie i odświeżać dane. Wspólne usuwanie obejmuje również oferty PrestaShop.

## Konfiguracja eMAG

- `POST /integrations/marketplace/EMAG` przyjmuje raz `{ "username": "konto@example.com", "password": "..." }`. Wspólny serwis przechodzi po rynkach deklarowanych przez adapter (`RO`, `BG`, `HU`) i tworzy osobny wpis dla każdego poprawnie zweryfikowanego rynku. Zwraca HTTP 200 z `{ results: [{ market, status, error }] }`; status to `CONNECTED`, `EXISTING` albo `ERROR`. Błąd jednego rynku nie blokuje pozostałych. ERLI i PrestaShop nadal zwracają pojedynczą integrację z HTTP 201.
- eMAG ma dokładnie trzy pliki: `emag.adapter.ts`, `emag.apiClient.ts`, `emag.schema.ts`. Adapter korzysta ze wspólnego serwisu i repozytorium. Nie ma osobnego serwisu per rynek, specjalnych metod zapisu ani blokad SQL. Opcjonalne `markets` adaptera oraz parametr `market` w `prepareConfiguration` obsługuje wspólny serwis.
- E-mail trafia do `externalUsername`, a hasło do `encryptedPassword`, szyfrowane z kontekstem `marketplace:<integrationId>:encryptedPassword`.
- Sprawdzanie dostępu wykonuje `POST <adres API rynku>product_offer/count` przez HTTP Basic. `checkConnection` wybiera adres według pola `market` rekordu (dla starszych wpisów bez rynku używa RO). Wymagane są uprawnienia API i dozwolone IP serwera. Odpowiedź musi zawierać `isError: false`.
- Publiczna dokumentacja eMAG nie udostępnia odpowiednika profilu `/me`. Nazwa konfiguracji pochodzi z e-maila, `externalAccountId` pozostaje `null`. Nie zgadujemy tożsamości sprzedawcy na podstawie ofert.
- Formularz ma tylko e-mail i hasło; po zakończeniu odświeża listę i pokazuje wynik osobno dla każdego kraju wraz z flagą. Ponowienie pomija zapis istniejących konfiguracji. Sprawdzanie połączenia i usuwanie korzystają ze wspólnych metod.
- Trzy rekordy reprezentują jedno konto eMAG na trzech rynkach. Docelowo produkt ma osobne powiązania ofert z tymi rekordami, ale operacje dostawcy pozostają wspólne: przyszła metoda publikacji przyjmie opcjonalny rynek, a jego brak będzie oznaczał wszystkie rynki konta. Publikacja nie jest jeszcze zaimplementowana; nie twórz osobnych serwisów krajowych.

## Stałe adresy API

Adresy dostawców są konfigurowane wyłącznie w środowisku backendu: `ERLI_API_BASE_URL`, `EMAG_RO_API_BASE_URL`, `EMAG_BG_API_BASE_URL`, `EMAG_HU_API_BASE_URL`. Są wymagane, walidowane przy starcie i muszą kończyć się ukośnikiem. Wartości referencyjne są w `.env.example`. Zestawienie adresów eMAG eksportuje `src/config/env.ts`; klient wybiera adres według rynku. Adres konkretnego sklepu PrestaShop nadal pochodzi z formularza i jest zapisywany w bazie.

## Wspólna walidacja duplikatów

Przed zapisem `MarketplaceIntegrationService.createIntegration` wywołuje `MarketplaceIntegrationRepository.findExisting`. Dla kont ze zdalnym ID sprawdzamy kanał, środowisko, rynek, ID i adres instalacji (istotne dla PrestaShop). Gdy zdalne ID nie jest dostępne, sprawdzamy kanał, środowisko, rynek i nazwę użytkownika bez rozróżniania wielkości liter — tak działa eMAG. Usunięte wpisy są pomijane. Duplikat pojedynczej konfiguracji zwraca HTTP 409, a w zbiorczym wyniku eMAG status `EXISTING` dla danego rynku. To zwykła walidacja w aplikacji, zgodna z pozostałymi modułami; nie dodajemy specjalnych blokad SQL ani migracji.

## Sprawdzanie połączenia i odświeżanie danych

`POST /integrations/marketplace/:id/check-status` wymaga `INTEGRATION:UPDATE`. Serwis pobiera aktywny rekord z wewnętrzną projekcją sekretów, wybiera adapter i odszyfrowuje klucz lub hasło z kontekstem konkretnego konta. Sekret nie trafia do odpowiedzi ani audytu.

Adapter ERLI realizuje `checkConnection` przez ten sam `GET /me` co przy dodawaniu konta. Środowisko `SANDBOX` jest jawnie odrzucane, zamiast kierowania jego tokenu na produkcyjny endpoint. Sukces odświeża nazwę, identyfikator i ustawienia konta, zapisuje `CONNECTED` oraz `lastConnectionCheckAt` i czyści diagnostykę wcześniejszego błędu. Nie zmienia `isEnabled`.

Nieudane sprawdzenie zapisuje `ERROR`, czas sprawdzenia i bezpieczny komunikat błędu w `lastErrorMessage` oraz `lastErrorAt`. Zachowuje wcześniejsze dane sklepu. Zakończona próba zwraca HTTP `200` z `{ integration, error }`; `error` jest `null` przy sukcesie. Błędy samego żądania, brak rekordu i nieobsługiwany kanał zwracają odpowiednie błędy HTTP. Zapis wyniku zawsze wymaga `deletedAt: null`, więc sprawdzenie nie przywróci konta usuniętego w trakcie żądania.

Przycisk „Sprawdź połączenie i odśwież dane” jest dostępny w szczegółach kont ERLI, PrestaShop i eMAG dla użytkownika z uprawnieniem aktualizacji. Wynik aktualizuje otwarty modal i pamięć zapytania listy integracji. Błąd połączenia pokazuje komunikat i zapisany status błędu. Bolma ma osobny mechanizm diagnostyczny i nie korzysta z tego endpointu.

## Usuwanie integracji

`DELETE /integrations/marketplace/:id` wymaga `INTEGRATION:DELETE`. Usuwanie jest wspólną operacją serwisu i repozytorium, bez udziału adapterów oraz bez zapytań do marketplace. Bolma pochodzi z konfiguracji środowiska i nie podlega temu endpointowi.

Jedna transakcja ustawia `deletedAt` na integracji, powiązanych `ProductExternalListing` oraz `ProductExternalListingFitment`. Oferty nie blokują usunięcia; usuwamy je razem z integracją. Same produkty i ich `ProductFitment` pozostają. Integracja zostaje wyłączona, wszystkie pola tokenów, klucza API i hasła są czyszczone. Audyt zapisuje wyłącznie bezpieczną projekcję konta.

Frontend korzysta ze wspólnego `IntegrationDeleteDialog` i po sukcesie unieważnia zapytania integracji oraz produktów, aby usunięte oferty zniknęły także z widoków produktów. Nie dodajemy migracji danych dla przypisania uprawnienia; obowiązuje istniejący mechanizm zarządzania rolami.

## Szyfrowanie sekretów

Wspólny moduł `src/shared/utils/secretEncryption.ts` udostępnia `encryptSecret(value, context)` i `decryptSecret(value, context)`. Korzysta z [AES-256-GCM w node:crypto](https://nodejs.org/api/crypto.html), losowego 12-bajtowego nonce i 16-bajtowego tagu. Zapis ma format `v1:keyId:nonceHex:tagHex:ciphertextHex`; `keyId` jest identyfikatorem wyprowadzonym z klucza, nie jego wartością.

Klucz `INTEGRATION_ENCRYPTION_KEY` w środowisku backendu musi mieć 64 znaki szesnastkowe (32 losowe bajty). Generuj go raz, zachowaj poza Git i zabezpiecz jego kopię. API oraz worker korzystające z tych samych sekretów muszą otrzymać ten sam klucz. Nie używaj `SESSION_SECRET` ani zmiennych `VITE_*` do szyfrowania integracji. `.env.example` zawiera polecenie generowania, bez rzeczywistego klucza.

Dla ERLI kontekstem jest `marketplace:<integrationId>:encryptedApiKey`. Odszyfrowanie wymaga dokładnie tego samego kontekstu; chroni to przed podmianą szyfrogramów między rekordami i polami.

Aktualnie obsługiwany jest jeden klucz. Nie wymieniaj go po zapisaniu sekretów bez procedury odszyfrowania starym i ponownego zaszyfrowania nowym kluczem albo wdrożenia obsługi wielu kluczy. Utrata klucza wymaga ponownego wprowadzenia tokenów. Nie umieszczaj sekretów w logach, URL-ach, audycie ani zadaniach BullMQ.
