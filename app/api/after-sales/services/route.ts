import { getDb } from '@/lib/db';
import {
    AfterSalesCategoryRow,
    AfterSalesNoticeRow,
    AfterSalesServiceRow,
    serializeAfterSalesNotice,
    serializeAfterSalesService,
} from '@/lib/db/afterSalesServices';
import { error, success } from '@/lib/request/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getDb();
        const categories = db
            .prepare(
                `
                SELECT *
                FROM after_sales_service_categories
                WHERE is_active = 1
                ORDER BY sort_order ASC, id ASC
            `
            )
            .all() as AfterSalesCategoryRow[];

        const services = db
            .prepare(
                `
                SELECT
                    s.*,
                    c.code AS category_code,
                    c.name AS category_name,
                    c.description AS category_description,
                    c.sort_order AS category_sort_order
                FROM after_sales_services s
                INNER JOIN after_sales_service_categories c ON c.id = s.category_id
                WHERE s.is_active = 1
                  AND c.is_active = 1
                ORDER BY c.sort_order ASC, c.id ASC, s.sort_order ASC, s.id ASC
            `
            )
            .all() as AfterSalesServiceRow[];

        const serviceMap = new Map<number, ReturnType<typeof serializeAfterSalesService>[]>();
        services.forEach((service) => {
            const list = serviceMap.get(service.category_id) || [];
            list.push(serializeAfterSalesService(service));
            serviceMap.set(service.category_id, list);
        });

        const notices = db
            .prepare(
                `
                SELECT *
                FROM after_sales_service_notices
                WHERE is_active = 1
                ORDER BY sort_order ASC, id ASC
            `
            )
            .all() as AfterSalesNoticeRow[];

        return success(
            {
                categories: categories
                    .map((category) => ({
                        id: category.id,
                        code: category.code || null,
                        name: category.name,
                        description: category.description || null,
                        sort_order: Number(category.sort_order || 0),
                        is_active: Boolean(category.is_active),
                        services: serviceMap.get(category.id) || [],
                    }))
                    .filter((category) => category.services.length > 0),
                notices: notices.map(serializeAfterSalesNotice),
            },
            '获取售后服务成功'
        );
    } catch (e) {
        console.error('Get after-sales services error:', e);
        return error(500, '获取售后服务失败');
    }
}

