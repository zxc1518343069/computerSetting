import { getDb } from '@/lib/db';
import { getProductCategoryById } from '@/lib/db/productCategories';
import { getPricingConfigResponse } from '@/lib/db/pricing';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const isUniqueRateConflict = (e: unknown) =>
    e instanceof Error &&
    e.message.includes('UNIQUE constraint failed: category_pricing_rates.category_id');

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { category_id, rate } = await request.json();
        const categoryId = Number(category_id);

        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            return error(400, '请选择商品类目');
        }

        const category = getProductCategoryById(db, categoryId);
        if (!category) return error(404, '商品类目不存在');
        if (!category.is_active) return error(400, '停用类目不能新增溢价');

        db.prepare(
            `
            INSERT INTO category_pricing_rates (category_id, rate, updated_at)
            VALUES (@category_id, @rate, CURRENT_TIMESTAMP)
        `
        ).run({
            category_id: categoryId,
            rate: Number(rate || 0),
        });

        return success(getPricingConfigResponse(db), '类目溢价已新增');
    } catch (e) {
        if (isUniqueRateConflict(e)) {
            return error(400, '该类目已存在溢价规则');
        }
        console.error('Create category pricing rate error:', e);
        return error(500, '新增类目溢价失败');
    }
}
