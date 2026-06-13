import { getDb } from '@/lib/db';
import {
    getPurchaseReturnById,
    voidPurchaseReturnRefund,
} from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; refundId: string }> }) {
    try {
        const { id: idParam, refundId: refundIdParam } = await params;
        const id = Number(idParam);
        const refundId = Number(refundIdParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = voidPurchaseReturnRefund(db, id, refundId, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '退货收款记录已作废');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'PURCHASE_REFUND_NOT_FOUND') {
                return error(404, '退货收款记录不存在');
            }
            if (message === 'VOID_REASON_REQUIRED') {
                return error(400, '请填写作废原因');
            }
            throw e;
        }
    } catch (e) {
        console.error('Void purchase return refund error:', e);
        return error(500, '作废退货收款失败');
    }
}
