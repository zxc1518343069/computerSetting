import { getDb } from '@/lib/db';
import { getPurchaseOrderSummaryCents } from '@/lib/db/purchaseOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    try {
        const { type, id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { is_paid = true } = await request.json();

        if (!id) return error(400, '账款记录不存在');

        if (type === 'payable') {
            if (!is_paid) return error(400, '进货单付款记录不能通过账款页撤销，请作废付款记录');

            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) return error(404, '进货单不存在');

            const summary = getPurchaseOrderSummaryCents(db, id, {
                shipping_fee_cents: Number(order.shipping_fee_cents || 0),
                misc_fee_cents: Number(order.misc_fee_cents || 0),
            });
            if (summary.pendingPaymentCents <= 0) return error(400, '该进货单没有待付款金额');

            db.prepare(
                `
                INSERT INTO purchase_payments (
                    purchase_order_id, amount_cents, payment_account, paid_at,
                    status, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @amount_cents, NULL, CURRENT_TIMESTAMP,
                    'active', '账款页一键结清', CURRENT_TIMESTAMP
                )
            `
            ).run({
                purchase_order_id: id,
                amount_cents: summary.pendingPaymentCents,
            });

            return success(null, '已登记付款');
        }

        if (type === 'receivable') {
            const result = db
                .prepare(
                    `
                    UPDATE sales_orders
                    SET is_paid = @is_paid,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                )
                .run({ id, is_paid: is_paid ? 1 : 0 });

            if (result.changes === 0) return error(404, '订单不存在');
            return success(null, is_paid ? '已标记收款' : '已标记未收款');
        }

        return error(400, '未知账款类型');
    } catch (e) {
        console.error('Update account payment error:', e);
        return error(500, '更新账款状态失败');
    }
}
