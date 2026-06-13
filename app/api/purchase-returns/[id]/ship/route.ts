import { getDb } from '@/lib/db';
import { getPurchaseReturnById, shipPurchaseReturn } from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = shipPurchaseReturn(db, id, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '采购退货已确认寄回');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_RETURN_NOT_FOUND: '采购退货记录不存在',
                PURCHASE_RETURN_NOT_PENDING: '只有待寄回的退货记录可以确认发货',
                INVALID_SHIPPING_FEE: '退货运费不能为负数',
                LOGISTICS_COMPANY_NOT_FOUND: '物流公司不存在',
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
        console.error('Ship purchase return error:', e);
        return error(500, '确认寄回失败');
    }
}
