import { getDb } from '@/lib/db';
import {
    getPurchaseOrderById,
    getPurchaseOrderPayments,
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

        return success(getPurchaseOrderPayments(db, id), '获取付款记录成功');
    } catch (e) {
        console.error('Get purchase payments error:', e);
        return error(500, '获取付款记录失败');
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { amount, payment_account, paid_at, note } = await request.json();

        const amountCents = toCents(Number(amount || 0));
        if (amountCents <= 0) return error(400, '本次付款金额必须大于 0');

        const createPayment = db.transaction(() => {
            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
            if (order.status === 'cancelled') throw new Error('PURCHASE_ORDER_CANCELLED');

            const summary = getPurchaseOrderSummaryCents(db, id, {
                shipping_fee_cents: Number(order.shipping_fee_cents || 0),
                misc_fee_cents: Number(order.misc_fee_cents || 0),
            });
            if (summary.netPaidCents + amountCents > summary.payableAmountCents) {
                throw new Error('PAYMENT_EXCEEDS_PAYABLE');
            }

            db.prepare(
                `
                INSERT INTO purchase_payments (
                    purchase_order_id, amount_cents, payment_account,
                    paid_at, status, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @amount_cents, @payment_account,
                    @paid_at, 'active', @note, CURRENT_TIMESTAMP
                )
            `
            ).run({
                purchase_order_id: id,
                amount_cents: amountCents,
                payment_account: payment_account || null,
                paid_at: normalizeDate(paid_at),
                note: note || null,
            });

            return id;
        });

        try {
            const purchaseOrderId = createPayment();
            return success(getPurchaseOrderById(db, purchaseOrderId), '付款记录已创建');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_ORDER_NOT_FOUND') return error(404, '进货单不存在');
            if (message === 'PURCHASE_ORDER_CANCELLED') return error(400, '已取消进货单不能付款');
            if (message === 'PAYMENT_EXCEEDS_PAYABLE')
                return error(400, '本次付款会超过当前应付款');
            throw e;
        }
    } catch (e) {
        console.error('Create purchase payment error:', e);
        return error(500, '创建付款记录失败');
    }
}
