import { buildProductPlaceholderValues, ProductPlaceholderValues } from '../utils/rendering/buildProductPlaceholderValues';

const placeholderDefinitions: Record<keyof ProductPlaceholderValues, {
    label: string;
    description: string;
    optional?: boolean;
}> = {
    customName: { label: 'Nazwa własna', description: 'Nazwa własna produktu.', optional: true },
    carGeneration: { label: 'Pełna nazwa pojazdu', description: 'Marka, model i lata głównego dopasowania.', optional: true },
    carBrand: { label: 'Marka pojazdu', description: 'Marka z głównego dopasowania produktu.', optional: true },
    carModel: { label: 'Model pojazdu', description: 'Model z głównego dopasowania produktu.', optional: true },
    productionYears: { label: 'Lata produkcji', description: 'Lata głównego dopasowania, np. 2012-2019.', optional: true },
    sideLabel: { label: 'Strona — pełna nazwa', description: 'Np. Strona Lewa lub Brak.' },
    sideTitleLabel: { label: 'Strona — krótka nazwa', description: 'Np. LEWA; pusta dla produktu bez strony.' },
    sku: { label: 'SKU', description: 'Numer magazynowy produktu.' },
    ean: { label: 'EAN', description: 'Kod EAN produktu.', optional: true },
    OEM: { label: 'Numery OEM', description: 'Numery OEM rozdzielone przecinkami. Wielkość liter ma znaczenie.', optional: true },
    price: { label: 'Cena', description: 'Cena produktu bez dopisywanej waluty.' },
    quantity: { label: 'Ilość', description: 'Dostępna ilość produktu.' },
    weight: { label: 'Waga', description: 'Waga produktu.' },
    length: { label: 'Długość', description: 'Długość produktu.' },
    width: { label: 'Szerokość', description: 'Szerokość produktu.' },
    height: { label: 'Wysokość', description: 'Wysokość produktu.', optional: true },
    warehouseLocation: { label: 'Lokalizacja magazynowa', description: 'Lokalizacja produktu w magazynie.' },
    department: { label: 'Dział', description: 'Nazwa działu produktu.' },
    departmentShortcut: { label: 'Skrót działu', description: 'Skrót działu produktu.' },
    producer: { label: 'Producent', description: 'Nazwa producenta produktu.' },
};

// Przykład przechodzi przez ten sam mechanizm co prawdziwy produkt.
export const productListingExampleValues = buildProductPlaceholderValues({
    customName: 'Błotnik przedni', side: 'LEFT', sku: 'BEH-00123', ean: '5901234123457',
    oem: ['1K0821105', '1K0821105A'], price: '249.90', quantity: 4,
    weight: '2.5', length: '120', width: '65', height: '15', warehouseLocation: 'A-02-03',
    department: { name: 'Części karoserii', shortcut: 'KAR' },
    producer: { name: 'Przykładowy producent' },
    productFitments: [{
        isPrimary: true,
        carGeneration: {
            startProduction: 2012, endProduction: 2019,
            carModel: { name: 'Golf VII', carBrand: { name: 'Volkswagen' } },
        },
    }],
});

export const productListingPlaceholders = Object.entries(placeholderDefinitions).map(([name, definition]) => ({
    name,
    ...definition,
    optional: definition.optional ?? false,
    example: productListingExampleValues[name as keyof ProductPlaceholderValues] ?? '',
}));

export function isProductListingPlaceholder(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(placeholderDefinitions, name);
}
