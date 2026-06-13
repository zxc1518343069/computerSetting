import { getDb } from '@/lib/db';
import { cancelPurchaseReturn, getPurchaseReturnById } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = cancelPurchaseReturn(db, id, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '采购退货已取消');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_RETURN_NOT_FOUND: '采购退货记录不存在',
                PURCHASE_RETURN_NOT_PENDING: '只有待寄回且未收款的退货记录可以取消',
                PURCHASE_RETURN_HAS_REFUNDS: '已有收款记录的退货不能取消',
                RETURNED_INVENTORY_CHANGED: '退货库存状态已变化，不能取消',
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
        console.error('Cancel purchase return error:', e);
        return error(500, '取消采购退货失败');
    }
}
