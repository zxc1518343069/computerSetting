import { getDb } from '@/lib/db';
import { getPurchaseOrderById } from '@/lib/db/purchaseOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
    try {
        const { id: idParam, paymentId: paymentIdParam } = await params;
        const purchaseOrderId = Number(idParam);
        const paymentId = Number(paymentIdParam);
        const db = getDb();
        const { void_reason } = await request.json();

        if (!String(void_reason || '').trim()) return error(400, '请填写作废原因');

        const voidPayment = db.transaction(() => {
            const order = db
                .prepare('SELECT id FROM purchase_orders WHERE id = ?')
                .get(purchaseOrderId);
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');

            const payment = db
                .prepare('SELECT * FROM purchase_payments WHERE id = ? AND purchase_order_id = ?')
                .get(paymentId, purchaseOrderId) as Record<string, unknown> | undefined;
            if (!payment) throw new Error('PAYMENT_NOT_FOUND');
            if (payment.status === 'voided') return purchaseOrderId;

            db.prepare(
                `
                UPDATE purchase_payments
                SET status = 'voided',
                    voided_at = CURRENT_TIMESTAMP,
                    void_reason = @void_reason,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id AND purchase_order_id = @purchase_order_id
            `
            ).run({
                id: paymentId,
                purchase_order_id: purchaseOrderId,
                void_reason: String(void_reason).trim(),
            });

            return purchaseOrderId;
        });

        try {
            const id = voidPayment();
            return success(getPurchaseOrderById(db, id), '付款记录已作废');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_ORDER_NOT_FOUND') return error(404, '进货单不存在');
            if (message === 'PAYMENT_NOT_FOUND') return error(404, '付款记录不存在');
            throw e;
        }
    } catch (e) {
        console.error('Void purchase payment error:', e);
        return error(500, '作废付款记录失败');
    }
}
