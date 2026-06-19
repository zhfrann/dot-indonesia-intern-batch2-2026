export type PaginationInput = {
    page?: number;
    limit?: number;
};

export type PaginationResult = {
    page: number;
    limit: number;
    skip: number;
    take: number;
};

export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export function getPagination(input: PaginationInput): PaginationResult {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
    };
}

export function getPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}
