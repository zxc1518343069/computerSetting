import { getDb } from '@/lib/db';
import {
    getProductCategoryById,
    normalizeTagColor,
    ProductCategoryRow,
    serializeProductCategory,
} from '@/lib/db/productCategories';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const getProductCount = (db: ReturnType<typeof getDb>, category: ProductCategoryRow) =>
    (
        db
            .prepare(
                `
                SELECT COUNT(*) AS count
                FROM products
                WHERE category_id = @id
                   OR (
                       category_id IS NULL
                       AND @code IS NOT NULL
                       AND category = @code
                   )
            `
            )
            .get({ id: category.id, code: category.code }) as { count: number }
    ).count;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const db = getDb();
        const row = getProductCategoryById(db, Number(idParam));

        if (!row) return error(404, '商品类目不存在');

        return success(serializeProductCategory(row), '获取商品类目成功');
    } catch (e) {
        console.error('Get product category error:', e);
        return error(500, '获取商品类目失败');
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { name, label, tag_color, sort_order, is_active } = await request.json();

        if (!name || !String(name).trim()) {
            return error(400, '类目名称不能为空');
        }

        const existing = getProductCategoryById(db, id);
        if (!existing) return error(404, '商品类目不存在');

        db.prepare(
            `
            UPDATE product_categories
            SET name = @name,
                label = @label,
                tag_color = @tag_color,
                sort_order = @sort_order,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            name: String(name).trim(),
            label: String(label || name).trim(),
            tag_color: normalizeTagColor(tag_color) || existing.tag_color || 'blue',
            sort_order: Number(sort_order || 0),
            is_active: is_active === false ? 0 : 1,
        });

        const row = getProductCategoryById(db, id);
        return success(row ? serializeProductCategory(row) : null, '商品类目更新成功');
    } catch (e) {
        console.error('Update product category error:', e);
        return error(500, '更新商品类目失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const category = getProductCategoryById(db, id);

        if (!category) return error(404, '商品类目不存在');

        const productCount = getProductCount(db, category);
        if (productCount > 0) {
            return error(400, '该类目已有产品，无法删除，请停用');
        }

        const deleteCategory = db.transaction(() => {
            db.prepare('DELETE FROM category_pricing_rates WHERE category_id = ?').run(id);
            db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
        });

        deleteCategory();
        return success(null, '商品类目删除成功');
    } catch (e) {
        console.error('Delete product category error:', e);
        return error(500, '删除商品类目失败');
    }
}
