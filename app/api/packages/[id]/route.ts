import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface PackageItemInput {
    product_id: number;
    quantity: number;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { name, description, items } = await request.json();

        if (!name || !items || items.length === 0) {
            return error(400, '套餐名称和配件不能为空');
        }

        const updatePackage = db.transaction(() => {
            let totalCents = 0;
            for (const item of items as PackageItemInput[]) {
                const product = db
                    .prepare('SELECT price_cents FROM products WHERE id = ?')
                    .get(item.product_id) as { price_cents: number } | undefined;
                if (!product) throw new Error('PRODUCT_NOT_FOUND');
                totalCents += product.price_cents * item.quantity;
            }

            db.prepare(
                `
                UPDATE packages
                SET name = @name,
                    description = @description,
                    total_price_cents = @total_price_cents,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({ id, name, description: description || null, total_price_cents: totalCents });

            db.prepare('DELETE FROM package_items WHERE package_id = ?').run(id);

            const insertItem = db.prepare(
                `
                INSERT INTO package_items (package_id, product_id, quantity)
                VALUES (@package_id, @product_id, @quantity)
            `
            );
            for (const item of items as PackageItemInput[]) {
                insertItem.run({
                    package_id: id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                });
            }
        });

        try {
            updatePackage();
            return success(null, '套餐更新成功');
        } catch (e) {
            if (e instanceof Error && e.message === 'PRODUCT_NOT_FOUND') {
                return error(400, '套餐中存在不存在的产品');
            }
            throw e;
        }
    } catch (e) {
        console.error('Update package error:', e);
        return error(500, '更新套餐失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const db = getDb();
        const id = parseInt(idParam);

        db.prepare('DELETE FROM packages WHERE id = ?').run(id);
        return success(null, '套餐删除成功');
    } catch (e) {
        console.error('Delete package error:', e);
        return error(500, '删除套餐失败');
    }
}
