import { getDb } from '@/lib/db';
import { getReturnableItemsForInboundOrder } from '@/lib/db/inboundOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();

        try {
            const result = getReturnableItemsForInboundOrder(db, id);
            if (!result) return error(404, '入库单不存在');

            return success(result, '获取可退库存成功');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'NO_PURCHASE_ORDER') {
                return error(400, '该入库单未关联进货单，不能登记采购退货');
            }
            throw e;
        }
    } catch (e) {
        console.error('Get returnable inbound items error:', e);
        return error(500, '获取可退库存失败');
    }
}
