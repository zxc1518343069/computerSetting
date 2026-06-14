import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    AfterSalesCategoryRow,
    getNextAfterSalesSortOrder,
    normalizeNullableText,
    serializeAfterSalesCategory,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const isCodeConflict = (e: unknown) =>
    e instanceof Error &&
    e.message.includes('UNIQUE constraint failed: after_sales_service_categories.code');

export async function GET(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const where = includeInactive ? '' : 'WHERE c.is_active = 1';

        const rows = db
            .prepare(
                `
                SELECT c.*, COUNT(s.id) AS service_count
                FROM after_sales_service_categories c
                LEFT JOIN after_sales_services s ON s.category_id = c.id
                ${where}
                GROUP BY c.id
                ORDER BY c.sort_order ASC, c.id ASC
            `
            )
            .all() as AfterSalesCategoryRow[];

        return success(rows.map(serializeAfterSalesCategory), '获取售后服务分类成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get after-sales categories error:', e);
        return error(500, '获取售后服务分类失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const body = (await request.json()) as Record<string, unknown>;
        const name = String(body.name || '').trim();
        if (!name) return error(400, '分类名称不能为空');

        const result = db
            .prepare(
                `
                INSERT INTO after_sales_service_categories (
                    code, name, description, sort_order, is_active, updated_at
                )
                VALUES (
                    @code, @name, @description, @sort_order, @is_active, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                code: normalizeNullableText(body.code),
                name,
                description: normalizeNullableText(body.description),
                sort_order:
                    body.sort_order === undefined
                        ? getNextAfterSalesSortOrder(db, 'after_sales_service_categories')
                        : Number(body.sort_order || 0),
                is_active: body.is_active === false ? 0 : 1,
            });

        const row = db
            .prepare('SELECT *, 0 AS service_count FROM after_sales_service_categories WHERE id = ?')
            .get(result.lastInsertRowid) as AfterSalesCategoryRow;
        return success(serializeAfterSalesCategory(row), '售后服务分类创建成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isCodeConflict(e)) return error(400, '分类编码已存在');
        console.error('Create after-sales category error:', e);
        return error(500, '创建售后服务分类失败');
    }
}

