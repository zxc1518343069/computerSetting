import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    legacyPaidFromPaymentStatus,
    resolveSalesOrderStatuses,
    type SalesPaymentStatus,
} from '@/lib/db/salesOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAdminUser();
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { refund_confirmed = false, cancel_reason = '' } = await request.json();

        if (!id) return error(400, '订单不存在');

        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '订单不存在');

        const currentStatuses = resolveSalesOrderStatuses(order);
        if (currentStatuses.deliveryStatus === 'cancelled') return error(400, '订单已取消');
        if (currentStatuses.deliveryStatus !== 'undelivered') {
            return error(400, '已交付订单请走销售退货流程');
        }

        let nextPaymentStatus: SalesPaymentStatus;
        if (currentStatuses.paymentStatus === 'paid') {
            nextPaymentStatus = refund_confirmed ? 'refunded' : 'refund_pending';
        } else if (currentStatuses.paymentStatus === 'unpaid') {
            nextPaymentStatus = 'unpaid';
        } else {
            return error(400, '当前收款状态不能取消订单');
        }

        db.prepare(
            `
            UPDATE sales_orders
            SET status = 'cancelled',
                delivery_status = 'cancelled',
                payment_status = @payment_status,
                is_paid = @is_paid,
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by_user_id = @cancelled_by_user_id,
                cancelled_by_username = @cancelled_by_username,
                cancel_reason = @cancel_reason,
                refunded_at = CASE
                    WHEN @payment_status = 'refunded' THEN CURRENT_TIMESTAMP
                    ELSE refunded_at
                END,
                refunded_by_user_id = CASE
                    WHEN @payment_status = 'refunded' THEN @cancelled_by_user_id
                    ELSE refunded_by_user_id
                END,
                refunded_by_username = CASE
                    WHEN @payment_status = 'refunded' THEN @cancelled_by_username
                    ELSE refunded_by_username
                END,
                refund_note = CASE
                    WHEN @payment_status = 'refunded' THEN '取消订单时确认已退款'
                    ELSE refund_note
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            payment_status: nextPaymentStatus,
            is_paid: legacyPaidFromPaymentStatus(nextPaymentStatus) ? 1 : 0,
            cancelled_by_user_id: user.id,
            cancelled_by_username: user.username,
            cancel_reason: cancel_reason || null,
        });

        return success(null, '订单已取消');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Cancel order error:', e);
        return error(500, '取消订单失败');
    }
}
