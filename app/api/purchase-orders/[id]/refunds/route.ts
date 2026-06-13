import { getDb } from '@/lib/db';
import { getPurchaseOrderById, getPurchaseOrderRefunds } from '@/lib/db/purchaseOrders';
import { createPurchaseReturnRefund, getPurchaseReturnById } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const purchaseOrder = getPurchaseOrderById(db, id);
        if (!purchaseOrder) return error(404, '进货单不存在');

        return success(getPurchaseOrderRefunds(db, id), '获取退款记录成功');
    } catch (e) {
        console.error('Get purchase refunds error:', e);
        return error(500, '获取退款记录失败');
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { amount, refund_account, refunded_at, purchase_return_id, note } =
            await request.json();

        if (!purchase_return_id) {
            return error(400, '供应商退款需要关联采购退货记录，请从退货单登记收款');
        }

        const createRefund = () => {
            const order = db.prepare('SELECT id FROM purchase_orders WHERE id = ?').get(id);
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');

            const purchaseReturn = getPurchaseReturnById(db, Number(purchase_return_id));
            if (!purchaseReturn || purchaseReturn.purchase_order_id !== id) {
                throw new Error('PURCHASE_RETURN_NOT_FOUND');
            }

            createPurchaseReturnRefund(db, Number(purchase_return_id), {
                amount,
                refund_account,
                refunded_at,
                note,
            });

            return id;
        };

        try {
            const purchaseOrderId = createRefund();
            return success(getPurchaseOrderById(db, purchaseOrderId), '退款记录已创建');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_ORDER_NOT_FOUND: '进货单不存在',
                PURCHASE_RETURN_NOT_FOUND: '退货记录不存在',
                INVALID_REFUND_AMOUNT: '本次退款金额必须大于 0',
                PURCHASE_RETURN_CANCELLED: '已取消的退货记录不能收款',
                NO_PENDING_REFUND: '当前退货记录没有待收款金额',
                REFUND_EXCEEDS_PENDING: '本次退款不能超过待收款金额',
            };
            if (messageMap[message]) {
                return error(
                    message === 'PURCHASE_ORDER_NOT_FOUND' ? 404 : 400,
                    messageMap[message]
                );
            }
            throw e;
        }
    } catch (e) {
        console.error('Create purchase refund error:', e);
        return error(500, '创建退款记录失败');
    }
}
