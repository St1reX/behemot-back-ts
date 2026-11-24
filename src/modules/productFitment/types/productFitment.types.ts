import type { ProductFitmentRepository } from '../repositories/productFitmentRepository';

export type ProductFitmentResponse = NonNullable<Awaited<ReturnType<typeof ProductFitmentRepository.findById>>>;

export interface DeleteProductFitmentResponse {
    message: string;
}
