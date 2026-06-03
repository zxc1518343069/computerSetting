import { getDb } from '@/lib/db';
import {
    getPurchaseOrderById,
    getPurchaseOrderRefunds,
    getPurchaseOrderSummaryCents,
} from '@/lib/db/purchaseOrders';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const normalizeDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

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

        const amountCents = toCents(Number(amount || 0));
        if (amountCents <= 0) return error(400, '本次退款金额必须大于 0');

        const createRefund = db.transaction(() => {
            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');

            if (purchase_return_id) {
                const purchaseReturn = db
                    .prepare(
                        'SELECT id FROM purchase_returns WHERE id = ? AND purchase_order_id = ?'
                    )
                    .get(purchase_return_id, id);
                if (!purchaseReturn) throw new Error('PURCHASE_RETURN_NOT_FOUND');
            }

            const summary = getPurchaseOrderSummaryCents(db, id, {
                shipping_fee_cents: Number(order.shipping_fee_cents || 0),
                misc_fee_cents: Number(order.misc_fee_cents || 0),
            });
            if (summary.pendingRefundCents <= 0) throw new Error('NO_PENDING_REFUND');
            if (amountCents > summary.pendingRefundCents) throw new Error('REFUND_EXCEEDS_PENDING');

            db.prepare(
                `
                INSERT INTO purchase_refunds (
                    purchase_order_id, purchase_return_id, amount_cents,
                    refund_account, refunded_at, status, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @purchase_return_id, @amount_cents,
                    @refund_account, @refunded_at, 'active', @note, CURRENT_TIMESTAMP
                )
            `
            ).run({
                purchase_order_id: id,
                purchase_return_id: purchase_return_id || null,
                amount_cents: amountCents,
                refund_account: refund_account || null,
                refunded_at: normalizeDate(refunded_at),
                note: note || null,
            });

            return id;
        });

        try {
            const purchaseOrderId = createRefund();
            return success(getPurchaseOrderById(db, purchaseOrderId), '退款记录已创建');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_ORDER_NOT_FOUND: '进货单不存在',
                PURCHASE_RETURN_NOT_FOUND: '退货记录不存在',
                NO_PENDING_REFUND: '当前进货单没有待退款金额',
                REFUND_EXCEEDS_PENDING: '本次退款不能超过待退款金额',
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
