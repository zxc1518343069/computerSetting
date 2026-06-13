import { getDb } from '@/lib/db';
import { getPurchaseOrderById } from '@/lib/db/purchaseOrders';
import {
    getPurchaseReturnById,
    voidPurchaseReturnRefund,
} from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; refundId: string }> }
) {
    try {
        const { id: idParam, refundId: refundIdParam } = await params;
        const purchaseOrderId = Number(idParam);
        const refundId = Number(refundIdParam);
        const db = getDb();
        const { void_reason } = await request.json();

        const voidRefund = () => {
            const order = db
                .prepare('SELECT id FROM purchase_orders WHERE id = ?')
                .get(purchaseOrderId);
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');

            const refund = db
                .prepare('SELECT * FROM purchase_refunds WHERE id = ? AND purchase_order_id = ?')
                .get(refundId, purchaseOrderId) as Record<string, unknown> | undefined;
            if (!refund) throw new Error('REFUND_NOT_FOUND');
            if (!refund.purchase_return_id) throw new Error('PURCHASE_RETURN_NOT_FOUND');

            const purchaseReturn = getPurchaseReturnById(db, Number(refund.purchase_return_id));
            if (!purchaseReturn || purchaseReturn.purchase_order_id !== purchaseOrderId) {
                throw new Error('PURCHASE_RETURN_NOT_FOUND');
            }

            voidPurchaseReturnRefund(db, Number(refund.purchase_return_id), refundId, {
                void_reason,
            });

            return purchaseOrderId;
        };

        try {
            const id = voidRefund();
            return success(getPurchaseOrderById(db, id), '退款记录已作废');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_ORDER_NOT_FOUND') return error(404, '进货单不存在');
            if (message === 'REFUND_NOT_FOUND') return error(404, '退款记录不存在');
            if (message === 'PURCHASE_RETURN_NOT_FOUND') return error(404, '退货记录不存在');
            if (message === 'VOID_REASON_REQUIRED') return error(400, '请填写作废原因');
            throw e;
        }
    } catch (e) {
        console.error('Void purchase refund error:', e);
        return error(500, '作废退款记录失败');
    }
}
