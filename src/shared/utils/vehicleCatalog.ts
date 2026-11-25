import { sourceCategories, vehicleCatalog, sourceNotes, brandAliases } from '../constants/vehicleCatalog.constants';

export type CatalogEntry = [model: string | null, startProduction: number | null, endProduction: number | null, sourceIds: string[]];
export interface SeedVehicle {
    brand: string;
    model: string | null;
    startProduction: number | null;
    endProduction: number | null;
    sourceIds: string[];
}

export function normalizeName(value: string): string {
    return value.normalize('NFKC').replace(/[‐‑‒–—−]/gu, '-').replace(/\s+/gu, ' ').trim().toUpperCase();
}

export function canonicalBrand(value: string): string {
    const name = normalizeName(value);
    return brandAliases[name] ?? name;
}

export function readCatalog(): SeedVehicle[] {
    const vehicles: SeedVehicle[] = [];
    const keys = new Set<string>();
    const coveredSources = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (const [brand, entries] of Object.entries(vehicleCatalog)) {
        if (!brand || brand !== canonicalBrand(brand) || brand.length > 100 || entries.length === 0) {
            throw new Error(`Niepoprawna marka w katalogu: ${brand}.`);
        }
        for (const [model, startProduction, endProduction, sourceIds] of entries) {
            if ((model !== null && (!model || model !== normalizeName(model) || model.length > 100))
                || (model === null && startProduction !== null)
                || (startProduction === null && endProduction !== null)
                || (startProduction !== null && (!Number.isInteger(startProduction)
                    || startProduction < 1886 || startProduction > currentYear))
                || (endProduction !== null && (!Number.isInteger(endProduction)
                    || (startProduction !== null && endProduction < startProduction) || endProduction > currentYear))) {
                throw new Error(`Niepoprawny wpis katalogu: ${brand} / ${model}.`);
            }
            const key = JSON.stringify([brand, model, startProduction, endProduction]);
            if (keys.has(key)) throw new Error(`Powielony wpis katalogu: ${key}.`);
            keys.add(key);
            if (!sourceIds.length || new Set(sourceIds).size !== sourceIds.length) {
                throw new Error(`Niepoprawne źródła wpisu: ${key}.`);
            }
            for (const id of sourceIds) {
                if (!Object.hasOwn(sourceCategories, id)) throw new Error(`Nieznane źródło katalogu: ${id}.`);
                coveredSources.add(id);
            }
            vehicles.push({ brand, model, startProduction, endProduction, sourceIds });
        }
    }
    const missing = Object.keys(sourceCategories).filter((id) => !coveredSources.has(id));
    if (missing.length) throw new Error(`Pominięte kategorie źródłowe: ${missing.join(', ')}.`);
    for (const id of Object.keys(sourceNotes)) {
        if (!Object.hasOwn(sourceCategories, id)) throw new Error(`Uwaga dotyczy nieznanego źródła: ${id}.`);
    }
    return vehicles;
}

