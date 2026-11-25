export const BASELINKER_PRODUCT_IMPORT = {
    DEFAULT_INPUT: 'data/Eksport_Behemot_2026-11-25_15_59.csv',
    AUDIT_USER_ID: 'cli:baselinker-product-import',
    SOURCE_NAME: 'BaseLinker — dane produktów',
} as const;

// Actual export: column 10 has no header and contains the Polish description.
export const BASELINKER_EXPORT_HEADERS = [
    'ID', 'EAN', 'SKU', 'Waga', 'Wysokość', 'Długość', 'Szerokość', 'Cena', 'Nazwa PL', '',
] as const;

export const BASELINKER_FULL_EXPORT_HEADERS = [
    'produkt_id', 'ean', 'ean_wszystkie', 'ean_szczegoly', 'sku', 'asin', 'tagi',
    'kategoria_id', 'kategoria_nazwa', 'kategoria_sciezka_1', 'kategoria_sciezka_2', 'kategoria_sciezka_3',
    'stawka_vat', 'waga', 'wysokosc', 'dlugosc', 'szerokosc', 'produkt_rodzic_id', 'ilosc_wariantow',
    'gwiazdka', 'producent_id', 'producent_nazwa', 'lp', 'ilosc', 'ilosc_wszystkie_magazyny',
    'ilosc_domyslny', 'prog_domyslny', 'ilosc_zarezerwowanych', 'ilosc_zarezerwowanych_domyslny',
    'ilosc_zamowiona', 'ilosc_zamowiona_domyslny', 'cena', 'cena_wszystkie_grupy_cenowe',
    'cena_domyslna', 'cena_allegro_detal', 'kod', 'kod_wszyscy_dostawcy', 'kod_boll',
    'cena_zakupu', 'cena_zakupu_srednia', 'cena_zakupu_ostatnia', 'data_dostawy_ostatnia',
    'sredni_koszt_dodatkowy_zakupu', 'cena_zakupu_wszyscy_dostawcy', 'cena_zakupu_boll',
    'lokalizacja_wszystkie', 'lokalizacja_domyslny', 'nazwa', 'nazwa_pl', 'opis', 'opis_pl',
    'opis_dodatkowy_1', 'opis_dodatkowy_1_pl', 'opis_dodatkowy_2', 'opis_dodatkowy_2_pl',
    'opis_dodatkowy_3', 'opis_dodatkowy_3_pl', 'opis_dodatkowy_4', 'opis_dodatkowy_4_pl',
] as const;

export const BASELINKER_FULL_EXPORT_COLUMNS = {
    sourceId: 'produkt_id', sku: 'sku', ean: 'ean', weight: 'waga', height: 'wysokosc',
    length: 'dlugosc', width: 'szerokosc', price: 'cena', customName: 'nazwa_pl', customDescription: 'opis_pl',
} as const;

export const BASELINKER_ZERO_VALUE_PATTERN = /^0+(?:[.,]0+)?$/u;

export const BASELINKER_IMPORT_STATUSES = {
    UPDATED: 'updated',
    PLANNED: 'would_update',
    UNCHANGED: 'unchanged',
    SKIPPED: 'skipped',
    CONFLICT: 'conflict',
    ERROR: 'error',
} as const;

export const BASELINKER_IMPORT_FIELDS = {
    ean: 'EAN',
    customName: 'Nazwa PL',
    customDescription: 'Opis PL',
    price: 'Cena',
    weight: 'Waga',
    height: 'Wysokość',
    length: 'Długość',
    width: 'Szerokość',
} as const;

export const BASELINKER_NUMERIC_FIELDS = ['weight', 'height', 'length', 'width', 'price'] as const;
export const BASELINKER_ZERO_FIELD_COUNTS = { weight: 0, height: 0, length: 0, width: 0, price: 0 };
export const BASELINKER_MISSING_FIELD_COUNTS = {
    ean: 0, customName: 0, customDescription: 0, price: 0, weight: 0, height: 0, length: 0, width: 0,
};
