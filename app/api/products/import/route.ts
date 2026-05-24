import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface ImportProduct {
    name: string;
    price: number;
    category: string;
    selling_price?: number | null;
    is_use_premium?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { products } = await request.json();

        if (!products || !Array.isArray(products) || products.length === 0) {
            return error(400, '产品数据不能为空');
        }

        const validProducts: ImportProduct[] = [];
        const errors: string[] = [];

        products.forEach((product: ImportProduct, index: number) => {
            if (!product.category || !product.name || product.price === undefined) {
                errors.push(`第 ${index + 1} 条数据格式不正确`);
            } else {
                validProducts.push(product);
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
                    category, name, price_cents, stock_quantity, selling_price_cents,
                    is_use_premium, updated_at
                )
                VALUES (
                    @category, @name, @price_cents, 0, @selling_price_cents,
                    @is_use_premium, CURRENT_TIMESTAMP
                )
            `
            );

            for (const product of validProducts) {
                insert.run({
                    category: product.category,
                    name: product.name,
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
            .prepare('SELECT * FROM products ORDER BY created_at DESC')
            .all() as ProductRow[];
        return success(rows.map(serializeProduct), `成功导入 ${rows.length} 条产品数据`);
    } catch (e) {
        console.error('Import products error:', e);
        return error(500, '批量导入失败');
    }
}
