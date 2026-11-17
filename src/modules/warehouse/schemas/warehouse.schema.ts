import { z } from 'zod';

export const WarehouseIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateWarehouseSchema = z.object({
    name: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    city: z.string().min(1).max(100),
    street: z.string().min(1).max(100),
    buildingNumber: z.string().min(1).max(20),
});

export type CreateWarehouseDTO = z.infer<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = CreateWarehouseSchema;

export type UpdateWarehouseDTO = z.infer<typeof UpdateWarehouseSchema>;
