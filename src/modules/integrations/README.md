# Integracje

Ten dokument opisuje uzgodniony podział modułu. Przed dodaniem obsługi kolejnego API zachowaj poniższe granice odpowiedzialności.

## Stan obecny i docelowa struktura

Obecnie istnieją wspólny odczyt integracji dla panelu, połączenie MySQL Bolmy oraz zapis konfiguracji ERLI przez serwis marketplace, fabrykę i adapter. Kontrakt `MarketplaceAdapter.prepareConfiguration()` obejmuje przygotowanie i szyfrowanie danych konfiguracji; nie wywołuje API dostawcy. Konto jest zapisywane ze statusem `PENDING`.

Sprawdzanie połączenia, wymiana tokenu istniejącego konta, OAuth i synchronizacja nie są jeszcze zaimplementowane. Wcześniejszy kontrakt `checkConnection` zastąpiono rzeczywiście obsługiwaną operacją; przy dodawaniu API należy rozszerzyć kontrakt bez tworzenia atrap. Foldery Allegro, eMAG i PrestaShop w drzewie poniżej są planem — dodaj je dopiero wraz z implementacją.

```text
integrations/
├── integration.routes.ts          # wspólny odczyt dla panelu
├── integration.controller.ts
├── integration.service.ts         # zestawienie Bolmy i kont marketplace
├── docs/
├── bolma/                         # istniejące źródło katalogu MySQL
└── marketplace/
    ├── marketplaceIntegration.service.ts
    ├── marketplaceAdapter.factory.ts  # obecnie obsługuje ERLI
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
        │   └── emag.adapter.ts
        ├── erli/
        │   ├── erli.adapter.ts
        │   └── erli.schema.ts
        └── prestashop/
            └── prestashop.adapter.ts
```

## Podział odpowiedzialności

- Wspólny serwis integracji składa dane do panelu.
- Serwis marketplace koordynuje operacje na kontach i zapis ich wyników.
- Repozytorium marketplace odpowiada za dostęp do tabeli `MarketplaceIntegration`. Odczyt dla panelu jawnie wyklucza dane dostępowe i surowe ustawienia.
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

1. Dodaj implementację `MarketplaceAdapter` w `adapters/<channel>/<channel>.adapter.ts`. Obecny kontrakt obejmuje `prepareConfiguration(input, integrationId)`. Wspólny typ wyniku zawiera tylko pola potrzebne teraz dla klucza API; przy wdrażaniu OAuth rozszerz go o rzeczywiście wymagane dane, zachowując szyfrowanie sekretów.
2. Dodaj schemat Zod konfiguracji dostawcy i przygotowanie danych dostępowych po stronie serwera. Nie przekazuj zaszyfrowanych pól bezpośrednio do klienta API ani sekretów do panelu i logów.
3. Rozszerz `marketplaceAdapter.factory.ts`: zwykłą funkcję wybierającą adapter według `MarketplaceIntegrationChannel`. Nieobsługiwane kanały jawnie odrzucają operację.
4. Przy tworzeniu konta serwis generuje jego identyfikator przed szyfrowaniem. Przy kolejnych operacjach pobiera konto z bazy. Konfiguracja i dane dostępowe dotyczą konkretnego konta; nie przechowuj jednego globalnego adaptera z tokenem dla całego kanału.
5. Dodaj endpoint operacji z odpowiednimi uprawnieniami i aktualizacją diagnostyki konta. Długie synchronizacje wykorzystają istniejący BullMQ; zadania przekazują identyfikatory, a aktualne konto jest pobierane przy wykonaniu.

Nie dodawaj osobnych modeli Prisma dla każdego kanału, pustych klientów API ani wspólnej klasy bazowej bez rzeczywistej potrzeby. Kontrakt rozszerzamy wraz z kolejnymi wdrażanymi operacjami. Wspólny `IntegrationEnvironment` może później służyć również integracjom kurierskim, które otrzymają własny kontrakt.

## Konfiguracja ERLI

- `POST /integrations/marketplace/ERLI`, body: `{ "token": "..." }`. Wymaga `INTEGRATION:CREATE`, zwraca `201` i bezpieczne dane konta. Inne pola body są odrzucane. Nie przesyłaj prefiksu `Bearer` ani białych znaków wewnątrz tokenu.
- Adapter nadaje nazwę `ERLI`. Każdy zapis tworzy nowe konto z domyślnym środowiskiem `PRODUCTION` i statusem `PENDING`. Nie potwierdza poprawności tokenu ani tożsamości konta i nie eliminuje duplikatów kont po stronie ERLI — wymaga to przyszłej weryfikacji przez API.
- [ERLI wymaga klucza API w nagłówku Authorization: Bearer](https://erli.pl/svc/shop-api/doc/). Sam zapis konfiguracji nie wykonuje żądania do ERLI.
- Repozytorium zwraca wyłącznie jawną projekcję bez sekretów. Odpowiedź API i log audytowy nie zawierają tokenu ani jego szyfrogramu.
- Frontend ma osobny formularz `components/erli/ErliConfigurationDialog.tsx`, korzystający ze wspólnych komponentów shadcn/ui. Formularze kolejnych dostawców mogą przyjmować inne dane; nie buduj jednego formularza z rosnącą liczbą warunkowych parametrów.
- Uprawnienie `INTEGRATION:CREATE` jest częścią wspólnej konfiguracji uprawnień. Nie dodajemy osobnej migracji danych dla jego przypisania; obowiązuje istniejący mechanizm seedowania i zarządzania rolami.
- Klienci HTTP frontendu są rozdzieleni: `src/api/integrations/IntegrationApiClient.ts` odpowiada za wspólny odczyt, `erli/ErliApiClient.ts` za operacje ERLI, a `bolma/BolmaApiClient.ts` za operacje Bolmy. Kolejnych dostawców dodawaj w osobnych podfolderach.

## Szyfrowanie sekretów

Wspólny moduł `src/shared/utils/secretEncryption.ts` udostępnia `encryptSecret(value, context)` i `decryptSecret(value, context)`. Korzysta z [AES-256-GCM w node:crypto](https://nodejs.org/api/crypto.html), losowego 12-bajtowego nonce i 16-bajtowego tagu. Zapis ma format `v1:keyId:nonceHex:tagHex:ciphertextHex`; `keyId` jest identyfikatorem wyprowadzonym z klucza, nie jego wartością.

Klucz `INTEGRATION_ENCRYPTION_KEY` w środowisku backendu musi mieć 64 znaki szesnastkowe (32 losowe bajty). Generuj go raz, zachowaj poza Git i zabezpiecz jego kopię. API oraz worker korzystające z tych samych sekretów muszą otrzymać ten sam klucz. Nie używaj `SESSION_SECRET` ani zmiennych `VITE_*` do szyfrowania integracji. `.env.example` zawiera polecenie generowania, bez rzeczywistego klucza.

Dla ERLI kontekstem jest `marketplace:<integrationId>:encryptedApiKey`. Odszyfrowanie wymaga dokładnie tego samego kontekstu; chroni to przed podmianą szyfrogramów między rekordami i polami.

Aktualnie obsługiwany jest jeden klucz. Nie wymieniaj go po zapisaniu sekretów bez procedury odszyfrowania starym i ponownego zaszyfrowania nowym kluczem albo wdrożenia obsługi wielu kluczy. Utrata klucza wymaga ponownego wprowadzenia tokenów. Nie umieszczaj sekretów w logach, URL-ach, audycie ani zadaniach BullMQ.
