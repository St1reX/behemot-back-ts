import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { ProductFitmentFieldsSchema } from './schemas/productFitment.schema';

type FitmentInput = z.infer<typeof ProductFitmentFieldsSchema>;

// Normalize the hierarchy so generation-only API clients remain supported.
export async function validateProductFitments(tx: Prisma.TransactionClient, fitments: FitmentInput[]) {
    const normalized: FitmentInput[] = [];
    for (const fitment of fitments) {
        let { carBrandId, carModelId, carGenerationId } = fitment;
        if (carGenerationId) {
            const generation = await tx.carGeneration.findFirst({
                where: { id: carGenerationId, deletedAt: null, carModel: { deletedAt: null, carBrand: { deletedAt: null } } },
                select: { carModelId: true },
            });
            if (!generation || (carModelId && carModelId !== generation.carModelId)) {
                throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Generacja nie należy do wybranego modelu lub jest niedostępna.');
            }
            carModelId = generation.carModelId;
        }
        if (carModelId) {
            const model = await tx.carModel.findFirst({
                where: { id: carModelId, deletedAt: null, carBrand: { deletedAt: null } }, select: { carBrandId: true },
            });
            if (!model || (carBrandId && carBrandId !== model.carBrandId)) {
                throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Model nie należy do wybranej marki lub jest niedostępny.');
            }
            carBrandId = model.carBrandId;
        }
        if (!carBrandId || !await tx.carBrand.findFirst({ where: { id: carBrandId, deletedAt: null }, select: { id: true } })) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Wybierz dostępną markę pojazdu. Model i lata produkcji są opcjonalne.');
        }
        normalized.push({ ...fitment, carBrandId, carModelId, carGenerationId });
    }
    const keys = normalized.map((fitment) => [fitment.carBrandId, fitment.carModelId, fitment.carGenerationId].join(':'));
    if (new Set(keys).size !== keys.length) {
        throw new AppError(ErrorNames.CONFLICT, 409, 'Ten sam pojazd został dodany do produktu więcej niż raz.');
    }
    return normalized;
}
