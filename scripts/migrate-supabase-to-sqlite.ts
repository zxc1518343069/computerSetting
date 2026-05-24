import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getDb } from '../lib/db';
import { toCents } from '../lib/db/serializers';

interface SupabaseProduct {
    id: number;
    category: string;
    name: string;
    price: number | string;
    selling_price?: number | string | null;
    is_use_premium?: boolean | null;
    created_at?: string;
    updated_at?: string;
}

interface SupabasePricingConfig {
    id: number;
    unified_pricing: boolean;
    unified_rate: number | string;
    rounding_type?: string | null;
    cpu_rate: number | string;
    motherboard_rate: number | string;
    ram_rate: number | string;
    gpu_rate: number | string;
    storage_rate: number | string;
    psu_rate: number | string;
    case_rate: number | string;
    cooling_rate: number | string;
    monitor_rate?: number | string | null;
    created_at?: string;
    updated_at?: string;
}

interface SupabasePackage {
    id: number;
    name: string;
    description?: string | null;
    total_price?: number | string | null;
    created_at?: string;
    updated_at?: string;
}

interface SupabasePackageItem {
    id: number;
    package_id: number;
    product_id: number;
    quantity: number;
    created_at?: string;
}

const requireEnv = (name: string) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value;
};

const toNumber = (value: number | string | null | undefined) => Number(value || 0);

const loadEnvLocal = () => {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) return;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
};

const main = async () => {
    loadEnvLocal();

    const supabase = createClient(
        requireEnv('SUPABASE_PROJECT_URL'),
        requireEnv('SUPABASE_ANON_KEY')
    );

    const [
        { data: products, error: productsError },
        { data: pricing, error: pricingError },
        { data: packages, error: packagesError },
        { data: packageItems, error: packageItemsError },
    ] = await Promise.all([
        supabase.from('products').select('*').order('id', { ascending: true }),
        supabase.from('pricing_config').select('*').order('id', { ascending: true }),
        supabase.from('packages').select('*').order('id', { ascending: true }),
        supabase.from('package_items').select('*').order('id', { ascending: true }),
    ]);

    if (productsError) throw productsError;
    if (pricingError) throw pricingError;
    if (packagesError) throw packagesError;
    if (packageItemsError) throw packageItemsError;

    const db = getDb();

    const migrate = db.transaction(() => {
        db.prepare('DELETE FROM package_items').run();
        db.prepare('DELETE FROM packages').run();
        db.prepare('DELETE FROM products').run();
        db.prepare('DELETE FROM pricing_config').run();

        const insertProduct = db.prepare(
            `
            INSERT INTO products (
                id,
                category,
                name,
                price_cents,
                stock_quantity,
                selling_price_cents,
                is_use_premium,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @category,
                @name,
                @price_cents,
                0,
                @selling_price_cents,
                @is_use_premium,
                @created_at,
                @updated_at
            )
        `
        );

        for (const product of (products || []) as SupabaseProduct[]) {
            insertProduct.run({
                id: product.id,
                category: product.category,
                name: product.name,
                price_cents: toCents(toNumber(product.price)),
                selling_price_cents:
                    product.selling_price === null || product.selling_price === undefined
                        ? null
                        : toCents(toNumber(product.selling_price)),
                is_use_premium: product.is_use_premium === false ? 0 : 1,
                created_at: product.created_at || new Date().toISOString(),
                updated_at: product.updated_at || new Date().toISOString(),
            });
        }

        const insertPricing = db.prepare(
            `
            INSERT INTO pricing_config (
                id,
                unified_pricing,
                unified_rate,
                rounding_type,
                cpu_rate,
                motherboard_rate,
                ram_rate,
                gpu_rate,
                storage_rate,
                psu_rate,
                case_rate,
                cooling_rate,
                monitor_rate,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @unified_pricing,
                @unified_rate,
                @rounding_type,
                @cpu_rate,
                @motherboard_rate,
                @ram_rate,
                @gpu_rate,
                @storage_rate,
                @psu_rate,
                @case_rate,
                @cooling_rate,
                @monitor_rate,
                @created_at,
                @updated_at
            )
        `
        );

        for (const config of (pricing || []) as SupabasePricingConfig[]) {
            insertPricing.run({
                id: config.id,
                unified_pricing: config.unified_pricing ? 1 : 0,
                unified_rate: toNumber(config.unified_rate),
                rounding_type: config.rounding_type || 'none',
                cpu_rate: toNumber(config.cpu_rate),
                motherboard_rate: toNumber(config.motherboard_rate),
                ram_rate: toNumber(config.ram_rate),
                gpu_rate: toNumber(config.gpu_rate),
                storage_rate: toNumber(config.storage_rate),
                psu_rate: toNumber(config.psu_rate),
                case_rate: toNumber(config.case_rate),
                cooling_rate: toNumber(config.cooling_rate),
                monitor_rate: toNumber(config.monitor_rate),
                created_at: config.created_at || new Date().toISOString(),
                updated_at: config.updated_at || new Date().toISOString(),
            });
        }

        if (!pricing || pricing.length === 0) {
            db.prepare(
                `
                INSERT INTO pricing_config (
                    id,
                    unified_pricing,
                    unified_rate,
                    rounding_type,
                    cpu_rate,
                    motherboard_rate,
                    ram_rate,
                    gpu_rate,
                    storage_rate,
                    psu_rate,
                    case_rate,
                    cooling_rate,
                    monitor_rate
                )
                VALUES (1, 1, 0, 'none', 0, 0, 0, 0, 0, 0, 0, 0, 0)
            `
            ).run();
        }

        const insertPackage = db.prepare(
            `
            INSERT INTO packages (
                id,
                name,
                description,
                total_price_cents,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @name,
                @description,
                @total_price_cents,
                @created_at,
                @updated_at
            )
        `
        );

        for (const pkg of (packages || []) as SupabasePackage[]) {
            insertPackage.run({
                id: pkg.id,
                name: pkg.name,
                description: pkg.description || null,
                total_price_cents: toCents(toNumber(pkg.total_price)),
                created_at: pkg.created_at || new Date().toISOString(),
                updated_at: pkg.updated_at || new Date().toISOString(),
            });
        }

        const insertPackageItem = db.prepare(
            `
            INSERT INTO package_items (
                id,
                package_id,
                product_id,
                quantity,
                created_at
            )
            VALUES (
                @id,
                @package_id,
                @product_id,
                @quantity,
                @created_at
            )
        `
        );

        for (const item of (packageItems || []) as SupabasePackageItem[]) {
            insertPackageItem.run({
                id: item.id,
                package_id: item.package_id,
                product_id: item.product_id,
                quantity: item.quantity,
                created_at: item.created_at || new Date().toISOString(),
            });
        }
    });

    migrate();

    const counts = {
        products: (products || []).length,
        pricing_config: (pricing || []).length,
        packages: (packages || []).length,
        package_items: (packageItems || []).length,
    };

    console.log('Migration completed:', counts);
};

main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
