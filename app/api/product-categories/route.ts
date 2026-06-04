import { getDb } from '@/lib/db';
import {
    createGeneratedCategoryCode,
    getNextTagColor,
    normalizeTagColor,
    ProductCategoryRow,
    serializeProductCategory,
} from '@/lib/db/productCategories';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const getCategoryRows = (includeInactive: boolean) => {
    const db = getDb();
    const where = includeInactive ? '' : 'WHERE pc.is_active = 1';

    return db
        .prepare(
            `
            SELECT
                pc.*,
                COUNT(p.id) AS product_count,
                cpr.id AS pricing_rate_id,
                cpr.rate AS pricing_rate
            FROM product_categories pc
            LEFT JOIN products p ON p.category_id = pc.id OR (
                p.category_id IS NULL AND pc.code IS NOT NULL AND p.category = pc.code
            )
            LEFT JOIN category_pricing_rates cpr ON cpr.category_id = pc.id
            ${where}
            GROUP BY pc.id
            ORDER BY pc.sort_order ASC, pc.id ASC
        `
        )
        .all() as ProductCategoryRow[];
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        return success(
            getCategoryRows(includeInactive).map(serializeProductCategory),
            '获取商品类目成功'
        );
    } catch (e) {
        console.error('Get product categories error:', e);
        return error(500, '获取商品类目失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { name, label, tag_color, sort_order, is_active } = await request.json();

        if (!name || !String(name).trim()) {
            return error(400, '类目名称不能为空');
        }

        const createCategory = db.transaction(() => {
            const result = db
                .prepare(
                    `
                    INSERT INTO product_categories (
                        code, name, label, tag_color, sort_order, is_active, updated_at
                    )
                    VALUES (
                        NULL, @name, @label, @tag_color, @sort_order, @is_active, CURRENT_TIMESTAMP
                    )
                `
                )
                .run({
                    name: String(name).trim(),
                    label: String(label || name).trim(),
                    tag_color: normalizeTagColor(tag_color) || getNextTagColor(db),
                    sort_order: Number(sort_order || 0),
                    is_active: is_active === false ? 0 : 1,
                });

            const id = Number(result.lastInsertRowid);
            db.prepare(
                `
                UPDATE product_categories
                SET code = @code,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({
                id,
                code: createGeneratedCategoryCode(id),
            });

            return id;
        });

        const id = createCategory();
        const row = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as
            | ProductCategoryRow
            | undefined;

        return success(row ? serializeProductCategory(row) : null, '商品类目创建成功');
    } catch (e) {
        console.error('Create product category error:', e);
        return error(500, '创建商品类目失败');
    }
}
