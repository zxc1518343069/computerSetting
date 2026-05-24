import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface PackageItemInput {
    product_id: number;
    quantity: number;
}

const getPackages = (search?: string | null) => {
    const db = getDb();
    const rows = search
        ? (db
              .prepare(
                  `
                  SELECT * FROM packages
                  WHERE name LIKE @search OR description LIKE @search
                  ORDER BY created_at DESC
              `
              )
              .all({ search: `%${search}%` }) as Record<string, unknown>[])
        : (db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all() as Record<
              string,
              unknown
          >[]);

    const itemStmt = db.prepare(
        `
            SELECT pi.*, p.*
            FROM package_items pi
            JOIN products p ON p.id = pi.product_id
            WHERE pi.package_id = ?
        `
    );

    return rows.map((pkg) => {
        const items = itemStmt.all(pkg.id) as Array<Record<string, unknown>>;
        return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            total_price: toYuan(pkg.total_price_cents as number),
            created_at: pkg.created_at,
            updated_at: pkg.updated_at,
            items: items.map((item) => {
                const product = serializeProduct({
                    id: item.product_id,
                    category: item.category,
                    name: item.name,
                    price_cents: item.price_cents,
                    stock_quantity: item.stock_quantity,
                    selling_price_cents: item.selling_price_cents,
                    is_use_premium: item.is_use_premium,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                } as ProductRow);

                return {
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    product_name: product.name,
                    product_price: product.price,
                    product_category: product.category,
                };
            }),
        };
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        return success(getPackages(searchParams.get('search')), '获取套餐列表成功');
    } catch (e) {
        console.error('Get packages error:', e);
        return error(500, '获取套餐列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { name, description, items } = await request.json();

        if (!name || !items || items.length === 0) {
            return error(400, '套餐名称和配件不能为空');
        }

        const createPackage = db.transaction(() => {
            let totalCents = 0;
            for (const item of items as PackageItemInput[]) {
                const product = db
                    .prepare('SELECT price_cents FROM products WHERE id = ?')
                    .get(item.product_id) as { price_cents: number } | undefined;
                if (!product) throw new Error('PRODUCT_NOT_FOUND');
                totalCents += product.price_cents * item.quantity;
            }

            const packageResult = db
                .prepare(
                    `
                    INSERT INTO packages (name, description, total_price_cents, updated_at)
                    VALUES (@name, @description, @total_price_cents, CURRENT_TIMESTAMP)
                `
                )
                .run({ name, description: description || null, total_price_cents: totalCents });

            const packageId = Number(packageResult.lastInsertRowid);
            const insertItem = db.prepare(
                `
                INSERT INTO package_items (package_id, product_id, quantity)
                VALUES (@package_id, @product_id, @quantity)
            `
            );

            for (const item of items as PackageItemInput[]) {
                insertItem.run({
                    package_id: packageId,
                    product_id: item.product_id,
                    quantity: item.quantity,
                });
            }

            return packageId;
        });

        try {
            const packageId = createPackage();
            const pkg = getPackages(null).find((item) => item.id === packageId);
            return success(pkg, '套餐创建成功');
        } catch (e) {
            if (e instanceof Error && e.message === 'PRODUCT_NOT_FOUND') {
                return error(400, '套餐中存在不存在的产品');
            }
            throw e;
        }
    } catch (e) {
        console.error('Create package error:', e);
        return error(500, '创建套餐失败');
    }
}
