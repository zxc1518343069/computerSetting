import { getDb } from '@/lib/db';
import { resolveProductCategoryInput } from '@/lib/db/productCategories';
import { ProductRow, serializeProduct, toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface ImportProduct {
    name: string;
    price: number;
    category: string;
    category_id?: number | null;
    barcode?: string | null;
    selling_price?: number | null;
    is_use_premium?: boolean;
}

const normalizeBarcode = (value: unknown) => {
    if (value === null || value === undefined) return null;

    const barcode = String(value).trim();
    return barcode || null;
};

const isBarcodeConflict = (e: unknown) =>
    e instanceof Error && e.message.includes('UNIQUE constraint failed: products.barcode');

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { products } = await request.json();

        if (!products || !Array.isArray(products) || products.length === 0) {
            return error(400, '产品数据不能为空');
        }

        const validProducts: ImportProduct[] = [];
        const errors: string[] = [];
        const seenBarcodes = new Set<string>();

        products.forEach((product: ImportProduct, index: number) => {
            if ((!product.category && !product.category_id) || !product.name || product.price === undefined) {
                errors.push(`第 ${index + 1} 条数据格式不正确`);
            } else {
                const barcode = normalizeBarcode(product.barcode);
                if (barcode && seenBarcodes.has(barcode)) {
                    errors.push(`第 ${index + 1} 条条形码重复`);
                    return;
                }

                if (barcode) {
                    seenBarcodes.add(barcode);
                }

                validProducts.push({
                    ...product,
                    barcode,
                });
            }
        });

        if (errors.length > 0) {
            return Response.json(
                {
                    code: 400,
                    message: '部分数据格式不正确',
                    details: errors,
                },
                { status: 400 }
            );
        }

        const importProducts = db.transaction(() => {
            db.prepare('DELETE FROM package_items').run();
            db.prepare('DELETE FROM products').run();

            const insert = db.prepare(
                `
                INSERT INTO products (
                    category, category_id, name, barcode, price_cents, stock_quantity, selling_price_cents,
                    is_use_premium, updated_at
                )
                VALUES (
                    @category, @category_id, @name, @barcode, @price_cents, 0, @selling_price_cents,
                    @is_use_premium, CURRENT_TIMESTAMP
                )
            `
            );

            for (const product of validProducts) {
                const resolvedCategory = resolveProductCategoryInput(db, {
                    category_id: product.category_id,
                    category: product.category,
                });

                if (!resolvedCategory) throw new Error('CATEGORY_NOT_FOUND');

                insert.run({
                    category: resolvedCategory.code || product.category,
                    category_id: resolvedCategory.id,
                    name: product.name,
                    barcode: product.barcode,
                    price_cents: toCents(product.price),
                    selling_price_cents: product.selling_price
                        ? toCents(product.selling_price)
                        : null,
                    is_use_premium: product.is_use_premium === false ? 0 : 1,
                });
            }
        });

        importProducts();

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
                ORDER BY p.created_at DESC
            `
            )
            .all() as ProductRow[];
        return success(rows.map(serializeProduct), `成功导入 ${rows.length} 条产品数据`);
    } catch (e) {
        if (isBarcodeConflict(e)) {
            return error(400, '条形码已存在');
        }
        if (e instanceof Error && e.message === 'CATEGORY_NOT_FOUND') {
            return error(400, '产品类目不存在');
        }
        console.error('Import products error:', e);
        return error(500, '批量导入失败');
    }
}
