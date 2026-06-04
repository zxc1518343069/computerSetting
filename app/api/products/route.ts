import { error, success } from '@/lib/request/apiResponse';
import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toCents } from '@/lib/db/serializers';
import { resolveProductCategoryInput } from '@/lib/db/productCategories';
import { NextRequest } from 'next/server';

const normalizeBarcode = (value: unknown) => {
    if (value === null || value === undefined) return null;

    const barcode = String(value).trim();
    return barcode || null;
};

const isBarcodeConflict = (e: unknown) =>
    e instanceof Error && e.message.includes('UNIQUE constraint failed: products.barcode');

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const categoryId = searchParams.get('category_id');
        const search = searchParams.get('search');

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
        const rows = db
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
                ORDER BY p.created_at DESC
            `
            )
            .all(params) as ProductRow[];

        return success(rows.map(serializeProduct), '获取产品列表成功');
    } catch (e) {
        console.error('Get products error:', e);
        return error(500, '获取产品列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { category_id, category, name, barcode, price, selling_price, is_use_premium } =
            await request.json();

        const resolvedCategory = resolveProductCategoryInput(db, { category_id, category });

        if (!resolvedCategory || !name || price === undefined) {
            return error(400, '产品类别、名称和价格不能为空');
        }

        const result = db
            .prepare(
                `
                INSERT INTO products (
                    category,
                    category_id,
                    name,
                    barcode,
                    price_cents,
                    stock_quantity,
                    selling_price_cents,
                    is_use_premium,
                    updated_at
                )
                VALUES (@category, @category_id, @name, @barcode, @price_cents, 0, @selling_price_cents, @is_use_premium, CURRENT_TIMESTAMP)
            `
            )
            .run({
                category: resolvedCategory.code || String(resolvedCategory.id),
                category_id: resolvedCategory.id,
                name,
                barcode: normalizeBarcode(barcode),
                price_cents: toCents(price),
                selling_price_cents: is_use_premium ? null : toCents(selling_price),
                is_use_premium: is_use_premium === false ? 0 : 1,
            });

        const row = db
            .prepare(
                `
                SELECT
                    p.*,
                    pc.name AS category_name,
                    pc.label AS category_label,
                    pc.tag_color AS category_tag_color
                FROM products p
                LEFT JOIN product_categories pc ON pc.id = p.category_id
                WHERE p.id = ?
            `
            )
            .get(result.lastInsertRowid) as ProductRow;

        return success(serializeProduct(row), '产品创建成功');
    } catch (e) {
        if (isBarcodeConflict(e)) {
            return error(400, '条形码已存在');
        }
        console.error('Create product error:', e);
        return error(500, '创建产品失败');
    }
}
