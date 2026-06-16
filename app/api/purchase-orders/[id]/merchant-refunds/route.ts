import { getDb } from '@/lib/db';
import { getPurchaseOrderById } from '@/lib/db/purchaseOrders';
import {
    createPurchaseMerchantRefund,
    listPurchaseMerchantRefunds,
} from '@/lib/db/purchaseMerchantRefunds';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const createErrorMap: Record<string, string> = {
    PURCHASE_ORDER_NOT_FOUND: '进货单不存在',
    PURCHASE_ORDER_CANCELLED: '已取消进货单不能登记商家返款',
    INVALID_MERCHANT_REFUND_TYPE: '商家返款类型不正确',
    INVALID_MERCHANT_REFUND_AMOUNT: '商家返款金额必须大于 0',
    PRICE_PROTECTION_ITEMS_REQUIRED: '价格保护需要选择参与价保的库存件',
    INVALID_ADJUSTED_UNIT_COST: '调整后单价不正确',
    DUPLICATE_INVENTORY_ITEM: '同一库存件不能重复价保',
    PRICE_PROTECTION_ITEM_NOT_FOUND: '价保明细不存在或不属于该进货单',
    INVENTORY_ITEM_NOT_FOUND: '库存件不存在',
    INVENTORY_ITEM_NOT_IN_BATCH: '库存件不属于所选入库批次',
    INVENTORY_PRODUCT_MISMATCH: '库存件与价保商品不匹配',
    RETURNED_INVENTORY_ITEM: '已采购退货库存件不能参与价保',
    SOLD_INVENTORY_BINDING_NOT_FOUND: '已售库存件缺少销售绑定记录，不能自动重算利润',
    ADJUSTED_COST_NOT_LOWER: '调整后单价必须低于当前成本',
    INVALID_SETTLEMENT_TYPE: '返款结算方式不正确',
    INVALID_SETTLEMENT_AMOUNT: '本次结算金额必须大于 0',
    SETTLEMENT_EXCEEDS_PENDING: '本次结算不能超过待结算金额',
    OFFSET_EXCEEDS_PAYABLE: '抵扣金额不能超过当前待付款余额',
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const purchaseOrder = getPurchaseOrderById(db, id, { includePayments: false });
        if (!purchaseOrder) return error(404, '进货单不存在');

        return success(
            listPurchaseMerchantRefunds(db, { purchaseOrderId: id }),
            '获取商家返款记录成功'
        );
    } catch (e) {
        console.error('Get purchase merchant refunds error:', e);
        return error(500, '获取商家返款记录失败');
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const merchantRefund = createPurchaseMerchantRefund(db, id, payload);
            return success(merchantRefund, '商家返款已创建');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (createErrorMap[message]) {
                return error(
                    message === 'PURCHASE_ORDER_NOT_FOUND' ? 404 : 400,
                    createErrorMap[message]
                );
            }
            throw e;
        }
    } catch (e) {
        console.error('Create purchase merchant refund error:', e);
        return error(500, '创建商家返款失败');
    }
}
