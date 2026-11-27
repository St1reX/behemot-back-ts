# Integracje

Ten dokument opisuje uzgodniony podział modułu. Przed dodaniem obsługi kolejnego API zachowaj poniższe granice odpowiedzialności.

## Stan obecny i docelowa struktura

Panel pobiera konta marketplace oraz konfigurację Bolmy osobnymi zapytaniami. Dostępne są połączenie MySQL Bolmy, dodawanie kont Allegro, ERLI, PrestaShop i eMAG oraz usuwanie kont marketplace z ich ofertami. Asynchroniczny kontrakt `MarketplaceAdapter.prepareConfiguration()` obejmuje walidację tokenu, pobranie danych sklepu z API i przygotowanie szyfrowanej konfiguracji. Konto jest zapisywane ze statusem `CONNECTED` dopiero po sukcesie odczytu danych konta z API dostawcy.

Ponowna weryfikacja i odświeżanie danych istniejących kont Allegro, ERLI, PrestaShop i eMAG są dostępne przez wspólny kontrakt `MarketplaceAdapter.checkConnection(context)`. Adaptery współdzielą odczyt i mapowanie danych konta przy dodawaniu i sprawdzaniu połączenia. Allegro obsługuje OAuth2 Authorization Code i automatyczne odświeżanie tokenów przy korzystaniu z integracji; pozostałe kanały korzystają z własnych danych dostępowych. Synchronizacja ofert nie jest jeszcze zaimplementowana.

```text
modules/
├── bolma/                         # niezależne źródło katalogu MySQL
└── marketplaceIntegrations/
    ├── marketplaceIntegration.routes.ts
    ├── marketplaceIntegration.controller.ts
    ├── marketplaceIntegration.service.ts
    ├── allegro.routes.ts          # /marketplace-integrations/allegro/*
    ├── marketplaceAdapter.factory.ts
    ├── docs/
    ├── repositories/
    ├── types/
    ├── schemas/
    └── adapters/
        ├── allegro/
        ├── emag/
        ├── erli/
        └── prestashop/
```

## Podział odpowiedzialności

- `GET /marketplace-integrations` zwraca tablicę kont marketplace. `GET /bolma/configuration` zwraca bezpieczne dane konfiguracji Bolmy, a `GET /bolma/status` sprawdza jej połączenie. Nie ma wspólnego serwisu ani endpointu zestawiającego te moduły.
- Serwis marketplace koordynuje operacje na kontach i zapis ich wyników.
- Repozytorium marketplace odpowiada za dostęp do tabeli `MarketplaceIntegration`. Odczyt dla panelu jawnie wyklucza sekrety i surowe ustawienia. Login konta w `externalUsername` może być prezentowany w panelu.
- Adapter waliduje konfigurację dostawcy i przygotowuje szyfrowane dane do zapisu. Docelowo odpowiada także za komunikację z dostawcą, mapowanie odpowiedzi i błędów. Nie obsługuje żądań Express ani zapisu przez Prisma.
- Bolma pozostaje niezależnym źródłem katalogu; nie implementuje kontraktu marketplace.

## Organizacja dostawców i kontrakt

- Każdy dostawca ma własny folder `marketplaceIntegrations/adapters/<channel>/`. Jego implementacją wejściową jest `<channel>.adapter.ts`.
- Klasa adaptera implementuje wspólny interfejs, np. `AllegroAdapter implements MarketplaceAdapter`. Wymagane metody wymusza `implements`; nie potrzebujemy dziedziczenia, metod wirtualnych ani wspólnej klasy abstrakcyjnej.
- Kod autoryzacji, klienta API, schematów i mapowania danego dostawcy pozostaje w jego folderze. Wydzielaj kolejne pliki dopiero, gdy wymaga tego rzeczywista implementacja. Nie twórz obowiązkowego kompletu pustych serwisów i klientów dla każdego kanału.
- Różnice konfiguracji w `settings` waliduj schematem Zod właściwym dla dostawcy. Nie traktuj tego pola jako dowolnego, nietypowanego worka danych.
- Wspólna tabela `MarketplaceIntegration` przechowuje konta wszystkich kanałów. Dwa konta Allegro to dwa rekordy korzystające z tej samej klasy adaptera, z osobną konfiguracją i danymi dostępowymi.
- `ProductExternalListing` przechowuje powiązania ofert z kontami. Nie twórz osobnych modeli kont i ofert dla każdego marketplace.
- Nie dodawaj metod na zapas ani pustych implementacji tylko po to, aby spełnić rozbudowany interfejs. Operacje specyficzne dla jednego dostawcy nie powinny wymuszać atrap w pozostałych adapterach.

## Dodawanie kolejnego dostawcy

1. Dodaj implementację `MarketplaceAdapter` w `adapters/<channel>/<channel>.adapter.ts`. Kontrakt obejmuje `prepareConfiguration(input, integrationId)` oraz `checkConnection(context)`. Pierwsza metoda przygotowuje szyfrowaną konfigurację po weryfikacji danych konta. Przy OAuth wymienia kod na tokeny, a przy pozostałych kanałach korzysta bezpośrednio z checkConnection. `checkConnection` zwraca `Promise<MarketplaceAccountData>`: nazwę, tożsamość i zwalidowane ustawienia konta. Allegro może przy tej operacji odświeżyć i zapisać tokeny, a wspólny serwis zapisuje wynik diagnostyki. Kontekst zawiera dane potrzebne przez poszczególne adaptery: opcjonalny odszyfrowany klucz API lub login i odszyfrowane hasło, środowisko oraz zapisany `baseUrl`, opcjonalny `market`, lokalny `integrationId` (Allegro odczytuje aktualną konfigurację i tokeny przez repozytorium). Każdy adapter waliduje swój wymagany zestaw danych. Kontrakt przygotowanej konfiguracji obejmuje również zaszyfrowane access/refresh tokeny i termin ważności.
2. Dodaj schemat Zod konfiguracji dostawcy i przygotowanie danych dostępowych po stronie serwera. Nie przekazuj zaszyfrowanych pól bezpośrednio do klienta API ani sekretów do panelu i logów.
3. Rozszerz `marketplaceAdapter.factory.ts`: zwykłą funkcję wybierającą adapter według `MarketplaceIntegrationChannel`. Nieobsługiwane kanały jawnie odrzucają operację.
4. Przy tworzeniu konta serwis generuje jego identyfikator przed szyfrowaniem. Przy kolejnych operacjach pobiera konto z bazy. Konfiguracja i dane dostępowe dotyczą konkretnego konta; nie przechowuj jednego globalnego adaptera z tokenem dla całego kanału.
5. Dodaj endpoint operacji z odpowiednimi uprawnieniami i aktualizacją diagnostyki konta. Długie synchronizacje wykorzystają istniejący BullMQ; zadania przekazują identyfikatory, a aktualne konto jest pobierane przy wykonaniu.

Nie dodawaj osobnych modeli Prisma dla każdego kanału, pustych klientów API ani wspólnej klasy bazowej bez rzeczywistej potrzeby. Kontrakt rozszerzamy wraz z kolejnymi wdrażanymi operacjami. Wspólny `IntegrationEnvironment` może później służyć również integracjom kurierskim, które otrzymają własny kontrakt.

## Konfiguracja Allegro

- Integracja realizuje [Authorization Code flow](https://developer.allegro.pl/tutorials/uwierzytelnianie-i-autoryzacja-zlq9e75GdIR). Formularz wymaga adresu API, `clientId` i `clientSecret` konkretnej integracji. Dane aplikacji nie pochodzą ze środowiska serwera. Adresy OAuth pozostają w `AllegroApiClient`; nie ma osobnego pliku `allegro.config.ts`. Tak samo działa ponowna autoryzacja: dane należy wprowadzić w formularzu, nie odsyłamy zapisanych sekretów do panelu.
- Obsługujemy produkcję. Formularz wymaga bazowego adresu API, zapisywanego w istniejącym `baseUrl`. Frontend i backend korzystają ze wspólnej dla integracji walidacji adresu HTTPS, bez danych logowania, query i fragmentu. Nie ograniczamy adresu do jednego hosta. Endpointy OAuth są stałymi dostawcy pod `https://allegro.pl/auth/oauth/`, bez zmiennych URL Allegro w `.env`.
- W Allegro Developer zarejestruj aplikację z dostępem do przeglądarki i Authorization Code. Wpisz dokładnie Redirect URI pokazywany w formularzu. `AllegroOAuthService.getCallbackUrl()` buduje go z publicznego `PROD_API_URL` (w development: `DEV_API_URL` i `DEV_API_PORT`) oraz `/marketplace-integrations/allegro/callback`. Jeżeli reverse proxy wystawia backend pod prefiksem, np. `/api`, uwzględnij go w `PROD_API_URL`. Domyślny adres lokalny to `http://localhost:4000/marketplace-integrations/allegro/callback`.
- `GET /marketplace-integrations/allegro/configuration` wymaga jednocześnie `INTEGRATION:CREATE` i `INTEGRATION:UPDATE` i zwraca wyłącznie Redirect URI. Nie ujawnia danych aplikacji ani tokenów.
- `POST /marketplace-integrations/allegro/authorize` przyjmuje `{ "baseUrl": "https://api.allegro.pl/", "clientId": "...", "clientSecret": "..." }` i wymaga jednocześnie `INTEGRATION:CREATE` i `INTEGRATION:UPDATE`. Opcjonalne `integrationId` rozpoczyna ponowną autoryzację istniejącej integracji. Zwraca `authorizationUrl`, pod który frontend przekierowuje przeglądarkę. Wspólny endpoint `POST /marketplace-integrations/ALLEGRO` jest odrzucany, aby nie omijać weryfikacji stanu OAuth.
- Serwer generuje losowy `state`. Zaszyfrowany stan w istniejącym Redisie zawiera konfigurację, dane aplikacji, serwerowy Redirect URI, skrót sesji i ID użytkownika, wygasa po 10 minutach i jest konsumowany atomowo tylko raz. Do Allegro wysyłamy Client ID, `prompt=confirm` i wyłącznie `allegro:api:profile:read`, potrzebne do odczytu konta. Client Secret pozostaje na backendzie. Uprawnienia do ofert i zamówień dodaj dopiero wraz z ich obsługą.
- `GET /marketplace-integrations/allegro/callback` wymaga tej samej zalogowanej sesji. Middleware w `allegro.routes.ts` wymaga zalogowania oraz obu uprawnień: `INTEGRATION:CREATE` i `INTEGRATION:UPDATE`, tak samo jak dla pozostałych endpointów Allegro. Brak sesji zwraca HTTP 401, a brak któregokolwiek uprawnienia HTTP 403, przed wykonaniem callbacku. Obsługuje odmowę zgody, błędny/wygasły stan, powtórzenie callbacku, duplikat i błędy dostawcy. Po operacji zwraca `303` do listy integracji z bezpiecznym komunikatem. `trafficLogger` działa bez specjalnych wyjątków dla Allegro.
- Kod wymieniamy natychmiast na tokeny (kod Allegro jest ważny tylko 10 sekund). Token endpoint otrzymuje POST z formularzem URL-encoded i nagłówkiem Basic z Client ID oraz Client Secret podanymi w formularzu. Żądanie ma limit 10 sekund i nie śledzi przekierowań. Surowe błędy Allegro nie trafiają do panelu ani logów.
- Tożsamość sprzedawcy pochodzi z [GET /me](https://developer.allegro.pl/documentation/#operation/meGET): `id` zapisujemy w `externalAccountId`, a `login` w `name` i `externalUsername`. Jedno konto jest jedną integracją. Tworzenie korzysta ze wspólnego serwisu, audytu i kontroli duplikatów. Ponowne połączenie wymaga tego samego ID sprzedawcy, zachowuje lokalne ID integracji, oferty i `isEnabled`.
- Client ID zapisujemy w `encryptedApiKey`, a Client Secret w `encryptedPassword`, przez istniejące AES-GCM z kontekstami `marketplace:<id>:encryptedApiKey` i `marketplace:<id>:encryptedPassword`. Tokeny są szyfrowane analogicznie w `encryptedAccessToken` i `encryptedRefreshToken`. Termin ważności jest liczony z `expires_in`. Odpowiedzi panelu i audyt nie zawierają sekretów ani szyfrogramów.
- Operacje zapisanej integracji przechodzą przez `AllegroAdapter.withAccessToken(integrationId, operation)`. Metoda pobiera aktualną konfigurację i token przez prywatne `getAccessToken()`, a właściwe żądanie do API wykonuje po zwolnieniu blokady. `checkConnection` korzysta z niej do `GET /me`; kolejne operacje adaptera powinny używać tej samej metody. Pierwsze pobranie konta po wymianie kodu odbywa się przed utworzeniem rekordu i korzysta bezpośrednio z nowo otrzymanego tokenu.
- `getAccessToken()` używa istniejącego `MarketplaceIntegrationRepository.withTokenRefreshLock()`. Transakcja blokuje rekord przez `SELECT ... FOR UPDATE`, po czym `findForTokenRefresh()` ponownie odczytuje konfigurację. Jeśli access token jest ważny dłużej niż 60 sekund i nie jest tokenem odrzuconym przez API, zostaje użyty ponownie. W przeciwnym razie adapter odszyfrowuje Client ID, Client Secret i refresh token, wywołuje `AllegroApiClient.refreshTokens()` i zapisuje zaszyfrowaną nową parę wraz z `accessTokenExpiresAt` przez `updateTokens()` w tej samej transakcji. Blokada działa między procesami API/workera oraz serializuje zapis z ponowną autoryzacją i usuwaniem. Limit oczekiwania na blokadę wynosi 10 sekund, transakcji 25 sekund, a pojedynczego żądania HTTP 10 sekund. Dzięki temu oczekiwanie na blokadę pozostawia czas na refresh i zapis przed końcem transakcji.
- Wyłącznie `401` z właściwego API uruchamia jedną próbę uzyskania nowego tokenu i jedno ponowienie operacji. Adapter przekazuje poprzednio odrzucony token do `getAccessToken()`: jeśli inny proces wymienił go wcześniej, używana jest aktualna wersja. Błędy endpointu tokenów i ponowionego żądania nie uruchamiają kolejnego refreshu. `403`, `429`, błędy sieci i serwera nie są podstawą do automatycznego ponowienia.
- `AllegroApiClient.refreshTokens()` wykonuje POST pod `/auth/oauth/token` z `grant_type=refresh_token` i Basic z danych aplikacji zapisanych na integracji. `invalid_grant` wymaga ponownego połączenia, a `invalid_client` sprawdzenia Client ID/Client Secret. Inne błędy zachowują dotychczasowe dane dostępowe i korzystają ze wspólnej diagnostyki. Surowe odpowiedzi OAuth nie są ujawniane. Nie dodajemy serwisu, repozytorium, endpointu ani zadania cyklicznego dla tokenów. Frontend daje sprawdzaniu połączenia 90 sekund na oczekiwanie na blokadę, refresh i jednorazowe ponowienie.
- Przycisk sprawdzania połączenia zachowuje wspólną diagnostykę `CONNECTED`/`ERROR`. Usuwanie korzysta ze wspólnej transakcji i usuwa lokalne dane aplikacji oraz tokeny; nie odwołuje zdalnie zgody Allegro. Brak zmian schematu Prisma i migracji.

## Konfiguracja ERLI

- `POST /marketplace-integrations/ERLI`, body: `{ "baseUrl": "https://erli.pl/svc/shop-api/", "token": "..." }`. Wymaga `INTEGRATION:CREATE`, zwraca `201` i bezpieczne dane konta. Inne pola body są odrzucane. Nie przesyłaj prefiksu `Bearer` ani białych znaków wewnątrz tokenu.
- Podczas dodawania konta adapter wywołuje [GET /me — pobierz mój sklep](https://erli.pl/svc/shop-api/doc/reference/#/shop/get_me). Zapisuje nazwę sklepu w `name` i `externalUsername`, identyfikator jako tekst w `externalAccountId`, status `CONNECTED` i `lastConnectionCheckAt`. W `settings` zapisuje zwalidowane `shopActive`, `scopes` i `markets`.
- Konto zachowuje domyślne środowisko `PRODUCTION`. Lista rynków nie wskazuje jednoznacznie rynku bazowego, więc nie ustawiamy arbitralnie pola `market`. `shopActive` z ERLI jest niezależne od lokalnego `isEnabled`; `CONNECTED` oznacza skuteczny odczyt danych konta.
- [ERLI wymaga klucza API w nagłówku Authorization: Bearer](https://erli.pl/svc/shop-api/doc/). Klient ma limit czasu 10 sekund, nie podąża za przekierowaniami i nie ujawnia tokenu ani surowej odpowiedzi w błędach. Odrzucony token zwraca lokalne `422`, bez wylogowywania użytkownika panelu; limit ERLI zwraca `429`.
- Przy błędzie API lub walidacji odpowiedzi nowe konto nie jest zapisywane. Ponowne dodanie tego samego sklepu odrzuca wspólna walidacja duplikatów.
- Repozytorium zwraca wyłącznie jawną projekcję bez sekretów. Odpowiedź API i log audytowy nie zawierają tokenu ani jego szyfrogramu.
- Frontend ma osobny formularz `components/erli/ErliConfigurationDialog.tsx`, korzystający ze wspólnych komponentów shadcn/ui. Formularze kolejnych dostawców mogą przyjmować inne dane; nie buduj jednego formularza z rosnącą liczbą warunkowych parametrów.
- Uprawnienie `INTEGRATION:CREATE` jest częścią wspólnej konfiguracji uprawnień. Nie dodajemy osobnej migracji danych dla jego przypisania; obowiązuje istniejący mechanizm seedowania i zarządzania rolami.
- Klienci HTTP frontendu są rozdzieleni: `src/api/marketplaceIntegrations/MarketplaceIntegrationApiClient.ts` odpowiada za odczyt kont marketplace, sprawdzanie połączenia i usuwanie, `erli/ErliApiClient.ts` za operacje ERLI, `prestashop/PrestashopApiClient.ts` za operacje PrestaShop, a `src/api/bolma/BolmaApiClient.ts` za operacje Bolmy. Kolejnych dostawców dodawaj w osobnych podfolderach.

## Konfiguracja PrestaShop

- `POST /marketplace-integrations/PRESTASHOP`, body: `{ "baseUrl": "https://sklep.pl", "apiKey": "..." }`. Wymaga `INTEGRATION:CREATE` i korzysta ze wspólnej fabryki, serwisu, szyfrowania i repozytorium. Klucz wymaga uprawnienia GET do zasobu `shops`.
- Każda instalacja ma swój adres, przechowywany w istniejącym polu `MarketplaceIntegration.baseUrl`, bez nowej zmiennej `.env`. Przyjmujemy adres sklepu (również w podkatalogu) lub kończący się na `/api/`. Zapisujemy znormalizowany adres API z końcowym ukośnikiem.
- Adapter pobiera `GET <baseUrl>shops?display=full&output_format=JSON&limit=1`. Zgodnie z ustaleniem wybieramy pierwszy zwrócony sklep, bez selektora multistore. Tak samo działa ponowne `checkConnection`; nie przypinamy odczytu do poprzednio zapisanego ID sklepu.
- Nazwa trafia do `name` i `externalUsername`, ID do `externalAccountId`, aktywność i ID grupy do zwalidowanych `settings`. `CONNECTED` oznacza poprawną autoryzację i odczyt; aktywność sklepu jest niezależna od lokalnego `isEnabled`.
- [Autoryzacja Webservice PrestaShop](https://devdocs.prestashop-project.org/9/webservice/tutorials/testing-access/) używa nagłówka Basic z kluczem jako nazwą użytkownika i pustym hasłem. Klucz nigdy nie trafia do URL-a. Dane i nazwa sklepu pochodzą z [zasobu shops](https://devdocs.prestashop-project.org/9/webservice/resources/shops/).
- Adres HTTPS jest ustawiany przez administratora, bez loginu, hasła, query i fragmentu. Klient korzysta ze zwykłego `fetch`, z limitem czasu 10 sekund i wyłączonym śledzeniem przekierowań, analogicznie do ERLI. Nie filtrujemy adresów IP ani nie obsługujemy DNS ręcznie; sklep może działać również w sieci wewnętrznej dostępnej dla backendu.
- Formularz `components/prestashop/PrestashopConfigurationDialog.tsx` jest oddzielny od ERLI. Wspólne szczegóły pokazują adres API oraz pozwalają sprawdzać połączenie i odświeżać dane. Wspólne usuwanie obejmuje również oferty PrestaShop.

## Konfiguracja eMAG

- `POST /marketplace-integrations/EMAG` przyjmuje `{ "baseUrl": "https://marketplace-api.emag.ro/api-3/", "market": "RO", "username": "konto@example.com", "password": "..." }`. Rynek jest wymagany i może mieć wartość `RO`, `BG` albo `HU`. Jedno żądanie sprawdza i zapisuje jedną integrację, zwracając HTTP 201 z jej bezpiecznymi danymi. Pozostałe rynki dodaje się osobno.
- eMAG ma trzy pliki: `emag.adapter.ts`, `emag.apiClient.ts`, `emag.schema.ts`. Adapter korzysta ze wspólnego serwisu i repozytorium. Wspólny kontrakt nie deklaruje listy rynków, nie wykonuje pętli i nie zwraca zbiorczych wyników.
- E-mail trafia do `externalUsername`, a hasło do `encryptedPassword`, szyfrowane z kontekstem `marketplace:<integrationId>:encryptedPassword`.
- Sprawdzanie dostępu wykonuje `POST <baseUrl>product_offer/count` przez HTTP Basic, zawsze pod adresem API zapisanym na integracji. Wymagane są poprawny rynek, uprawnienia API i dozwolone IP serwera. Odpowiedź musi zawierać `isError: false`.
- Nazwa konfiguracji zawiera rynek i e-mail, a `externalAccountId` pozostaje `null`, ponieważ API nie udostępnia profilu sprzedawcy.
- Formularz ma trzy przyciski z flagami i nazwami krajów, adres API, e-mail i hasło. Szczegóły wyświetlają rynek z tą samą flagą i nazwą. Sprawdzanie połączenia i usuwanie korzystają ze wspólnych metod.
- Każdy rekord reprezentuje konto na jednym wybranym rynku. Powiązania ofert dotyczą tego rekordu; nie tworzymy osobnych serwisów krajowych.

## Adresy API integracji

Każdy formularz marketplace wymaga adresu API. Adres jest walidowany po obu stronach i zapisywany w istniejącym polu `MarketplaceIntegration.baseUrl`. Wymagamy HTTPS bez danych logowania, query i fragmentu; backend normalizuje końcowy ukośnik, aby zachować podaną ścieżkę przy budowaniu adresów zasobów. PrestaShop nadal akceptuje również adres sklepu i dopisuje `/api/`.

Adresy marketplace nie są przechowywane w `.env` ani wybierane automatycznie według rynku. Ponowne sprawdzenie połączenia korzysta z adresu zapisanego na danym koncie. Istniejące konta ERLI/eMAG bez adresu API należy usunąć i dodać ponownie przez formularz — zgodnie z ustaleniem nie migrujemy ich automatycznie. Konfiguracja infrastruktury serwera i źródła MySQL Bolmy pozostaje niezależna.

## Wspólna walidacja duplikatów

Przed zapisem `MarketplaceIntegrationService.createIntegration` wywołuje `MarketplaceIntegrationRepository.findExisting`. Sprawdzamy kanał, środowisko, rynek i adres API. Dla kont ze zdalnym ID sprawdzamy dodatkowo to ID, a przy jego braku nazwę użytkownika bez rozróżniania wielkości liter (eMAG). Usunięte wpisy są pomijane. Duplikat zwraca HTTP 409 dla każdego dostawcy. To zwykła walidacja w aplikacji, zgodna z pozostałymi modułami; nie dodajemy specjalnych blokad SQL ani migracji.

## Sprawdzanie połączenia i odświeżanie danych

`POST /marketplace-integrations/:id/check-status` wymaga `INTEGRATION:UPDATE`. Serwis pobiera aktywny rekord z wewnętrzną projekcją sekretów, wybiera adapter i odszyfrowuje klucz lub hasło z kontekstem konkretnego konta. Sekret nie trafia do odpowiedzi ani audytu.

Adapter ERLI realizuje `checkConnection` przez ten sam `GET /me` co przy dodawaniu konta. Środowisko `SANDBOX` jest jawnie odrzucane, zamiast kierowania jego tokenu na produkcyjny endpoint. Sukces odświeża nazwę, identyfikator i ustawienia konta, zapisuje `CONNECTED` oraz `lastConnectionCheckAt` i czyści diagnostykę wcześniejszego błędu. Nie zmienia `isEnabled`.

Nieudane sprawdzenie zapisuje `ERROR`, czas sprawdzenia i bezpieczny komunikat błędu w `lastErrorMessage` oraz `lastErrorAt`. Zachowuje wcześniejsze dane sklepu. Zakończona próba zwraca HTTP `200` z `{ integration, error }`; `error` jest `null` przy sukcesie. Błędy samego żądania, brak rekordu i nieobsługiwany kanał zwracają odpowiednie błędy HTTP. Zapis wyniku zawsze wymaga `deletedAt: null`, więc sprawdzenie nie przywróci konta usuniętego w trakcie żądania.

Przycisk „Sprawdź połączenie i odśwież dane” jest dostępny w szczegółach kont Allegro, ERLI, PrestaShop i eMAG dla użytkownika z uprawnieniem aktualizacji. Wynik aktualizuje otwarty modal i pamięć zapytania listy integracji. Błąd połączenia pokazuje komunikat i zapisany status błędu. Bolma ma osobny mechanizm diagnostyczny i nie korzysta z tego endpointu.

## Usuwanie integracji

`DELETE /marketplace-integrations/:id` wymaga `INTEGRATION:DELETE`. Usuwanie jest wspólną operacją serwisu i repozytorium, bez udziału adapterów oraz bez zapytań do marketplace. Bolma pochodzi z konfiguracji środowiska i nie podlega temu endpointowi.

Jedna transakcja ustawia `deletedAt` na integracji, powiązanych `ProductExternalListing` oraz `ProductExternalListingFitment`. Oferty nie blokują usunięcia; usuwamy je razem z integracją. Same produkty i ich `ProductFitment` pozostają. Integracja zostaje wyłączona, wszystkie pola tokenów, klucza API i hasła są czyszczone. Audyt zapisuje wyłącznie bezpieczną projekcję konta.

Frontend korzysta ze wspólnego `IntegrationDeleteDialog` i po sukcesie unieważnia zapytania integracji oraz produktów, aby usunięte oferty zniknęły także z widoków produktów. Nie dodajemy migracji danych dla przypisania uprawnienia; obowiązuje istniejący mechanizm zarządzania rolami.

## Szyfrowanie sekretów

Wspólny moduł `src/shared/utils/secretEncryption.ts` udostępnia `encryptSecret(value, context)` i `decryptSecret(value, context)`. Korzysta z [AES-256-GCM w node:crypto](https://nodejs.org/api/crypto.html), losowego 12-bajtowego nonce i 16-bajtowego tagu. Zapis ma format `v1:keyId:nonceHex:tagHex:ciphertextHex`; `keyId` jest identyfikatorem wyprowadzonym z klucza, nie jego wartością.

Klucz `INTEGRATION_ENCRYPTION_KEY` w środowisku backendu musi mieć 64 znaki szesnastkowe (32 losowe bajty). Generuj go raz, zachowaj poza Git i zabezpiecz jego kopię. API oraz worker korzystające z tych samych sekretów muszą otrzymać ten sam klucz. Nie używaj `SESSION_SECRET` ani zmiennych `VITE_*` do szyfrowania integracji. `.env.example` zawiera polecenie generowania, bez rzeczywistego klucza.

Dla ERLI kontekstem jest `marketplace:<integrationId>:encryptedApiKey`. Odszyfrowanie wymaga dokładnie tego samego kontekstu; chroni to przed podmianą szyfrogramów między rekordami i polami.

Aktualnie obsługiwany jest jeden klucz. Nie wymieniaj go po zapisaniu sekretów bez procedury odszyfrowania starym i ponownego zaszyfrowania nowym kluczem albo wdrożenia obsługi wielu kluczy. Utrata klucza wymaga ponownego wprowadzenia tokenów. Nie umieszczaj sekretów w logach, URL-ach, audycie ani zadaniach BullMQ.
