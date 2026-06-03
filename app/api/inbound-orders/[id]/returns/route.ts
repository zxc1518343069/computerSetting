import { getDb } from '@/lib/db';
import { createPurchaseReturnForInboundOrder, listPurchaseReturns } from '@/lib/db/purchaseReturns';
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
        const { reason, inventory_item_ids, type = 'return' } = await request.json();

        try {
            const purchaseReturnId = createPurchaseReturnForInboundOrder(db, inboundOrderId, {
                reason,
                inventoryItemIds: Array.isArray(inventory_item_ids)
                    ? inventory_item_ids.map((id) => Number(id)).filter(Boolean)
                    : undefined,
                type: type === 'exchange' ? 'exchange' : 'return',
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
