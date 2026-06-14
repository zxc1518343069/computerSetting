import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    getAfterSalesNoticeById,
    normalizeNullableText,
    serializeAfterSalesNotice,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
    params: Promise<{ id: string }>;
}

const isCodeConflict = (e: unknown) =>
    e instanceof Error &&
    e.message.includes('UNIQUE constraint failed: after_sales_service_notices.code');

const parseId = (value: string) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '提示 ID 不正确');

        const db = getDb();
        const row = getAfterSalesNoticeById(db, id);
        if (!row) return error(404, '售后服务提示不存在');

        return success(serializeAfterSalesNotice(row), '获取售后服务提示成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales notice error:', e);
        return error(500, '获取售后服务提示失败');
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '提示 ID 不正确');

        const db = getDb();
        const existing = getAfterSalesNoticeById(db, id);
        if (!existing) return error(404, '售后服务提示不存在');

        const body = (await request.json()) as Record<string, unknown>;
        const content = String(body.content || '').trim();
        if (!content) return error(400, '提示内容不能为空');

        db.prepare(
            `
            UPDATE after_sales_service_notices
            SET code = @code,
                content = @content,
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
            content,
            sort_order: Number(body.sort_order || 0),
            is_active: body.is_active === false ? 0 : 1,
        });

        const row = getAfterSalesNoticeById(db, id);
        return success(row ? serializeAfterSalesNotice(row) : null, '售后服务提示更新成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '提示编码已存在');
        console.error('Update after-sales notice error:', e);
        return error(500, '更新售后服务提示失败');
    }
}

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        await requireAdminUser();

        const { id: rawId } = await params;
        const id = parseId(rawId);
        if (!id) return error(400, '提示 ID 不正确');

        const db = getDb();
        if (!getAfterSalesNoticeById(db, id)) return error(404, '售后服务提示不存在');

        db.prepare('DELETE FROM after_sales_service_notices WHERE id = ?').run(id);
        return success(null, '售后服务提示删除成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Delete after-sales notice error:', e);
        return error(500, '删除售后服务提示失败');
    }
}
