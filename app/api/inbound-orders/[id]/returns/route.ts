import { getDb } from '@/lib/db';
import { createPurchaseReturn, listPurchaseReturns } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const inboundOrderId = Number(idParam);
        const db = getDb();

        const order = db.prepare('SELECT id FROM inbound_orders WHERE id = ?').get(inboundOrderId);
        if (!order) return error(404, '入库单不存在');

        return success(listPurchaseReturns(db, { inboundOrderId }), '获取入库单退货记录成功');
    } catch (e) {
        console.error('Get inbound order returns error:', e);
        return error(500, '获取入库单退货记录失败');
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const inboundOrderId = Number(idParam);
        const db = getDb();
        const payload = await request.json();
        const { reason, inventory_item_ids, items, type = 'return' } = payload;

        try {
            const purchaseReturnId = createPurchaseReturn(db, {
                inboundOrderId,
                reason,
                note: payload.note || null,
                inventoryItemIds: Array.isArray(inventory_item_ids)
                    ? inventory_item_ids.map((id) => Number(id)).filter(Boolean)
                    : undefined,
                items,
                type: type === 'exchange' ? 'exchange' : 'return',
                shipping_fee: payload.shipping_fee,
                shipping_fee_bearer: payload.shipping_fee_bearer,
                self_shipping_fee: payload.self_shipping_fee,
                merchant_shipping_fee: payload.merchant_shipping_fee,
                logistics_company_id: payload.logistics_company_id || null,
                logistics_company: payload.logistics_company || null,
                tracking_no: payload.tracking_no || null,
            });

            return success(
                listPurchaseReturns(db, { inboundOrderId }).find(
                    (item) => item.id === purchaseReturnId
                ),
                '采购退货成功'
            );
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
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
            if (messageMap[message]) {
                return error(message === 'ORDER_NOT_FOUND' ? 404 : 400, messageMap[message]);
            }
            throw e;
        }
    } catch (e) {
        console.error('Create inbound order return error:', e);
        return error(500, '采购退货失败');
    }
}
