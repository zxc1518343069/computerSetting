import { getDb } from '@/lib/db';
import {
    getPurchaseMerchantRefundById,
    voidPurchaseMerchantRefundSettlement,
} from '@/lib/db/purchaseMerchantRefunds';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; refundId: string; settlementId: string }> }
) {
    try {
        const {
            id: idParam,
            refundId: refundIdParam,
            settlementId: settlementIdParam,
        } = await params;
        const purchaseOrderId = Number(idParam);
        const refundId = Number(refundIdParam);
        const settlementId = Number(settlementIdParam);
        const db = getDb();
        const payload = await request.json();

        const merchantRefund = getPurchaseMerchantRefundById(db, refundId);
        if (!merchantRefund || merchantRefund.purchase_order_id !== purchaseOrderId) {
            return error(404, '商家返款记录不存在');
        }

        try {
            return success(
                voidPurchaseMerchantRefundSettlement(db, refundId, settlementId, payload),
                '商家返款结算已作废'
            );
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'VOID_REASON_REQUIRED') return error(400, '请填写作废原因');
            if (message === 'SETTLEMENT_NOT_FOUND') return error(404, '结算记录不存在');
            throw e;
        }
    } catch (e) {
        console.error('Void purchase merchant refund settlement error:', e);
        return error(500, '作废商家返款结算失败');
    }
}
