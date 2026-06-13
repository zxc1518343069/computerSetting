import { getDb } from '@/lib/db';
import { getPurchaseReturnById, updatePurchaseReturn } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const purchaseReturn = getPurchaseReturnById(db, id);

        if (!purchaseReturn) return error(404, '采购退货记录不存在');
        return success(purchaseReturn, '获取采购退货记录成功');
    } catch (e) {
        console.error('Get purchase return error:', e);
        return error(500, '获取采购退货记录失败');
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = updatePurchaseReturn(db, id, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '采购退货记录已更新');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_RETURN_NOT_FOUND: '采购退货记录不存在',
                PURCHASE_RETURN_CANCELLED: '已取消的退货记录不能编辑',
                RETURN_REASON_REQUIRED: '请填写退货原因',
                INVALID_SHIPPING_FEE: '退货运费不能为负数',
            };
            if (messageMap[message]) {
                return error(
                    message === 'PURCHASE_RETURN_NOT_FOUND' ? 404 : 400,
                    messageMap[message]
                );
            }
            throw e;
        }
    } catch (e) {
        console.error('Update purchase return error:', e);
        return error(500, '更新采购退货记录失败');
    }
}
