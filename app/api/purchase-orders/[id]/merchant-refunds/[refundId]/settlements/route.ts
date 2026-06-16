import { getDb } from '@/lib/db';
import {
    createPurchaseMerchantRefundSettlement,
    getPurchaseMerchantRefundById,
} from '@/lib/db/purchaseMerchantRefunds';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const settlementErrorMap: Record<string, string> = {
    MERCHANT_REFUND_NOT_FOUND: '商家返款记录不存在',
    MERCHANT_REFUND_VOIDED: '已作废商家返款不能结算',
    NO_PENDING_SETTLEMENT: '当前商家返款没有待结算金额',
    INVALID_SETTLEMENT_TYPE: '返款结算方式不正确',
    INVALID_SETTLEMENT_AMOUNT: '本次结算金额必须大于 0',
    SETTLEMENT_EXCEEDS_PENDING: '本次结算不能超过待结算金额',
    OFFSET_EXCEEDS_PAYABLE: '抵扣金额不能超过当前待付款余额',
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
            return success(
                createPurchaseMerchantRefundSettlement(db, refundId, payload),
                '商家返款结算已登记'
            );
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (settlementErrorMap[message]) return error(400, settlementErrorMap[message]);
            throw e;
        }
    } catch (e) {
        console.error('Create purchase merchant refund settlement error:', e);
        return error(500, '登记商家返款结算失败');
    }
}
