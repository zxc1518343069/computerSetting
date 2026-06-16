import { getDb } from '@/lib/db';
import {
    getPurchaseMerchantRefundById,
    voidPurchaseMerchantRefund,
} from '@/lib/db/purchaseMerchantRefunds';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const voidErrorMap: Record<string, string> = {
    VOID_REASON_REQUIRED: '请填写作废原因',
    MERCHANT_REFUND_NOT_FOUND: '商家返款记录不存在',
    HAS_ACTIVE_SETTLEMENTS: '已有有效结算记录，请先作废结算再作废返款单',
    HAS_NEWER_PRICE_PROTECTION: '同一库存件存在后续价保记录，不能直接作废较早价保',
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; refundId: string }> }
) {
    try {
        const { id: idParam, refundId: refundIdParam } = await params;
        const purchaseOrderId = Number(idParam);
        const refundId = Number(refundIdParam);
        const db = getDb();
        const payload = await request.json();

        const merchantRefund = getPurchaseMerchantRefundById(db, refundId);
        if (!merchantRefund || merchantRefund.purchase_order_id !== purchaseOrderId) {
            return error(404, '商家返款记录不存在');
        }

        try {
            return success(voidPurchaseMerchantRefund(db, refundId, payload), '商家返款已作废');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (voidErrorMap[message]) return error(400, voidErrorMap[message]);
            throw e;
        }
    } catch (e) {
        console.error('Void purchase merchant refund error:', e);
        return error(500, '作废商家返款失败');
    }
}
