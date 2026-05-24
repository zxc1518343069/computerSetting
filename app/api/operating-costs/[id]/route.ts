import { getDb } from '@/lib/db';
import { toCents, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const serializeCost = (row: Record<string, unknown>) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    amount: toYuan(row.amount_cents as number),
    cost_date: row.cost_date,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { type, name, amount, cost_date, note } = await request.json();

        if (!type || !name || amount === undefined || !cost_date) {
            return error(400, '成本类型、名称、金额和日期不能为空');
        }

        const result = db
            .prepare(
                `
                UPDATE operating_costs
                SET type = @type,
                    name = @name,
                    amount_cents = @amount_cents,
                    cost_date = @cost_date,
                    note = @note,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({ id, type, name, amount_cents: toCents(amount), cost_date, note });

        if (result.changes === 0) return error(404, '成本记录不存在');

        const row = db.prepare('SELECT * FROM operating_costs WHERE id = ?').get(id) as Record<
            string,
            unknown
        >;
        return success(serializeCost(row), '成本记录更新成功');
    } catch (e) {
        console.error('Update operating cost error:', e);
        return error(500, '更新成本记录失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const db = getDb();
        const result = db
            .prepare('DELETE FROM operating_costs WHERE id = ?')
            .run(parseInt(idParam));

        if (result.changes === 0) return error(404, '成本记录不存在');

        return success(null, '成本记录删除成功');
    } catch (e) {
        console.error('Delete operating cost error:', e);
        return error(500, '删除成本记录失败');
    }
}
