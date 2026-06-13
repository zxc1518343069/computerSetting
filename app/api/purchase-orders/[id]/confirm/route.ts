import { getDb } from '@/lib/db';
import { getPurchaseOrderById } from '@/lib/db/purchaseOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();

        const confirmPurchaseOrder = db.transaction(() => {
            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
            if (order.status !== 'draft') throw new Error('PURCHASE_ORDER_NOT_DRAFT');

            db.prepare(
                "UPDATE purchase_orders SET status = 'ordered', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(id);

            return id;
        });

        try {
            const purchaseOrderId = confirmPurchaseOrder();
            return success(getPurchaseOrderById(db, purchaseOrderId), '进货单已确认下单');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_ORDER_NOT_FOUND') return error(404, '进货单不存在');
            if (message === 'PURCHASE_ORDER_NOT_DRAFT') {
                return error(400, '只有预下单状态可以确认下单');
            }
            throw e;
        }
    } catch (e) {
        console.error('Confirm purchase order error:', e);
        return error(500, '确认下单失败');
    }
}
