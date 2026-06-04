import type { SqliteDb } from './index';

export const CATEGORY_TAG_COLORS = [
    'blue',
    'green',
    'purple',
    'orange',
    'cyan',
    'magenta',
    'gold',
    'red',
    'lime',
    'geekblue',
    'volcano',
] as const;

export const DEFAULT_PRODUCT_CATEGORIES = [
    { code: 'cpu', name: '处理器', label: 'CPU(处理器)', tag_color: 'blue' },
    { code: 'motherboard', name: '主板', label: 'Motherboard(主板)', tag_color: 'purple' },
    { code: 'ram', name: '内存', label: 'RAM(内存)', tag_color: 'green' },
    { code: 'gpu', name: '显卡', label: 'GPU(显卡)', tag_color: 'red' },
    { code: 'storage', name: '存储', label: 'Storage(存储)', tag_color: 'gold' },
    { code: 'psu', name: '电源', label: 'PSU(电源)', tag_color: 'orange' },
    { code: 'case', name: '机箱', label: 'Case(机箱)', tag_color: 'geekblue' },
    { code: 'cooling', name: '散热', label: 'Cooling(散热)', tag_color: 'cyan' },
    { code: 'monitor', name: '显示器', label: 'Monitor(显示器)', tag_color: 'magenta' },
] as const;

export interface ProductCategoryRow {
    id: number;
    code?: string | null;
    name: string;
    label: string;
    tag_color: string;
    sort_order: number;
    is_active: number;
    product_count?: number;
    pricing_rate_id?: number | null;
    pricing_rate?: number | null;
    created_at?: string;
    updated_at?: string;
}

export const serializeProductCategory = (row: ProductCategoryRow) => ({
    id: row.id,
    code: row.code || null,
    name: row.name,
    label: row.label,
    tag_color: row.tag_color || 'blue',
    sort_order: Number(row.sort_order || 0),
    is_active: Boolean(row.is_active),
    product_count: Number(row.product_count || 0),
    pricing_rate_id: row.pricing_rate_id ?? null,
    pricing_rate: row.pricing_rate === null || row.pricing_rate === undefined ? null : Number(row.pricing_rate),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const normalizeTagColor = (value: unknown) => {
    const color = String(value || '').trim();
    return CATEGORY_TAG_COLORS.includes(color as (typeof CATEGORY_TAG_COLORS)[number])
        ? color
        : null;
};

export const getNextTagColor = (db: SqliteDb) => {
    const rows = db
        .prepare(
            `
            SELECT tag_color, COUNT(*) AS count
            FROM product_categories
            GROUP BY tag_color
        `
        )
        .all() as Array<{ tag_color: string; count: number }>;

    const counts = new Map(rows.map((row) => [row.tag_color, Number(row.count || 0)]));
    return [...CATEGORY_TAG_COLORS].sort(
        (a, b) => (counts.get(a) || 0) - (counts.get(b) || 0)
    )[0];
};

export const ensureDefaultProductCategories = (db: SqliteDb) => {
    const insert = db.prepare(
        `
        INSERT OR IGNORE INTO product_categories (
            code, name, label, tag_color, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @name, @label, @tag_color, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `
    );

    DEFAULT_PRODUCT_CATEGORIES.forEach((category, index) => {
        insert.run({
            ...category,
            sort_order: (index + 1) * 10,
        });
    });
};

export const ensureCategoriesForLegacyProducts = (db: SqliteDb) => {
    const rows = db
        .prepare(
            `
            SELECT DISTINCT category
            FROM products
            WHERE category IS NOT NULL
              AND category <> ''
              AND category NOT IN (SELECT code FROM product_categories WHERE code IS NOT NULL)
            ORDER BY category ASC
        `
        )
        .all() as Array<{ category: string }>;

    if (rows.length === 0) return;

    const maxSortRow = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM product_categories')
        .get() as { max_sort: number };
    let sortOrder = Number(maxSortRow?.max_sort || 0);
    const insert = db.prepare(
        `
        INSERT OR IGNORE INTO product_categories (
            code, name, label, tag_color, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @name, @label, @tag_color, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `
    );

    rows.forEach((row, index) => {
        const code = String(row.category || '').trim();
        if (!code) return;
        sortOrder += 10;
        insert.run({
            code,
            name: code,
            label: code,
            tag_color: CATEGORY_TAG_COLORS[index % CATEGORY_TAG_COLORS.length],
            sort_order: sortOrder,
        });
    });
};

export const backfillProductCategoryIds = (db: SqliteDb) => {
    db.exec(`
        UPDATE products
        SET category_id = (
            SELECT pc.id
            FROM product_categories pc
            WHERE pc.code = products.category
        )
        WHERE category_id IS NULL
          AND category IS NOT NULL
          AND category <> ''
          AND EXISTS (
              SELECT 1
              FROM product_categories pc
              WHERE pc.code = products.category
          );
    `);
};

export const ensureProductCategoriesReady = (db: SqliteDb) => {
    ensureDefaultProductCategories(db);
    ensureCategoriesForLegacyProducts(db);
    backfillProductCategoryIds(db);
};

export const getProductCategoryById = (db: SqliteDb, id: number) =>
    db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as
        | ProductCategoryRow
        | undefined;

export const getProductCategoryByCode = (db: SqliteDb, code: string) =>
    db.prepare('SELECT * FROM product_categories WHERE code = ?').get(code) as
        | ProductCategoryRow
        | undefined;

export const createGeneratedCategoryCode = (id: number) => `category_${id}`;

export const createLegacyProductCategory = (db: SqliteDb, category: string) => {
    const code = String(category || '').trim();
    if (!code) return undefined;

    const existing = getProductCategoryByCode(db, code);
    if (existing) return existing;

    const maxSortRow = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM product_categories')
        .get() as { max_sort: number };

    const result = db
        .prepare(
            `
            INSERT INTO product_categories (
                code, name, label, tag_color, sort_order, is_active, updated_at
            )
            VALUES (
                @code, @name, @label, @tag_color, @sort_order, 1, CURRENT_TIMESTAMP
            )
        `
        )
        .run({
            code,
            name: code,
            label: code,
            tag_color: getNextTagColor(db),
            sort_order: Number(maxSortRow?.max_sort || 0) + 10,
        });

    return getProductCategoryById(db, Number(result.lastInsertRowid));
};

export const resolveProductCategoryInput = (
    db: SqliteDb,
    input: { category_id?: unknown; category?: unknown }
) => {
    const categoryId = Number(input.category_id || 0);
    if (Number.isInteger(categoryId) && categoryId > 0) {
        return getProductCategoryById(db, categoryId);
    }

    const category = String(input.category || '').trim();
    if (!category) return undefined;

    return getProductCategoryByCode(db, category) || createLegacyProductCategory(db, category);
};
