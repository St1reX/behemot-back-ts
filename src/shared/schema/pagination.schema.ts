import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination';

export const PaginatedListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    search: z.string().trim().max(100).optional(),
});

export type PaginatedListQuery = z.infer<typeof PaginatedListQuerySchema>;

export function parsePaginationQuery(query: Record<string, unknown>): PaginatedListQuery | undefined {
    if (query.page === undefined && query.pageSize === undefined) return undefined;
    return PaginatedListQuerySchema.parse(query);
}
