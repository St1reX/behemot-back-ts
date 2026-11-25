import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { sourceCategories, vehicleCatalog, sourceNotes } from '../../shared/constants/vehicleCatalog.constants';
import { SeedVehicle, normalizeName, canonicalBrand, readCatalog } from '../../shared/utils/vehicleCatalog';

async function writeReport(outputPath: string, vehicles: SeedVehicle[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Behemot — stały katalog pojazdów';
    const usedNames = new Set<string>();
    function addSheet(name: string, headers: string[], widths: number[]): ExcelJS.Worksheet {
        const base = name.replace(/[\\/*?:\[\]]/gu, '_').replace(/^'+|'+$/gu, '') || 'Marka';
        let sheetName = base.slice(0, 31);
        for (let index = 2; usedNames.has(sheetName.toUpperCase()); index++) {
            const suffix = ` (${index})`;
            sheetName = base.slice(0, 31 - suffix.length) + suffix;
        }
        usedNames.add(sheetName.toUpperCase());
        const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = headers.map((header, index) => ({ header, width: widths[index] ?? 25 }));
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        sheet.getRow(1).height = 30;
        sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
        return sheet;
    }
    function addRow(sheet: ExcelJS.Worksheet, values: (string | number | null)[]): void {
        if (sheet.rowCount >= 1048576) throw new Error(`Przekroczono limit wierszy arkusza ${sheet.name}.`);
        const row = sheet.addRow(values.map((value) => typeof value === 'string' ? value.slice(0, 32767) : value));
        row.alignment = { vertical: 'top', wrapText: true };
        const lines = Math.max(1, ...values.map((value, index) => typeof value === 'string'
            ? Math.ceil(value.length / (sheet.getColumn(index + 1).width ?? 25)) : 1));
        row.height = Math.min(409, Math.max(20, lines * 16));
    }
    const endYear = (entry: SeedVehicle) => entry.startProduction === null ? null : entry.endProduction ?? 'brak końca w źródle';
    const summary = addSheet('Podsumowanie', ['Pozycja', 'Wartość'], [45, 105]);
    const brands = addSheet('Marki', ['Marka', 'Modele i warianty', 'Zakresy lat', 'Arkusz'], [28, 24, 20, 32]);
    const sources = addSheet('Źródła i mapowanie', [
        'id_kat', 'Grupa w katalogu', 'Oryginalny tytuł', 'Marka docelowa', 'Model i wariant', 'Od', 'Do', 'Uwagi',
    ], [24, 34, 85, 26, 75, 14, 25, 95]);
    const notes = addSheet('Decyzje i uwagi', ['id_kat', 'Oryginalny tytuł', 'Decyzja / ograniczenie źródła'], [24, 85, 105]);
    const brandNames = Object.keys(vehicleCatalog);
    const modelCount = new Set(vehicles.filter((entry) => entry.model !== null)
        .map((entry) => JSON.stringify([entry.brand, entry.model]))).size;
    for (const row of [
        ['Źródło', 'Dwie listy katalogu strony dostarczone przez użytkownika 24.11.2026.'],
        ['Rodzaj raportu', 'Stały katalog seedera. Bez odczytu MySQL, strony i bez porównania z bazą docelową.'],
        ['Utworzono (UTC)', new Date().toISOString()],
        ['Kategorie źródłowe', Object.keys(sourceCategories).length],
        ['Marki', brandNames.length], ['Modele i warianty', modelCount],
        ['Zakresy lat', vehicles.filter((entry) => entry.startProduction !== null).length],
        ['Usuwanie duplikatów', 'Tylko identyczna marka, pełna nazwa wariantu i dokładny zakres lat.'],
        ['Zakresy nakładające się lub różne', 'Pozostają osobnymi wpisami. Nie wybieramy jednego ani nie łączymy zakresów.'],
        ['Wersje i nadwozia', 'Zachowane w nazwie modelu. Wpis ogólny nie zastępuje sedanów, kombi ani wersji silnikowych.'],
        ['Brak zakresu lat', 'Model bez generacji. Pojedynczy rok w tytule nie oznacza otwartej produkcji.'],
        ['Istniejąca baza', 'Seeder dopisuje brakujące rekordy. Nie usuwa ani nie naprawia danych starego importera.'],
    ] as (string | number)[][]) addRow(summary, row);
    for (const brand of brandNames) {
        const entries = vehicles.filter((entry) => entry.brand === brand);
        const sheet = addSheet(brand, ['Model i wariant', 'Początek produkcji', 'Koniec produkcji', 'Źródłowe id_kat'], [80, 23, 26, 65]);
        for (const entry of entries) addRow(sheet, [entry.model ?? '(tylko marka)', entry.startProduction,
            endYear(entry), entry.sourceIds.join(', ')]);
        addRow(brands, [brand, new Set(entries.filter((entry) => entry.model !== null).map((entry) => entry.model)).size,
            entries.filter((entry) => entry.startProduction !== null).length, sheet.name]);
    }
    for (const entry of vehicles) {
        for (const id of entry.sourceIds) {
            const [group, title] = sourceCategories[id];
            addRow(sources, [id, group, title, entry.brand, entry.model, entry.startProduction, endYear(entry), sourceNotes[id] ?? null]);
        }
    }
    for (const [id, note] of Object.entries(sourceNotes)) addRow(notes, [id, sourceCategories[id][1], note]);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(await workbook.xlsx.writeBuffer()), { flag: 'wx' });
}

function indexByUniqueKey<T>(items: T[], getKey: (item: T) => string, label: string): Map<string, T> {
    const result = new Map<string, T>();
    for (const item of items) {
        const key = getKey(item);
        if (result.has(key)) throw new Error(`Niejednoznaczne istniejące dane (${label}): ${key}. Import przerwany.`);
        result.set(key, item);
    }
    return result;
}

async function saveVehicles(vehicles: SeedVehicle[]) {
    const { prisma } = await import('../../config/database');
    try {
        return await prisma.$transaction(async (tx) => {
            const existingBrands = await tx.carBrand.findMany({
                where: { deletedAt: null },
                include: { models: {
                    where: { deletedAt: null },
                    include: { carGenerations: { where: { deletedAt: null } } },
                } },
            });
            const brands = indexByUniqueKey(existingBrands, (brand) => canonicalBrand(brand.name), 'marki');
            const models = indexByUniqueKey(existingBrands.flatMap((brand) => brand.models),
                (model) => JSON.stringify([model.carBrandId, normalizeName(model.name)]), 'modele');
            const generationKey = (modelId: string, start: number, end: number | null) => JSON.stringify([modelId, start, end]);
            const generations = new Set(indexByUniqueKey(existingBrands.flatMap((brand) =>
                brand.models.flatMap((model) => model.carGenerations)),
            (generation) => generationKey(generation.carModelId, generation.startProduction, generation.endProduction), 'generacje').keys());
            const created = { brands: 0, models: 0, generations: 0 };

            for (const vehicle of vehicles) {
                let brand = brands.get(vehicle.brand);
                if (!brand) {
                    const record = await tx.carBrand.create({ data: { name: vehicle.brand } });
                    brand = { ...record, models: [] };
                    brands.set(vehicle.brand, brand);
                    created.brands++;
                }
                if (!vehicle.model) continue;
                const modelKey = JSON.stringify([brand.id, vehicle.model]);
                let model = models.get(modelKey);
                if (!model) {
                    const record = await tx.carModel.create({ data: { name: vehicle.model, carBrandId: brand.id } });
                    model = { ...record, carGenerations: [] };
                    models.set(modelKey, model);
                    created.models++;
                }
                if (vehicle.startProduction === null) continue;
                const key = generationKey(model.id, vehicle.startProduction, vehicle.endProduction);
                if (generations.has(key)) continue;
                await tx.carGeneration.create({ data: {
                    carModelId: model.id,
                    startProduction: vehicle.startProduction,
                    endProduction: vehicle.endProduction,
                } });
                generations.add(key);
                created.generations++;
            }
            return created;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
    } finally {
        await prisma.$disconnect();
    }
}

async function main(): Promise<void> {
    const { values } = parseArgs({ options: {
        'dry-run': { type: 'boolean' }, apply: { type: 'boolean' },
        output: { type: 'string' }, help: { type: 'boolean' },
    } });
    if (values.help) {
        console.log('Raport bez zapisu do bazy: npm run db-seed:vehicles');
        console.log('Zapis do bazy: npm run db-seed:vehicles -- --apply');
        console.log('Opcjonalne argumenty po --: --dry-run, --apply, --output reports/vehicles.xlsx, --help');
        return;
    }
    if (values['dry-run'] && values.apply) throw new Error('Wybierz --dry-run albo --apply.');
    const vehicles = readCatalog();
    const outputPath = resolve(values.output ?? `reports/vehicle-seed-${new Date().toISOString().replace(/[:.]/gu, '-')}.xlsx`);
    if (extname(outputPath).toLowerCase() !== '.xlsx') throw new Error('Raport musi mieć rozszerzenie .xlsx.');
    await writeReport(outputPath, vehicles);
    console.log(`Raport stałego katalogu: ${outputPath}`);
    console.log(`Marki: ${Object.keys(vehicleCatalog).length}. Wpisy katalogu: ${vehicles.length}. Źródła: ${Object.keys(sourceCategories).length}.`);
    if (!values.apply) {
        console.log('Dry run zakończony. Nie zapisano danych w bazie.');
        return;
    }
    const created = await saveVehicles(vehicles);
    console.log(`Dodano marki: ${created.brands}, modele i warianty: ${created.models}, generacje: ${created.generations}.`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
