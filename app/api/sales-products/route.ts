import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toYuan } from '@/lib/db/serializers';
import { getPricingConfig } from '@/lib/db/pricing';
import { PricingCalculator } from '@/utils/pricing';
import { NextRequest } from 'next/server';
import { error, success } from '@/lib/request/apiResponse';
import { Product } from '@/const/types';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const categoryId = searchParams.get('category_id');

        const conditions: string[] = [];
        const params: Record<string, string | number> = {};

        if (categoryId) {
            conditions.push('p.category_id = @category_id');
            params.category_id = parseInt(categoryId);
        }

        if (category) {
            conditions.push('(p.category = @category OR pc.code = @category)');
            params.category = category;
        }

        if (search) {
            conditions.push('(p.name LIKE @search OR p.barcode LIKE @search)');
            params.search = `%${search}%`;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const products = db
            .prepare(
                `
                SELECT
                    p.*,
                    pc.name AS category_name,
                    pc.label AS category_label,
                    pc.tag_color AS category_tag_color
                FROM products p
                LEFT JOIN product_categories pc ON pc.id = p.category_id
                ${where}
                ORDER BY pc.sort_order ASC, p.category ASC, p.name ASC
            `
            )
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

        const calculator = new PricingCalculator(getPricingConfig(db));

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
