import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { note } = await request.json();

        const order = db.prepare('SELECT * FROM inbound_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '入库单不存在');

        const result = db
            .prepare(
                `
                UPDATE inbound_orders
                SET note = @note,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({
                id,
                note: note || null,
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
