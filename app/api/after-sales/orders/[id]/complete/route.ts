import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    inferSalesOrderSourceType,
    normalizeSalesOrderSourceType,
    resolveSalesOrderStatuses,
} from '@/lib/db/salesOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdminUser();

        const { id: idParam } = await params;
        const orderId = Number(idParam);
        const db = getDb();
        const { completed_note = '' } = await request.json();

        if (!Number.isInteger(orderId) || orderId <= 0) return error(400, '订单不存在');

        const completeOrder = db.transaction(() => {
            const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('ORDER_NOT_FOUND');

            const sourceType = normalizeSalesOrderSourceType(
                order.source_type,
                inferSalesOrderSourceType(order.source)
            );
            if (sourceType !== 'after_sales') throw new Error('NOT_AFTER_SALES_ORDER');
            if (resolveSalesOrderStatuses(order).deliveryStatus !== 'undelivered') {
                throw new Error('ORDER_NOT_PENDING');
            }

            db.prepare(
                `
                UPDATE sales_orders
                SET status = 'completed',
                    delivery_status = 'delivered',
                    delivered_at = CURRENT_TIMESTAMP,
                    sold_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({ id: orderId });

            const note = String(completed_note || '').trim();
            if (note) {
                db.prepare(
                    `
                    INSERT INTO sales_order_after_sales_details (
                        order_id, completed_note, updated_at
                    )
                    VALUES (@order_id, @completed_note, CURRENT_TIMESTAMP)
                    ON CONFLICT(order_id) DO UPDATE SET
                        completed_note = excluded.completed_note,
                        updated_at = CURRENT_TIMESTAMP
                `
                ).run({ order_id: orderId, completed_note: note });
            }
        });

        completeOrder();
        return success(null, '售后服务已完成');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);

        const message = e instanceof Error ? e.message : '';
        if (message === 'ORDER_NOT_FOUND') return error(404, '订单不存在');
        if (message === 'NOT_AFTER_SALES_ORDER') return error(400, '只有售后服务订单可以确认完成');
        if (message === 'ORDER_NOT_PENDING') return error(400, '只有未完成售后服务订单可以确认完成');

        console.error('Complete after-sales order error:', e);
        return error(500, '确认售后服务完成失败');
    }
}
