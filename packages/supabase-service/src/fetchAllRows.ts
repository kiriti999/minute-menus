type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/** PostgREST returns at most 1000 rows per request by default. */
const PAGE_SIZE = 1000;

/**
 * Fetches every row of a query by paging with `.range()`, so busy restaurants'
 * analytics aren't silently cut off. Throws on query errors instead of letting
 * callers fall back to empty data (which shows owners zeros).
 * The query must have a stable order for paging to be correct.
 */
export async function fetchAllRows<T>(
    page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await page(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
}

/** Unwraps a single query result, throwing on error. */
export function requireData<T>(result: { data: T | null; error: { message: string } | null }): T | null {
    if (result.error) throw new Error(result.error.message);
    return result.data;
}
