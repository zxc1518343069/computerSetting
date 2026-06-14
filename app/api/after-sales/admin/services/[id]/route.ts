import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    createFixedPriceLabel,
    getAfterSalesCategoryById,
    getAfterSalesServiceById,
    normalizeNullableText,
    normalizePriceType,
    serializeAfterSalesService,
    toAfterSalesPriceCents,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
    params: Promise<{ id: string }>;
}

const isCodeConflict = (e: unknown) =>
    e instanceof Error && e.message.includes('UNIQUE constraint failed: after_sales_services.code');

const parseId = (value: string) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeServicePayload = (body: Record<string, unknown>) => {
    const categoryId = Number(body.category_id || 0);
    const name = String(body.name || '').trim();
    const priceType = normalizePriceType(body.price_type) || 'fixed';
    const price = body.price === null || body.price === undefined || body.price === '' ? null : Number(body.price);
    const priceCents = toAfterSalesPriceCents(price, priceType);
    const explicitPriceLabel = String(body.price_label || '').trim();
    const priceLabel =
        explicitPriceLabel || (priceType === 'fixed' ? createFixedPriceLabel(price) : '');

    return {
        code: normalizeNullableText(body.code),
        categoryId,
        name,
        description: normalizeNullableText(body.description),
        priceType,
        price,
        priceCents,
        priceLabel,
        unit: normalizeNullableText(body.unit),
        includes: normalizeNullableText(body.includes),
        excludes: normalizeNullableText(body.excludes),
        sortOrder: Number(body.sort_order || 0),
        isFeatured: body.is_featured === true ? 1 : 0,
        isActive: body.is_active === false ? 0 : 1,
    };
};

const validateServicePayload = (
    db: ReturnType<typeof getDb>,
    payload: ReturnType<typeof normalizeServicePayload>
) => {
    if (!Number.isInteger(payload.categoryId) || payload.categoryId <= 0) {
        return '请选择服务分类';
    }
    if (!getAfterSalesCategoryById(db, payload.categoryId)) {
        return '服务分类不存在';
    }
    if (!payload.name) return '服务名称不能为空';
    if (payload.priceType === 'fixed') {
        if (payload.price === null || !Number.isFinite(payload.price) || payload.price < 0) {
            return '固定价格不能为空且不能小于 0';
        }
    } else if (!payload.priceLabel) {
        return '多价格或自定义价格需要填写展示价格';
    }
    return null;
};

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '服务项目 ID 不正确');

        const db = getDb();
        const row = getAfterSalesServiceById(db, id);
        if (!row) return error(404, '售后服务项目不存在');

        return success(serializeAfterSalesService(row), '获取售后服务项目成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales service error:', e);
        return error(500, '获取售后服务项目失败');
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '服务项目 ID 不正确');

        const db = getDb();
        const existing = getAfterSalesServiceById(db, id);
        if (!existing) return error(404, '售后服务项目不存在');

        const body = (await request.json()) as Record<string, unknown>;
        const payload = normalizeServicePayload(body);
        const validationError = validateServicePayload(db, payload);
        if (validationError) return error(400, validationError);

        db.prepare(
            `
            UPDATE after_sales_services
            SET code = @code,
                category_id = @category_id,
                name = @name,
                description = @description,
                price_type = @price_type,
                price_cents = @price_cents,
                price_label = @price_label,
                unit = @unit,
                includes = @includes,
                excludes = @excludes,
                sort_order = @sort_order,
                is_featured = @is_featured,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            code: Object.prototype.hasOwnProperty.call(body, 'code') ? payload.code : existing.code,
            category_id: payload.categoryId,
            name: payload.name,
            description: payload.description,
            price_type: payload.priceType,
            price_cents: payload.priceCents,
            price_label: payload.priceLabel,
            unit: payload.unit,
            includes: payload.includes,
            excludes: payload.excludes,
            sort_order: payload.sortOrder,
            is_featured: payload.isFeatured,
            is_active: payload.isActive,
        });

        const row = getAfterSalesServiceById(db, id);
        return success(row ? serializeAfterSalesService(row) : null, '售后服务项目更新成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '服务编码已存在');
        console.error('Update after-sales service error:', e);
        return error(500, '更新售后服务项目失败');
    }
}

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '服务项目 ID 不正确');

        const db = getDb();
        if (!getAfterSalesServiceById(db, id)) return error(404, '售后服务项目不存在');

        db.prepare('DELETE FROM after_sales_services WHERE id = ?').run(id);
        return success(null, '售后服务项目删除成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Delete after-sales service error:', e);
        return error(500, '删除售后服务项目失败');
    }
}
