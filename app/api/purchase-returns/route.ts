import { getDb } from '@/lib/db';
import { createPurchaseReturn, listPurchaseReturns } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const createReturnErrorMap: Record<string, string> = {
    RETURN_REASON_REQUIRED: '请填写退货原因',
    ORDER_NOT_FOUND: '入库单不存在',
    NO_PURCHASE_ORDER: '该入库单未关联进货单，不能登记采购退货',
    INVENTORY_NOT_AVAILABLE: '选择的库存件不存在或已不在库',
    NO_AVAILABLE_INVENTORY: '该入库单没有可退货库存',
    NO_PURCHASE_ORDER_ITEM: '入库明细未关联进货明细，不能登记采购退货',
    RETURN_ITEM_REQUIRED: '请选择要退货的入库明细',
    RETURN_ITEM_NOT_FOUND: '退货明细不属于该入库单',
    RETURN_ITEM_PRODUCT_MISMATCH: '退货明细物品不匹配',
    SERIAL_SELECTION_REQUIRED: '序列号管理物品必须选择具体库存件',
    INVALID_RETURN_QUANTITY: '退货数量必须大于 0',
    RETURN_QUANTITY_EXCEEDS_AVAILABLE: '退货数量不能超过可退数量',
    DUPLICATE_INVENTORY_ITEM: '同一库存件不能重复退货',
    INVALID_SHIPPING_FEE: '退货运费不能为负数',
    LOGISTICS_COMPANY_NOT_FOUND: '物流公司不存在',
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);

        return success(
            listPurchaseReturns(db, {
                search: searchParams.get('search'),
                purchaseOrderId: Number(searchParams.get('purchase_order_id') || 0) || undefined,
                inboundOrderId: Number(searchParams.get('inbound_order_id') || 0) || undefined,
                supplierId: Number(searchParams.get('supplier_id') || 0) || undefined,
                goodsStatus: searchParams.get('goods_status'),
                refundStatus: searchParams.get('refund_status'),
            }),
            '获取采购退货记录成功'
        );
    } catch (e) {
        console.error('Get purchase returns error:', e);
        return error(500, '获取采购退货记录失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = createPurchaseReturn(db, {
                inboundOrderId: Number(payload.inbound_order_id || 0),
                reason: payload.reason,
                note: payload.note || null,
                items: payload.items,
                type: payload.type === 'exchange' ? 'exchange' : 'return',
                shipping_fee: payload.shipping_fee,
                shipping_fee_bearer: payload.shipping_fee_bearer,
                self_shipping_fee: payload.self_shipping_fee,
                merchant_shipping_fee: payload.merchant_shipping_fee,
                logistics_company_id: payload.logistics_company_id || null,
                logistics_company: payload.logistics_company || null,
                tracking_no: payload.tracking_no || null,
            });

            return success(
                listPurchaseReturns(db).find((item) => item.id === purchaseReturnId),
                '采购退货已创建'
            );
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (createReturnErrorMap[message]) {
                return error(
                    message === 'ORDER_NOT_FOUND' ? 404 : 400,
                    createReturnErrorMap[message]
                );
            }
            throw e;
        }
    } catch (e) {
        console.error('Create purchase return error:', e);
        return error(500, '创建采购退货失败');
    }
}
