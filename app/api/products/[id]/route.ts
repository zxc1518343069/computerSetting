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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const db = getDb();
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
            .get(parseInt(idParam)) as
            | ProductRow
            | undefined;

        if (!row) {
            return error(404, '产品不存在');
        }

        return success(serializeProduct(row), '获取产品详情成功');
    } catch (e) {
        console.error('Get product error:', e);
        return error(500, '获取产品详情失败');
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
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
                UPDATE products
                SET category = @category,
                    category_id = @category_id,
                    name = @name,
                    barcode = @barcode,
                    price_cents = @price_cents,
                    selling_price_cents = @selling_price_cents,
                    is_use_premium = @is_use_premium,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({
                id,
                category: resolvedCategory.code || String(resolvedCategory.id),
                category_id: resolvedCategory.id,
                name,
                barcode: normalizeBarcode(barcode),
                price_cents: toCents(price),
                selling_price_cents: is_use_premium ? null : toCents(selling_price),
                is_use_premium: is_use_premium === false ? 0 : 1,
            });

        if (result.changes === 0) {
            return error(404, '产品不存在');
        }

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
            .get(id) as ProductRow;
        return success(serializeProduct(row), '产品更新成功');
    } catch (e) {
        if (isBarcodeConflict(e)) {
            return error(400, '条形码已存在');
        }
        console.error('Update product error:', e);
        return error(500, '更新产品失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();

        const used = db
            .prepare('SELECT COUNT(*) AS count FROM package_items WHERE product_id = ?')
            .get(id) as { count: number };

        if (used.count > 0) {
            return error(400, '该产品正在被套餐使用，无法删除');
        }

        const inventory = db
            .prepare('SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ?')
            .get(id) as { count: number };

        if (inventory.count > 0) {
            return error(400, '该产品已有库存记录，无法删除');
        }

        const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
        if (result.changes === 0) {
            return error(404, '产品不存在');
        }

        return success(null, '产品删除成功');
    } catch (e) {
        console.error('Delete product error:', e);
        return error(500, '删除产品失败');
    }
}
