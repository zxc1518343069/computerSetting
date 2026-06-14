import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    createFixedPriceLabel,
    getAfterSalesCategoryById,
    getAfterSalesServiceById,
    getNextAfterSalesSortOrder,
    normalizeNullableText,
    normalizePriceType,
    serializeAfterSalesService,
    toAfterSalesPriceCents,
    AfterSalesServiceRow,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const isCodeConflict = (e: unknown) =>
    e instanceof Error && e.message.includes('UNIQUE constraint failed: after_sales_services.code');

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
        sortOrder: body.sort_order === undefined ? undefined : Number(body.sort_order || 0),
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

export async function GET(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const keyword = String(searchParams.get('keyword') || '').trim();
        const categoryId = Number(searchParams.get('categoryId') || 0);
        const status = searchParams.get('status');

        const conditions: string[] = [];
        const params: Record<string, string | number> = {};

        if (status === 'active') {
            conditions.push('s.is_active = 1');
        } else if (status === 'inactive') {
            conditions.push('s.is_active = 0');
        } else if (!includeInactive) {
            conditions.push('s.is_active = 1');
        }

        if (keyword) {
            conditions.push(
                '(s.name LIKE @keyword OR s.description LIKE @keyword OR s.price_label LIKE @keyword)'
            );
            params.keyword = `%${keyword}%`;
        }

        if (Number.isInteger(categoryId) && categoryId > 0) {
            conditions.push('s.category_id = @categoryId');
            params.categoryId = categoryId;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = db
            .prepare(
                `
                SELECT
                    s.*,
                    c.code AS category_code,
                    c.name AS category_name,
                    c.description AS category_description,
                    c.sort_order AS category_sort_order
                FROM after_sales_services s
                LEFT JOIN after_sales_service_categories c ON c.id = s.category_id
                ${where}
                ORDER BY c.sort_order ASC, c.id ASC, s.sort_order ASC, s.id ASC
            `
            )
            .all(params) as AfterSalesServiceRow[];

        return success(rows.map(serializeAfterSalesService), '获取售后服务项目成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales admin services error:', e);
        return error(500, '获取售后服务项目失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const body = (await request.json()) as Record<string, unknown>;
        const payload = normalizeServicePayload(body);
        const validationError = validateServicePayload(db, payload);
        if (validationError) return error(400, validationError);

        const sortOrder =
            payload.sortOrder ??
            getNextAfterSalesSortOrder(db, 'after_sales_services', {
                category_id: payload.categoryId,
            });

        const result = db
            .prepare(
                `
                INSERT INTO after_sales_services (
                    code, category_id, name, description, price_type, price_cents, price_label,
                    unit, includes, excludes, sort_order, is_featured, is_active, updated_at
                )
                VALUES (
                    @code, @category_id, @name, @description, @price_type, @price_cents, @price_label,
                    @unit, @includes, @excludes, @sort_order, @is_featured, @is_active, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                code: payload.code,
                category_id: payload.categoryId,
                name: payload.name,
                description: payload.description,
                price_type: payload.priceType,
                price_cents: payload.priceCents,
                price_label: payload.priceLabel,
                unit: payload.unit,
                includes: payload.includes,
                excludes: payload.excludes,
                sort_order: sortOrder,
                is_featured: payload.isFeatured,
                is_active: payload.isActive,
            });

        const row = getAfterSalesServiceById(db, Number(result.lastInsertRowid));
        return success(row ? serializeAfterSalesService(row) : null, '售后服务项目创建成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '服务编码已存在');
        console.error('Create after-sales service error:', e);
        return error(500, '创建售后服务项目失败');
    }
}

