import type { BolmaProductPreview } from '../seedBolmaProduct/bolmaProductImport.service';
import { BASELINKER_IMPORT_FIELDS } from './baselinkerProductImport.constants';
import { BaselinkerCsvRecord } from './baselinkerProductImport.parser';
import { BaselinkerProductImportReport } from './baselinkerProductImport.report';
import { BaselinkerProductImportService } from './baselinkerProductImport.service';

export async function runBaselinkerProductImport(records: BaselinkerCsvRecord[], apply: boolean,
    report: BaselinkerProductImportReport, isInterrupted: () => boolean,
    previewProducts?: Map<string, BolmaProductPreview>) {
    let completed = false;
    let fatalError: string | undefined;
    try {
        completed = await BaselinkerProductImportService.run(records, apply, report, isInterrupted, previewProducts);
    } catch (error) {
        fatalError = error instanceof Error ? error.message : String(error);
    }
    const summary = await report.finish(completed, fatalError);
    console.log(`Produkty po etapie Bolmy, których SKU nie ma w BaseLinkerze: ${summary.productsMissingFromExport}. Szczegóły: missing_source_product w raporcie.`);
    console.log(`Dopasowane produkty legacy: ${summary.completeness.matchedProducts}. Niekompletne w eksporcie: ${summary.completeness.sourceIncompleteProducts}.`);
    console.log(`Dane dobrane ze starszych rekordów dla ${summary.completeness.productsWithFallback} produktów. Niekompletne po ${apply ? 'zapisie' : 'planowanych zmianach'}: ${summary.completeness.remainingIncompleteProducts}.`);
    console.table(Object.keys(BASELINKER_IMPORT_FIELDS).map((key) => {
        const field = key as keyof typeof BASELINKER_IMPORT_FIELDS;
        return { Pole: BASELINKER_IMPORT_FIELDS[field], 'Brak w najnowszym': summary.completeness.latestMissingByField[field],
            'Ze starszych': summary.completeness.fallbackByField[field],
            'Brak we wszystkich': summary.completeness.sourceMissingByField[field],
            'Brak po zmianach': summary.completeness.remainingMissingByField[field] };
    }));
    console.log(`BaseLinker: ${JSON.stringify(summary)}`);
    return summary;
}
