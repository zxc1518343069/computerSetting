import { centsToYuan, yuanToCents } from './money';
import type { SqliteDb } from './index';

export const AFTER_SALES_PRICE_TYPES = ['fixed', 'range', 'multi', 'custom'] as const;

export type AfterSalesPriceType = (typeof AFTER_SALES_PRICE_TYPES)[number];

export interface AfterSalesCategoryRow {
    id: number;
    code?: string | null;
    name: string;
    description?: string | null;
    sort_order: number;
    is_active: number;
    service_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface AfterSalesServiceRow {
    id: number;
    code?: string | null;
    category_id: number;
    category_code?: string | null;
    category_name?: string | null;
    category_description?: string | null;
    category_sort_order?: number;
    name: string;
    description?: string | null;
    price_type: AfterSalesPriceType;
    price_cents?: number | null;
    price_label: string;
    unit?: string | null;
    includes?: string | null;
    excludes?: string | null;
    sort_order: number;
    is_featured: number;
    is_active: number;
    created_at?: string;
    updated_at?: string;
}

export interface AfterSalesNoticeRow {
    id: number;
    code?: string | null;
    content: string;
    sort_order: number;
    is_active: number;
    created_at?: string;
    updated_at?: string;
}

export const normalizeNullableText = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
};

export const normalizePriceType = (value: unknown): AfterSalesPriceType | null => {
    const priceType = String(value || '').trim();
    return AFTER_SALES_PRICE_TYPES.includes(priceType as AfterSalesPriceType)
        ? (priceType as AfterSalesPriceType)
        : null;
};

export const createFixedPriceLabel = (price: number | null | undefined) => {
    if (price === null || price === undefined || !Number.isFinite(price)) return '';
    const normalized = Number.isInteger(price) ? String(price) : price.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${normalized}元`;
};

export const serializeAfterSalesCategory = (row: AfterSalesCategoryRow) => ({
    id: row.id,
    code: row.code || null,
    name: row.name,
    description: row.description || null,
    sort_order: Number(row.sort_order || 0),
    is_active: Boolean(row.is_active),
    service_count: Number(row.service_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const serializeAfterSalesService = (row: AfterSalesServiceRow) => ({
    id: row.id,
    code: row.code || null,
    category_id: row.category_id,
    category_code: row.category_code || null,
    category_name: row.category_name || null,
    name: row.name,
    description: row.description || null,
    price_type: row.price_type,
    price:
        row.price_cents === null || row.price_cents === undefined
            ? null
            : centsToYuan(row.price_cents),
    price_label: row.price_label || '',
    unit: row.unit || null,
    includes: row.includes || null,
    excludes: row.excludes || null,
    sort_order: Number(row.sort_order || 0),
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const serializeAfterSalesNotice = (row: AfterSalesNoticeRow) => ({
    id: row.id,
    code: row.code || null,
    content: row.content,
    sort_order: Number(row.sort_order || 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const getAfterSalesCategoryById = (db: SqliteDb, id: number) =>
    db.prepare('SELECT * FROM after_sales_service_categories WHERE id = ?').get(id) as
        | AfterSalesCategoryRow
        | undefined;

export const getAfterSalesServiceById = (db: SqliteDb, id: number) =>
    db
        .prepare(
            `
            SELECT
                s.*,
                c.code AS category_code,
                c.name AS category_name,
                c.description AS category_description,
                c.sort_order AS category_sort_order
            FROM after_sales_services s
            LEFT JOIN after_sales_service_categories c ON c.id = s.category_id
            WHERE s.id = ?
        `
        )
        .get(id) as AfterSalesServiceRow | undefined;

export const getAfterSalesNoticeById = (db: SqliteDb, id: number) =>
    db.prepare('SELECT * FROM after_sales_service_notices WHERE id = ?').get(id) as
        | AfterSalesNoticeRow
        | undefined;

export const getNextAfterSalesSortOrder = (
    db: SqliteDb,
    table: 'after_sales_service_categories' | 'after_sales_services' | 'after_sales_service_notices',
    where?: { category_id?: number }
) => {
    if (table === 'after_sales_services' && where?.category_id) {
        const row = db
            .prepare(
                'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM after_sales_services WHERE category_id = ?'
            )
            .get(where.category_id) as { max_sort: number };
        return Number(row?.max_sort || 0) + 10;
    }

    const row = db
        .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM ${table}`)
        .get() as { max_sort: number };
    return Number(row?.max_sort || 0) + 10;
};

export const toAfterSalesPriceCents = (price: unknown, priceType: AfterSalesPriceType) => {
    if (priceType !== 'fixed') return null;
    return yuanToCents(typeof price === 'number' ? price : String(price ?? ''));
};

