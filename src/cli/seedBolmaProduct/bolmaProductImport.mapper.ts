import { Prisma } from '@prisma/client';
import { readCatalog, canonicalBrand, normalizeName } from '../../shared/utils/vehicleCatalog';
import { ImportProductSchema } from '../../modules/product/schemas/product.schema';
import { BolmaProductRow } from './bolmaProductImport.parser';
import { mapBolmaMeasurements } from './bolmaProductImport.measurements';

export type BolmaImportBrand = Prisma.CarBrandGetPayload<{ include: {
    models: { include: { carGenerations: true } };
} }>;

export interface BolmaImportDictionaries {
    brands: BolmaImportBrand[];
    departments: { id: string; shortcut: string }[];
    vehicles: ReturnType<typeof readCatalog>;
}

function uniqueMatch<T>(items: T[], label: string): T {
    if (items.length !== 1) throw new Error(`Słownik: ${label}; znaleziono ${items.length} rekordów. Uzupełnij lub uporządkuj słownik i ponów import.`);
    return items[0];
}

export function mapBolmaProduct(row: BolmaProductRow, dictionaries: BolmaImportDictionaries) {
    const measurements = mapBolmaMeasurements(row.params);
    const warnings = [...measurements.warnings];
    let departmentId: string | null = null;
    if (row.department_sign) {
        const departments = dictionaries.departments.filter((item) => item.shortcut.trim().toUpperCase() === row.department_sign);
        if (departments.length > 1) throw new Error(`Niejednoznaczny dział: ${row.department_sign}.`);
        departmentId = departments[0]?.id ?? null;
        if (!departmentId) warnings.push(`Nieznany dział ${row.department_sign}; pozostawiono brak działu.`);
    } else {
        warnings.push('Brak działu w źródle.');
    }

    const vehicles = dictionaries.vehicles.filter((vehicle) => row.id_kat && vehicle.sourceIds.includes(row.id_kat));
    if (!vehicles.length) warnings.push(`Brak mapowania kategorii ${row.id_kat ?? '(brak)'}; produkt bez fitmentu.`);
    const productFitments = vehicles.map((vehicle, index) => {
        const brand = uniqueMatch(dictionaries.brands.filter((item) => canonicalBrand(item.name) === vehicle.brand), vehicle.brand);
        const model = vehicle.model === null ? null : uniqueMatch(brand.models.filter((item) =>
            normalizeName(item.name) === vehicle.model), `${vehicle.brand} / ${vehicle.model}`);
        const generation = vehicle.startProduction === null || !model ? null : uniqueMatch(model.carGenerations.filter((item) =>
            item.startProduction === vehicle.startProduction && item.endProduction === vehicle.endProduction),
        `${vehicle.brand} / ${vehicle.model} / ${vehicle.startProduction}–${vehicle.endProduction ?? ''}`);
        return {
            carBrandId: brand.id,
            carModelId: model?.id ?? null,
            carGenerationId: generation?.id ?? null,
            isPrimary: index === 0,
        };
    });

    return {
        data: ImportProductSchema.parse({
            sku: row.nr_kat,
            customName: row.tytul,
            ...measurements.data,
            warehouseLocation: row.pozycja_magazynowa,
            departmentId,
            productFitments,
        }),
        warnings,
    };
}
