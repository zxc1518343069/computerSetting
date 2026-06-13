import { getDb } from '@/lib/db';
import { getLogisticsRecordById, payLogisticsRecord } from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            payLogisticsRecord(db, id, payload);
            return success(getLogisticsRecordById(db, id), '物流付款已登记');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                LOGISTICS_RECORD_NOT_FOUND: '物流记录不存在',
                LOGISTICS_RECORD_VOIDED: '已作废物流记录不能付款',
                LOGISTICS_RECORD_NO_PAYABLE: '该物流记录无需付款',
            };
            if (messageMap[message]) {
                return error(
                    message === 'LOGISTICS_RECORD_NOT_FOUND' ? 404 : 400,
                    messageMap[message]
                );
            }
            throw e;
        }
    } catch (e) {
        console.error('Pay logistics record error:', e);
        return error(500, '登记物流付款失败');
    }
}
