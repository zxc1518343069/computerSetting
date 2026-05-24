import { getDb } from '@/lib/db';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { is_paid, note, shipping_fee, misc_fee } = await request.json();

        const order = db.prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '入库单不存在');

        const result = db
            .prepare(
                `
                UPDATE inbound_orders
                SET is_paid = @is_paid,
                    shipping_fee_cents = @shipping_fee_cents,
                    misc_fee_cents = @misc_fee_cents,
                    note = @note,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({
                id,
                is_paid: is_paid === undefined ? order.is_paid : is_paid ? 1 : 0,
                shipping_fee_cents:
                    shipping_fee === undefined
                        ? order.shipping_fee_cents
                        : toCents(Number(shipping_fee || 0)),
                misc_fee_cents:
                    misc_fee === undefined ? order.misc_fee_cents : toCents(Number(misc_fee || 0)),
                note,
            });

        if (result.changes === 0) {
            return error(404, '入库单不存在');
        }

        return success(null, '入库单更新成功');
    } catch (e) {
        console.error('Update inbound order error:', e);
        return error(500, '更新入库单失败');
    }
}
