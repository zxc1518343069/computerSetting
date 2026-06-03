import { getDb } from '@/lib/db';
import { getPurchaseOrderById, getPurchaseOrderSummaryCents } from '@/lib/db/purchaseOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();

        const cancelPurchaseOrder = db.transaction(() => {
            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
            if (order.status === 'cancelled') return id;

            const summary = getPurchaseOrderSummaryCents(db, id, {
                shipping_fee_cents: Number(order.shipping_fee_cents || 0),
                misc_fee_cents: Number(order.misc_fee_cents || 0),
            });
            if (summary.totalReceivedQuantity > 0) throw new Error('HAS_RECEIVED_ITEMS');
            if (summary.netPaidCents > 0) throw new Error('HAS_ACTIVE_PAYMENTS');

            db.prepare(
                "UPDATE purchase_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(id);

            return id;
        });

        try {
            const purchaseOrderId = cancelPurchaseOrder();
            return success(getPurchaseOrderById(db, purchaseOrderId), '进货单已取消');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_ORDER_NOT_FOUND') return error(404, '进货单不存在');
            if (message === 'HAS_RECEIVED_ITEMS') return error(400, '已有入库记录的进货单不能取消');
            if (message === 'HAS_ACTIVE_PAYMENTS')
                return error(400, '已有付款记录的进货单不能取消');
            throw e;
        }
    } catch (e) {
        console.error('Cancel purchase order error:', e);
        return error(500, '取消进货单失败');
    }
}
