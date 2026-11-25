import { parseArgs } from 'node:util';
import { resolve, extname } from 'node:path';

async function main(): Promise<void> {
    const { values } = parseArgs({ options: {
        'dry-run': { type: 'boolean' }, apply: { type: 'boolean' },
        output: { type: 'string' }, help: { type: 'boolean' },
    } });
    // npm consumes flags before its -- separator and exposes them as npm_config_*.
    const apply = values.apply || process.env.npm_config_apply === 'true';
    const dryRun = values['dry-run'] || process.env.npm_config_dry_run === 'true';
    if (values.help) {
        console.log('Podgląd: npm run db-seed:bolma-products');
        console.log('Zapis: npm run db-seed:bolma-products:apply');
        console.log('Zapis flagą npm: npm run db-seed:bolma-products --apply');
        console.log('Opcje: --dry-run, --apply, --output reports/bolma-products.jsonl, --help');
        return;
    }
    if (apply && dryRun) throw new Error('Wybierz --dry-run albo --apply.');
    const output = resolve(values.output ?? `reports/bolma-products-${new Date().toISOString().replace(/[:.]/gu, '-')}.jsonl`);
    if (extname(output).toLowerCase() !== '.jsonl') throw new Error('Raport musi mieć rozszerzenie .jsonl.');

    // Help/argument validation do not initialize application configuration or clients.
    const { BolmaProductImportReport } = await import('./bolmaProductImport.report');
    const report = await BolmaProductImportReport.create(output, apply);
    console.log(`Tryb: ${apply ? 'APPLY' : 'DRY RUN'}. Raport: ${output}`);
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    let completed = false;
    let fatalError: string | undefined;
    let disconnectDatabase: (() => Promise<void>) | undefined;
    let disconnectBolma: (() => Promise<void>) | undefined;
    try {
        const { prisma } = await import('../../config/database');
        disconnectDatabase = () => prisma.$disconnect();
        const { closeBolmaDatabasePool } = await import('../../modules/integrations/bolma/config/database');
        disconnectBolma = closeBolmaDatabasePool;
        const { BolmaProductImportService } = await import('./bolmaProductImport.service');
        completed = await BolmaProductImportService.run(apply, report, () => interrupted);
    } catch (error) {
        fatalError = error instanceof Error ? error.message : String(error);
        process.exitCode = 1;
    } finally {
        process.off('SIGINT', interrupt);
        process.off('SIGTERM', interrupt);
        try {
            const counts = await report.finish(completed, fatalError);
            console.log(JSON.stringify({ completed, counts }));
            if (fatalError) console.error(fatalError);
            if (interrupted) process.exitCode = 130;
            else if (counts.conflict || counts.error) process.exitCode = 1;
        } finally {
            await Promise.all([disconnectDatabase?.(), disconnectBolma?.()]);
        }
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
