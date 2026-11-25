import { BolmaProductImportService, BolmaProductPreview } from './bolmaProductImport.service';
import { BolmaProductImportReport } from './bolmaProductImport.report';

export async function runBolmaProductImport(apply: boolean, report: BolmaProductImportReport, isInterrupted: () => boolean) {
    let completed = false;
    let fatalError: string | undefined;
    let previewProducts = new Map<string, BolmaProductPreview>();
    try {
        const result = await BolmaProductImportService.run(apply, report, isInterrupted);
        completed = result.completed;
        previewProducts = result.previewProducts;
    } catch (error) {
        fatalError = error instanceof Error ? error.message : String(error);
    }
    const counts = await report.finish(completed, fatalError);
    console.log(`Bolma: ${JSON.stringify({ completed, counts, ...(fatalError ? { fatalError } : {}) })}`);
    return { completed, counts, previewProducts, fatalError };
}
