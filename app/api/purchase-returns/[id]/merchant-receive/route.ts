import { getDb } from '@/lib/db';
import {
    confirmPurchaseReturnMerchantReceived,
    getPurchaseReturnById,
} from '@/lib/db/purchaseReturns';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            const purchaseReturnId = confirmPurchaseReturnMerchantReceived(db, id, payload);
            return success(getPurchaseReturnById(db, purchaseReturnId), '已确认商家收货');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_RETURN_NOT_FOUND: '采购退货记录不存在',
                PURCHASE_RETURN_NOT_SHIPPED: '只有已寄回的退货记录可以确认商家收货',
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
        console.error('Merchant receive purchase return error:', e);
        return error(500, '确认商家收货失败');
    }
}
