import { parseArgs } from 'node:util';
import { extname, resolve } from 'node:path';
import { BASELINKER_PRODUCT_IMPORT } from '../seedBaselinkerProduct/baselinkerProductImport.constants';
import { readBaselinkerExport } from '../seedBaselinkerProduct/baselinkerProductImport.parser';
import { BaselinkerProductImportReport } from '../seedBaselinkerProduct/baselinkerProductImport.report';
import { BolmaProductImportReport } from '../seedBolmaProduct/bolmaProductImport.report';
import type { runBolmaProductImport } from '../seedBolmaProduct/runBolmaProductImport';
import type { runBaselinkerProductImport } from '../seedBaselinkerProduct/runBaselinkerProductImport';
import { PRODUCT_SEED } from './productSeed.constants';

async function main(): Promise<void> {
    const { values } = parseArgs({ options: {
        'dry-run': { type: 'boolean' }, apply: { type: 'boolean' },
        input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' },
    } });
    const apply = values.apply || process.env.npm_config_apply === 'true';
    const dryRun = values['dry-run'] || process.env.npm_config_dry_run === 'true';
    if (values.help) {
        console.log('Podgląd obu etapów: npm run db-seed:products');
        console.log('Zapis obu etapów: npm run db-seed:products:apply');
        console.log('Opcje: --dry-run, --apply, --input <eksport.csv>, --output <katalog-raportów>, --help');
        return;
    }
    if (apply && dryRun) throw new Error('Wybierz --dry-run albo --apply.');
    const input = values.input ? resolve(values.input)
        : resolve(__dirname, '../seedBaselinkerProduct', BASELINKER_PRODUCT_IMPORT.DEFAULT_INPUT);
    if (extname(input).toLowerCase() !== '.csv') throw new Error('Plik wejściowy musi mieć rozszerzenie .csv.');
    const output = resolve(values.output ?? `${PRODUCT_SEED.REPORT_DIRECTORY_PREFIX}${new Date().toISOString().replace(/[:.]/gu, '-')}`);
    const bolmaPath = resolve(output, PRODUCT_SEED.BOLMA_REPORT);
    const baselinkerPath = resolve(output, PRODUCT_SEED.BASELINKER_REPORT);
    console.log(`Tryb: ${apply ? 'APPLY' : 'DRY RUN'}. Kolejność: Bolma → BaseLinker.`);
    console.log(`Raporty: ${bolmaPath} oraz ${baselinkerPath}`);

    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    let bolmaReport: BolmaProductImportReport | undefined;
    let baselinkerReport: BaselinkerProductImportReport | undefined;
    let bolma: Awaited<ReturnType<typeof runBolmaProductImport>> | undefined;
    let baselinker: Awaited<ReturnType<typeof runBaselinkerProductImport>> | undefined;
    let fatalError: string | undefined;
    let disconnectDatabase: (() => Promise<void>) | undefined;
    let disconnectBolma: (() => Promise<void>) | undefined;
    try {
        // Open both reports and validate the entire CSV before any database writes.
        bolmaReport = await BolmaProductImportReport.create(bolmaPath, apply);
        baselinkerReport = await BaselinkerProductImportReport.create(baselinkerPath, input, apply);
        const records = await readBaselinkerExport(input);
        console.log(`CSV BaseLinkera: ${records.length} rekordów. Cena brutto, waga kg, wymiary cm. Zera oznaczają brak danych.`);
        if (!interrupted) {
            const { prisma } = await import('../../config/database');
            disconnectDatabase = () => prisma.$disconnect();
            const { closeBolmaDatabasePool } = await import('../../modules/bolma/config/database');
            disconnectBolma = closeBolmaDatabasePool;
            const { runBolmaProductImport: runBolma } = await import('../seedBolmaProduct/runBolmaProductImport');
            const activeReport = bolmaReport;
            bolmaReport = undefined;
            bolma = await runBolma(apply, activeReport, () => interrupted);
            if (bolma.completed && !interrupted) {
                const { runBaselinkerProductImport: runBaselinker } = await import('../seedBaselinkerProduct/runBaselinkerProductImport');
                const activeBaseReport = baselinkerReport;
                baselinkerReport = undefined;
                baselinker = await runBaselinker(records, apply, activeBaseReport, () => interrupted,
                    apply ? undefined : bolma.previewProducts);
            } else {
                fatalError = bolma.fatalError ?? 'Etap Bolmy nie został zakończony. BaseLinker nie został uruchomiony.';
            }
        }
    } catch (error) {
        fatalError = error instanceof Error ? error.message : String(error);
    } finally {
        try {
            if (bolmaReport) await bolmaReport.finish(false, fatalError ?? 'Przerwano przed uruchomieniem etapu Bolmy.');
        } finally {
            try {
                if (baselinkerReport) await baselinkerReport.finish(false, fatalError ?? 'Przerwano przed uruchomieniem etapu BaseLinkera.');
            } finally {
                process.off('SIGINT', interrupt);
                process.off('SIGTERM', interrupt);
                await Promise.all([disconnectDatabase?.(), disconnectBolma?.()]);
            }
        }
    }
    const completed = Boolean(bolma?.completed && baselinker?.completed);
    console.log(JSON.stringify({ completed, mode: apply ? 'apply' : 'dry-run',
        bolma: bolma ? { completed: bolma.completed, counts: bolma.counts, fatalError: bolma.fatalError } : null,
        baselinker: baselinker ?? null, ...(fatalError ? { fatalError } : {}) }));
    if (fatalError) console.error(fatalError);
    if (interrupted) process.exitCode = 130;
    else if (!completed || fatalError || bolma?.counts.conflict || bolma?.counts.error
        || baselinker?.counts.conflict || baselinker?.counts.error) process.exitCode = 1;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
