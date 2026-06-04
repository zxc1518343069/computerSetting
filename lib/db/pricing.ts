import type { PricingConfig } from '@/const/types';
import type { SqliteDb } from './index';
import { ensureProductCategoriesReady } from './productCategories';

export interface PricingConfigRow {
    id?: number;
    unified_pricing: number;
    unified_rate: number;
    rounding_type?: string;
    cpu_rate?: number;
    motherboard_rate?: number;
    ram_rate?: number;
    gpu_rate?: number;
    storage_rate?: number;
    psu_rate?: number;
    case_rate?: number;
    cooling_rate?: number;
    monitor_rate?: number;
    created_at?: string;
    updated_at?: string;
}

export interface CategoryPricingRateRow {
    id: number;
    category_id: number;
    rate: number;
    category_code?: string | null;
    category_name: string;
    category_label: string;
    tag_color: string;
    sort_order: number;
    is_active: number;
    created_at?: string;
    updated_at?: string;
}

const LEGACY_PRICING_RATE_COLUMNS: Record<string, keyof PricingConfigRow> = {
    cpu: 'cpu_rate',
    motherboard: 'motherboard_rate',
    ram: 'ram_rate',
    gpu: 'gpu_rate',
    storage: 'storage_rate',
    psu: 'psu_rate',
    case: 'case_rate',
    cooling: 'cooling_rate',
    monitor: 'monitor_rate',
};

export const ensurePricingConfigRow = (db: SqliteDb) => {
    const existing = db.prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1').get() as
        | PricingConfigRow
        | undefined;
    if (existing) return existing;

    db.prepare(
        `
        INSERT INTO pricing_config (
            unified_pricing, unified_rate, rounding_type,
            cpu_rate, motherboard_rate, ram_rate, gpu_rate, storage_rate,
            psu_rate, case_rate, cooling_rate, monitor_rate, updated_at
        )
        VALUES (1, 0, 'none', 0, 0, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)
    `
    ).run();

    return db.prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1').get() as
        | PricingConfigRow
        | undefined;
};

export const migrateLegacyPricingRates = (db: SqliteDb) => {
    ensureProductCategoriesReady(db);
    const row = ensurePricingConfigRow(db);
    if (!row) return;

    const insert = db.prepare(
        `
        INSERT OR IGNORE INTO category_pricing_rates (
            category_id, rate, updated_at
        )
        SELECT id, @rate, CURRENT_TIMESTAMP
        FROM product_categories
        WHERE code = @code
    `
    );

    Object.entries(LEGACY_PRICING_RATE_COLUMNS).forEach(([code, column]) => {
        insert.run({
            code,
            rate: Number(row[column] || 0),
        });
    });
};

export const getCategoryPricingRateRows = (db: SqliteDb) =>
    db
        .prepare(
            `
            SELECT
                cpr.*,
                pc.code AS category_code,
                pc.name AS category_name,
                pc.label AS category_label,
                pc.tag_color AS tag_color,
                pc.sort_order AS sort_order,
                pc.is_active AS is_active
            FROM category_pricing_rates cpr
            JOIN product_categories pc ON pc.id = cpr.category_id
            ORDER BY pc.sort_order ASC, pc.id ASC
        `
        )
        .all() as CategoryPricingRateRow[];

export const getCategoryRates = (db: SqliteDb) => {
    const rates: Record<number, number> = {};
    getCategoryPricingRateRows(db).forEach((row) => {
        rates[row.category_id] = Number(row.rate || 0);
    });
    return rates;
};

export const serializePricingConfig = (
    row: PricingConfigRow | undefined,
    categoryRates: Record<number, number>
): PricingConfig => ({
    id: row?.id,
    unifiedPricing: Boolean(row?.unified_pricing ?? 1),
    unifiedRate: Number(row?.unified_rate || 0),
    roundingType: (row?.rounding_type || 'none') as PricingConfig['roundingType'],
    categoryRates,
});

export const getPricingConfig = (db: SqliteDb): PricingConfig => {
    migrateLegacyPricingRates(db);
    return serializePricingConfig(ensurePricingConfigRow(db), getCategoryRates(db));
};

export const getPricingConfigResponse = (db: SqliteDb) => {
    const config = getPricingConfig(db);
    const rates = getCategoryPricingRateRows(db).map((row) => ({
        id: row.id,
        categoryId: row.category_id,
        categoryCode: row.category_code || null,
        categoryName: row.category_name,
        categoryLabel: row.category_label,
        tagColor: row.tag_color || 'blue',
        sortOrder: Number(row.sort_order || 0),
        isActive: Boolean(row.is_active),
        rate: Number(row.rate || 0),
    }));

    return {
        ...config,
        rates,
    };
};

export const savePricingConfig = (db: SqliteDb, config: Partial<PricingConfig>) => {
    const existing = ensurePricingConfigRow(db);
    const payload = {
        id: existing?.id,
        unified_pricing: config.unifiedPricing ? 1 : 0,
        unified_rate: Number(config.unifiedRate || 0),
        rounding_type: config.roundingType || 'none',
    };

    db.prepare(
        `
        UPDATE pricing_config
        SET unified_pricing = @unified_pricing,
            unified_rate = @unified_rate,
            rounding_type = @rounding_type,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    ).run(payload);

    const categoryRates = config.categoryRates || {};
    const upsertRate = db.prepare(
        `
        INSERT INTO category_pricing_rates (category_id, rate, updated_at)
        VALUES (@category_id, @rate, CURRENT_TIMESTAMP)
        ON CONFLICT(category_id) DO UPDATE SET
            rate = excluded.rate,
            updated_at = CURRENT_TIMESTAMP
    `
    );

    Object.entries(categoryRates).forEach(([categoryId, rate]) => {
        const id = Number(categoryId);
        if (!Number.isInteger(id) || id <= 0) return;
        upsertRate.run({
            category_id: id,
            rate: Number(rate || 0),
        });
    });

    return getPricingConfigResponse(db);
};
