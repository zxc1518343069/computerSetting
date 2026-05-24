import { getDb } from '@/lib/db';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { final_amount, customer_name, customer_phone, note, is_paid } = await request.json();

        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '订单不存在');
        if (order.status !== 'pending') return error(400, '只有待结算订单可以修改');

        const nextFinalCents =
            final_amount === undefined
                ? (order.final_amount_cents as number)
                : toCents(final_amount);
        const originalCents = order.original_amount_cents as number;
        const costCents = order.cost_amount_cents as number;

        db.prepare(
            `
            UPDATE sales_orders
            SET customer_name = @customer_name,
                customer_phone = @customer_phone,
                note = @note,
                final_amount_cents = @final_amount_cents,
                discount_amount_cents = @discount_amount_cents,
                profit_amount_cents = @profit_amount_cents,
                is_paid = @is_paid,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            customer_name,
            customer_phone,
            note,
            final_amount_cents: nextFinalCents,
            discount_amount_cents: originalCents - nextFinalCents,
            profit_amount_cents: nextFinalCents - costCents,
            is_paid: is_paid === undefined ? (order.is_paid as number) : is_paid ? 1 : 0,
        });

        return success(null, '订单更新成功');
    } catch (e) {
        console.error('Update order error:', e);
        return error(500, '更新订单失败');
    }
}
