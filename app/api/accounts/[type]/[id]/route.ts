import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    try {
        const { type, id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { is_paid = true } = await request.json();

        if (!id) return error(400, '账款记录不存在');

        if (type === 'payable') {
            const result = db
                .prepare(
                    `
                    UPDATE inbound_orders
                    SET is_paid = @is_paid,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                )
                .run({ id, is_paid: is_paid ? 1 : 0 });

            if (result.changes === 0) return error(404, '入库单不存在');
            return success(null, is_paid ? '已标记付款' : '已标记未付款');
        }

        if (type === 'receivable') {
            const result = db
                .prepare(
                    `
                    UPDATE sales_orders
                    SET is_paid = @is_paid,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                )
                .run({ id, is_paid: is_paid ? 1 : 0 });

            if (result.changes === 0) return error(404, '订单不存在');
            return success(null, is_paid ? '已标记收款' : '已标记未收款');
        }

        return error(400, '未知账款类型');
    } catch (e) {
        console.error('Update account payment error:', e);
        return error(500, '更新账款状态失败');
    }
}
