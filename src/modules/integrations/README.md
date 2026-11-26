# Integracje

Ten dokument opisuje uzgodniony podział modułu. Przed dodaniem obsługi kolejnego API zachowaj poniższe granice odpowiedzialności.

## Stan obecny i docelowa struktura

Obecnie istnieją wspólny odczyt integracji dla panelu, połączenie MySQL Bolmy, serwis i repozytorium marketplace oraz kontrakt `MarketplaceAdapter.checkConnection()`. Fabryka i implementacje dostawców nie są jeszcze dodane. Poniższe drzewo pokazuje docelowe rozmieszczenie plików; twórz je dopiero wraz z rzeczywistą funkcjonalnością.

```text
integrations/
├── integration.routes.ts          # wspólny odczyt dla panelu
├── integration.controller.ts
├── integration.service.ts         # zestawienie Bolmy i kont marketplace
├── docs/
├── bolma/                         # istniejące źródło katalogu MySQL
└── marketplace/
    ├── marketplaceIntegration.service.ts
    ├── marketplaceAdapter.factory.ts  # powstanie wraz z pierwszym adapterem
    ├── repositories/
    │   └── marketplaceIntegrationRepository.ts
    ├── types/
    │   └── marketplaceAdapter.types.ts
    └── adapters/
        ├── allegro/
        │   ├── allegro.adapter.ts
        │   └── allegro.schema.ts     # walidacja konfiguracji dostawcy
        ├── emag/
        │   └── emag.adapter.ts
        ├── erli/
        │   └── erli.adapter.ts
        └── prestashop/
            └── prestashop.adapter.ts
```

## Podział odpowiedzialności

- Wspólny serwis integracji składa dane do panelu.
- Serwis marketplace koordynuje operacje na kontach i zapis ich wyników.
- Repozytorium marketplace odpowiada za dostęp do tabeli `MarketplaceIntegration`. Odczyt dla panelu jawnie wyklucza dane dostępowe i surowe ustawienia.
- Adapter odpowiada za komunikację z dostawcą, mapowanie odpowiedzi i błędów. Nie obsługuje żądań Express ani zapisu przez Prisma.
- Bolma pozostaje niezależnym źródłem katalogu; nie implementuje kontraktu marketplace.

## Organizacja dostawców i kontrakt

- Każdy dostawca ma własny folder `marketplace/adapters/<channel>/`. Jego implementacją wejściową jest `<channel>.adapter.ts`.
- Klasa adaptera implementuje wspólny interfejs, np. `AllegroAdapter implements MarketplaceAdapter`. Wymagane metody wymusza `implements`; nie potrzebujemy dziedziczenia, metod wirtualnych ani wspólnej klasy abstrakcyjnej.
- Kod autoryzacji, klienta API, schematów i mapowania danego dostawcy pozostaje w jego folderze. Wydzielaj kolejne pliki dopiero, gdy wymaga tego rzeczywista implementacja. Nie twórz obowiązkowego kompletu pustych serwisów i klientów dla każdego kanału.
- Różnice konfiguracji w `settings` waliduj schematem Zod właściwym dla dostawcy. Nie traktuj tego pola jako dowolnego, nietypowanego worka danych.
- Wspólna tabela `MarketplaceIntegration` przechowuje konta wszystkich kanałów. Dwa konta Allegro to dwa rekordy korzystające z tej samej klasy adaptera, z osobną konfiguracją i danymi dostępowymi.
- `ProductExternalListing` przechowuje powiązania ofert z kontami. Nie twórz osobnych modeli kont i ofert dla każdego marketplace.
- Nie dodawaj metod na zapas ani pustych implementacji tylko po to, aby spełnić rozbudowany interfejs. Operacje specyficzne dla jednego dostawcy nie powinny wymuszać atrap w pozostałych adapterach.

## Dodawanie pierwszego dostawcy

1. Dodaj implementację `MarketplaceAdapter` w `adapters/<channel>/<channel>.adapter.ts`. Na początek kontrakt obejmuje tylko `checkConnection`. Powodzenie zwraca identyfikację konta; niepowodzenie zgłasza błąd, który serwis obsłuży przy zapisie diagnostyki.
2. Dodaj schemat Zod konfiguracji dostawcy i przygotowanie danych dostępowych po stronie serwera. Nie przekazuj zaszyfrowanych pól bezpośrednio do klienta API ani sekretów do panelu i logów.
3. Dodaj `marketplaceAdapter.factory.ts` obok serwisu: zwykłą funkcję wybierającą adapter według `MarketplaceIntegrationChannel`. Nieobsługiwane kanały mają jawnie odrzucać operację. Fabryka powstaje wraz z pierwszą implementacją, bez atrap połączeń.
4. Wywołuj fabrykę z serwisu marketplace po pobraniu konta. Konfiguracja i dane dostępowe dotyczą konkretnego konta; nie przechowuj jednego globalnego adaptera z tokenem dla całego kanału.
5. Dodaj endpoint operacji z odpowiednimi uprawnieniami i aktualizacją diagnostyki konta. Długie synchronizacje wykorzystają istniejący BullMQ; zadania przekazują identyfikatory, a aktualne konto jest pobierane przy wykonaniu.

Nie dodawaj osobnych modeli Prisma dla każdego kanału, pustych klientów API ani wspólnej klasy bazowej bez rzeczywistej potrzeby. Kontrakt rozszerzamy wraz z kolejnymi wdrażanymi operacjami. Wspólny `IntegrationEnvironment` może później służyć również integracjom kurierskim, które otrzymają własny kontrakt.
