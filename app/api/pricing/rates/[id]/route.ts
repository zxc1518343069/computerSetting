import { getDb } from '@/lib/db';
import { getPricingConfigResponse } from '@/lib/db/pricing';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const { rate } = await request.json();

        const result = db
            .prepare(
                `
                UPDATE category_pricing_rates
                SET rate = @rate,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            )
            .run({
                id,
                rate: Number(rate || 0),
            });

        if (result.changes === 0) return error(404, '类目溢价规则不存在');

        return success(getPricingConfigResponse(db), '类目溢价已更新');
    } catch (e) {
        console.error('Update category pricing rate error:', e);
        return error(500, '更新类目溢价失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const result = db.prepare('DELETE FROM category_pricing_rates WHERE id = ?').run(id);

        if (result.changes === 0) return error(404, '类目溢价规则不存在');

        return success(getPricingConfigResponse(db), '类目溢价已删除');
    } catch (e) {
        console.error('Delete category pricing rate error:', e);
        return error(500, '删除类目溢价失败');
    }
}
