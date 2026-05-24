import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toYuan } from '@/lib/db/serializers';
import { PricingCalculator } from '@/utils/pricing';
import { NextRequest } from 'next/server';
import { error, success } from '@/lib/request/apiResponse';
import { PricingConfig, Product } from '@/const/types';

const getPricingConfig = (): PricingConfig => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1').get() as
        | Record<string, number | string>
        | undefined;

    if (!row) {
        return {
            unifiedPricing: true,
            unifiedRate: 0,
            roundingType: 'none',
            cpu: 0,
            motherboard: 0,
            ram: 0,
            gpu: 0,
            storage: 0,
            psu: 0,
            case: 0,
            cooling: 0,
            monitor: 0,
        };
    }

    return {
        unifiedPricing: Boolean(row.unified_pricing),
        unifiedRate: Number(row.unified_rate || 0),
        roundingType: (row.rounding_type || 'none') as PricingConfig['roundingType'],
        cpu: Number(row.cpu_rate || 0),
        motherboard: Number(row.motherboard_rate || 0),
        ram: Number(row.ram_rate || 0),
        gpu: Number(row.gpu_rate || 0),
        storage: Number(row.storage_rate || 0),
        psu: Number(row.psu_rate || 0),
        case: Number(row.case_rate || 0),
        cooling: Number(row.cooling_rate || 0),
        monitor: Number(row.monitor_rate || 0),
    };
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');

        const conditions: string[] = [];
        const params: Record<string, string> = {};

        if (category) {
            conditions.push('category = @category');
            params.category = category;
        }

        if (search) {
            conditions.push('name LIKE @search');
            params.search = `%${search}%`;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const products = db
            .prepare(`SELECT * FROM products ${where} ORDER BY category ASC, name ASC`)
            .all(params) as ProductRow[];

        const inventoryStmt = db.prepare(
            `
            SELECT ii.*, s.name AS supplier_name
            FROM inventory_items ii
            LEFT JOIN suppliers s ON s.id = ii.supplier_id
            WHERE ii.product_id = ? AND ii.status = 'in_stock'
            ORDER BY ii.cost_price_cents ASC, ii.created_at ASC
        `
        );

        const calculator = new PricingCalculator(getPricingConfig());

        const data = products.map((row) => {
            const product = serializeProduct(row);
            const inventoryItems = inventoryStmt.all(row.id) as Array<Record<string, unknown>>;
            const costs = inventoryItems.map((item) => Number(item.cost_price_cents || 0));
            const minCostCents = costs.length > 0 ? Math.min(...costs) : null;
            const maxCostCents = costs.length > 0 ? Math.max(...costs) : null;
            const basePrice =
                maxCostCents !== null ? toYuan(maxCostCents) : Number(product.price || 0);
            const pricingProduct: Product = {
                ...product,
                price: basePrice,
            };

            return {
                ...product,
                stock_quantity: inventoryItems.length,
                has_stock: inventoryItems.length > 0,
                min_cost_price: minCostCents === null ? null : toYuan(minCostCents),
                max_cost_price: maxCostCents === null ? null : toYuan(maxCostCents),
                quote_base_price: basePrice,
                suggested_price: calculator.getProductPrice(pricingProduct),
                inventory_items: inventoryItems.map((item) => ({
                    id: item.id,
                    serial_number: item.serial_number || null,
                    cost_price: toYuan(item.cost_price_cents as number),
                    supplier_name: item.supplier_name || null,
                    warranty_enabled: Boolean(item.warranty_enabled),
                    warranty_until: item.warranty_until || null,
                    inbound_at: item.inbound_at,
                    status: item.status,
                })),
            };
        });

        return success(data, '获取销售列表成功');
    } catch (e) {
        console.error('Get sales products error:', e);
        return error(500, '获取销售列表失败');
    }
}
