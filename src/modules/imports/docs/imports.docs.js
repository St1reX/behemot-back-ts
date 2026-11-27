const security = [{ cookieAuth: [] }];
const reportResponse = {
    200: {
        description: 'Raport XLSX: INFO, WARNING, ERROR. Może zawierać błędy rekordów lub informację o przerwaniu przebiegu. Zapisane produkty nie są cofane.',
        headers: { 'Content-Disposition': { schema: { type: 'string' } } },
        content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
    },
    401: { description: 'Brak sesji.' },
    403: { description: 'Brak wymaganych uprawnień.' },
};

module.exports = {
    tags: [{ name: 'Imports', description: 'Import katalogu produktów z zewnętrznych źródeł.' }],
    schemas: {
        BolmaConfiguration: {
            type: 'object', required: ['id', 'name', 'engine', 'isConfigured', 'sslEnabled'],
            properties: {
                id: { type: 'string', enum: ['bolma'] }, name: { type: 'string' },
                engine: { type: 'string', enum: ['MySQL'] }, isConfigured: { type: 'boolean' }, sslEnabled: { type: 'boolean' },
            },
        },
    },
    paths: {
        '/imports/bolma/status': {
            get: {
                tags: ['Imports'], summary: 'Sprawdzenie połączenia z katalogiem Bolmy', security,
                description: 'Dostępne dla zalogowanego użytkownika, również w kafelku pulpitu.',
                responses: {
                    200: { description: 'Baza dostępna.', content: { 'application/json': { schema: {
                        type: 'object', properties: { status: { type: 'string', enum: ['ok'] }, components: {
                            type: 'object', properties: { database: { type: 'string', enum: ['ok'] } },
                        } },
                    } } } },
                    503: { description: 'Baza niedostępna.', content: { 'application/json': { schema: {
                        type: 'object', properties: { status: { type: 'string', enum: ['error'] }, components: {
                            type: 'object', properties: { database: { type: 'string', enum: ['error'] } },
                        } },
                    } } } },
                    401: { description: 'Brak sesji.' },
                },
            },
        },
        '/imports/bolma/configuration': {
            get: {
                tags: ['Imports'], summary: 'Konfiguracja katalogu Bolmy bez danych dostępowych', security,
                description: 'Wymaga INTEGRATION:READ. Nie sprawdza dostępności MySQL.',
                responses: {
                    200: { description: 'Konfiguracja.', content: { 'application/json': { schema: { $ref: '#/components/schemas/BolmaConfiguration' } } } },
                    401: { description: 'Brak sesji.' }, 403: { description: 'Brak INTEGRATION:READ.' },
                },
            },
        },
        '/imports/bolma/products': {
            post: {
                tags: ['Imports'], summary: 'Synchroniczny import produktów Bolmy i pobranie raportu XLSX', security,
                description: 'Wymaga wszystkich uprawnień: INTEGRATION:READ, INTEGRATION:UPDATE, PRODUCT:CREATE, PRODUCT:UPDATE. Odczytuje aktywne produkty, wybiera najwyższe ID dla SKU, tworzy legacy i uzupełnia tylko pustą nazwę oraz brakującą długość/wagę istniejących legacy. Osobna transakcja dla każdego rekordu, audyt na koncie użytkownika. Brak kolejki i automatycznych ponowień. Każde potwierdzone żądanie rozpoczyna nowy przebieg. Raporty pozostają we wspólnym katalogu uploads/imports/bolma.',
                requestBody: { required: true, content: { 'application/json': { schema: {
                    type: 'object', additionalProperties: false, required: ['confirmed'],
                    properties: { confirmed: { type: 'boolean', enum: [true] } },
                } } } },
                responses: { ...reportResponse, 409: { description: 'Import już trwa.' }, 422: { description: 'Brak potwierdzenia lub nieprawidłowe dane żądania.' } },
            },
        },
        '/imports/bolma/products/report/latest': {
            get: {
                tags: ['Imports'], summary: 'Pobranie najnowszego raportu importu Bolmy', security,
                description: 'Wymaga INTEGRATION:READ. Zwraca najnowszy gotowy plik XLSX z uploads/imports/bolma według daty modyfikacji, niezależnie od autora importu. Pomija katalogi, dzienniki JSONL i pliki w trakcie zapisu. Pliki nie są publicznymi uploadami.',
                responses: { ...reportResponse, 404: { description: 'Brak gotowych raportów importu Bolmy.' } },
            },
        },
    },
};
