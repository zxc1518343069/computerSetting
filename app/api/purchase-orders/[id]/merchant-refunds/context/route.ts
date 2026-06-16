import { getDb } from '@/lib/db';
import { getPurchaseMerchantRefundContext } from '@/lib/db/purchaseMerchantRefunds';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const context = getPurchaseMerchantRefundContext(db, id);

        if (!context) return error(404, '进货单不存在');
        return success(context, '获取商家返款上下文成功');
    } catch (e) {
        console.error('Get purchase merchant refund context error:', e);
        return error(500, '获取商家返款上下文失败');
    }
}
