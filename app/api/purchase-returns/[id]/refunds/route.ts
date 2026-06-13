import { getDb } from '@/lib/db';
import {
    createPurchaseReturnRefund,
    getPurchaseReturnById,
} from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const purchaseReturn = getPurchaseReturnById(db, id);

        if (!purchaseReturn) return error(404, '采购退货记录不存在');
        return success(purchaseReturn.refunds || [], '获取退货收款记录成功');
    } catch (e) {
        console.error('Get purchase return refunds error:', e);
        return error(500, '获取退货收款记录失败');
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = createPurchaseReturnRefund(db, id, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '退货收款记录已创建');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                INVALID_REFUND_AMOUNT: '本次收款金额必须大于 0',
                PURCHASE_RETURN_NOT_FOUND: '采购退货记录不存在',
                PURCHASE_RETURN_CANCELLED: '已取消的退货记录不能收款',
                NO_PENDING_REFUND: '当前退货记录没有待收款金额',
                REFUND_EXCEEDS_PENDING: '本次收款不能超过待收款金额',
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
        console.error('Create purchase return refund error:', e);
        return error(500, '创建退货收款记录失败');
    }
}
