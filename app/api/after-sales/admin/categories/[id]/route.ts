import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    AfterSalesCategoryRow,
    getAfterSalesCategoryById,
    normalizeNullableText,
    serializeAfterSalesCategory,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
    params: Promise<{ id: string }>;
}

const isCodeConflict = (e: unknown) =>
    e instanceof Error &&
    e.message.includes('UNIQUE constraint failed: after_sales_service_categories.code');

const parseId = (value: string) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getCategoryWithCount = (db: ReturnType<typeof getDb>, id: number) =>
    db
        .prepare(
            `
            SELECT c.*, COUNT(s.id) AS service_count
            FROM after_sales_service_categories c
            LEFT JOIN after_sales_services s ON s.category_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
        `
        )
        .get(id) as AfterSalesCategoryRow | undefined;

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '分类 ID 不正确');

        const db = getDb();
        const row = getCategoryWithCount(db, id);
        if (!row) return error(404, '售后服务分类不存在');

        return success(serializeAfterSalesCategory(row), '获取售后服务分类成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales category error:', e);
        return error(500, '获取售后服务分类失败');
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '分类 ID 不正确');

        const db = getDb();
        const existing = getAfterSalesCategoryById(db, id);
        if (!existing) return error(404, '售后服务分类不存在');

        const body = (await request.json()) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        if (!name) return error(400, '分类名称不能为空');

        db.prepare(
            `
            UPDATE after_sales_service_categories
            SET code = @code,
                name = @name,
                description = @description,
                sort_order = @sort_order,
                is_active = @is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            code: Object.prototype.hasOwnProperty.call(body, 'code')
                ? normalizeNullableText(body.code)
                : existing.code,
            name,
            description: normalizeNullableText(body.description),
            sort_order: Number(body.sort_order || 0),
            is_active: body.is_active === false ? 0 : 1,
        });

        const row = getCategoryWithCount(db, id);
        return success(row ? serializeAfterSalesCategory(row) : null, '售后服务分类更新成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '分类编码已存在');
        console.error('Update after-sales category error:', e);
        return error(500, '更新售后服务分类失败');
    }
}

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '分类 ID 不正确');

        const db = getDb();
        if (!getAfterSalesCategoryById(db, id)) return error(404, '售后服务分类不存在');

        const serviceCount = (
            db
                .prepare('SELECT COUNT(*) AS count FROM after_sales_services WHERE category_id = ?')
                .get(id) as { count: number }
        ).count;
        if (serviceCount > 0) return error(400, '该分类下已有服务项目，请先迁移或删除服务');

        db.prepare('DELETE FROM after_sales_service_categories WHERE id = ?').run(id);
        return success(null, '售后服务分类删除成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Delete after-sales category error:', e);
        return error(500, '删除售后服务分类失败');
    }
}
