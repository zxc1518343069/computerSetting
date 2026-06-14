import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    AfterSalesNoticeRow,
    getNextAfterSalesSortOrder,
    normalizeNullableText,
    serializeAfterSalesNotice,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const isCodeConflict = (e: unknown) =>
    e instanceof Error &&
    e.message.includes('UNIQUE constraint failed: after_sales_service_notices.code');

export async function GET(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const where = includeInactive ? '' : 'WHERE is_active = 1';
        const rows = db
            .prepare(
                `
                SELECT *
                FROM after_sales_service_notices
                ${where}
                ORDER BY sort_order ASC, id ASC
            `
            )
            .all() as AfterSalesNoticeRow[];

        return success(rows.map(serializeAfterSalesNotice), '获取售后服务提示成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales notices error:', e);
        return error(500, '获取售后服务提示失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const body = (await request.json()) as Record<string, unknown>;
        const content = String(body.content || '').trim();
        if (!content) return error(400, '提示内容不能为空');

        const result = db
            .prepare(
                `
                INSERT INTO after_sales_service_notices (
                    code, content, sort_order, is_active, updated_at
                )
                VALUES (
                    @code, @content, @sort_order, @is_active, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                code: normalizeNullableText(body.code),
                content,
                sort_order:
                    body.sort_order === undefined
                        ? getNextAfterSalesSortOrder(db, 'after_sales_service_notices')
                        : Number(body.sort_order || 0),
                is_active: body.is_active === false ? 0 : 1,
            });

        const row = db
            .prepare('SELECT * FROM after_sales_service_notices WHERE id = ?')
            .get(result.lastInsertRowid) as AfterSalesNoticeRow;
        return success(serializeAfterSalesNotice(row), '售后服务提示创建成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '提示编码已存在');
        console.error('Create after-sales notice error:', e);
        return error(500, '创建售后服务提示失败');
    }
}

