import { getDb } from '@/lib/db';
import {
    InventoryItemRow,
    ProductRow,
    serializeInventoryItem,
    serializeProduct,
} from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('product_id');
        const status = searchParams.get('status') || 'in_stock';
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const conditions: string[] = [];
        const params: Record<string, string | number> = {};

        if (productId) {
            conditions.push('ii.product_id = @product_id');
            params.product_id = parseInt(productId);
        }

        if (status && status !== 'all') {
            conditions.push('ii.status = @status');
            params.status = status;
        }

        if (category) {
            conditions.push('p.category = @category');
            params.category = category;
        }

        if (search) {
            conditions.push(
                '(p.name LIKE @search OR p.barcode LIKE @search OR s.name LIKE @search OR ii.serial_number LIKE @search)'
            );
            params.search = `%${search}%`;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = db
            .prepare(
                `
                SELECT ii.*, s.name AS supplier_name
                FROM inventory_items ii
                LEFT JOIN products p ON p.id = ii.product_id
                LEFT JOIN suppliers s ON s.id = ii.supplier_id
                ${where}
                ORDER BY ii.created_at DESC
            `
            )
            .all(params) as Array<InventoryItemRow & { supplier_name?: string | null }>;

        const products = db.prepare('SELECT * FROM products').all() as ProductRow[];
        const productMap = new Map(
            products.map((product) => [product.id, serializeProduct(product)])
        );

        const data = rows.map((row) => ({
            ...serializeInventoryItem(row),
            supplier_name: row.supplier_name || null,
            product: productMap.get(row.product_id),
        }));

        return success(data, '获取库存明细成功');
    } catch (e) {
        console.error('Get inventory items error:', e);
        return error(500, '获取库存明细失败');
    }
}
