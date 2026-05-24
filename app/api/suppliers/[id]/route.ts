import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const { name, contact_name, phone, address, note } = await request.json();

        if (!name) {
            return error(400, '商家名称不能为空');
        }

        const result = db
            .prepare(
                `
                UPDATE suppliers
                SET name = @name,
                    contact_name = @contact_name,
                    phone = @phone,
                    address = @address,
                    note = @note,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({ id, name, contact_name, phone, address, note });

        if (result.changes === 0) {
            return error(404, '商家不存在');
        }

        const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
        return success(row, '进货商家更新成功');
    } catch (e) {
        console.error('Update supplier error:', e);
        return error(500, '更新进货商家失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();

        const inboundCount = db
            .prepare('SELECT COUNT(*) AS count FROM inbound_orders WHERE supplier_id = ?')
            .get(id) as { count: number };

        if (inboundCount.count > 0) {
            return error(400, '该商家已有入库单，暂不允许删除');
        }

        const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
        if (result.changes === 0) {
            return error(404, '商家不存在');
        }

        return success(null, '进货商家删除成功');
    } catch (e) {
        console.error('Delete supplier error:', e);
        return error(500, '删除进货商家失败');
    }
}
