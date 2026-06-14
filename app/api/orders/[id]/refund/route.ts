import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { resolveSalesOrderStatuses } from '@/lib/db/salesOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAdminUser();
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { refund_note = '' } = await request.json();

        if (!id) return error(400, '订单不存在');

        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '订单不存在');

        const currentStatuses = resolveSalesOrderStatuses(order);
        if (
            currentStatuses.deliveryStatus !== 'cancelled' ||
            currentStatuses.paymentStatus !== 'refund_pending'
        ) {
            return error(400, '只有待退款的已取消订单可以标记退款');
        }

        db.prepare(
            `
            UPDATE sales_orders
            SET payment_status = 'refunded',
                is_paid = 0,
                refunded_at = CURRENT_TIMESTAMP,
                refunded_by_user_id = @refunded_by_user_id,
                refunded_by_username = @refunded_by_username,
                refund_note = @refund_note,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            refunded_by_user_id: user.id,
            refunded_by_username: user.username,
            refund_note: refund_note || null,
        });

        return success(null, '已标记退款');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Mark order refunded error:', e);
        return error(500, '标记退款失败');
    }
}
