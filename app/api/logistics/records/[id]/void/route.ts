import { getDb } from '@/lib/db';
import { getLogisticsRecordById, voidLogisticsRecord } from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            voidLogisticsRecord(db, id, payload?.note);
            return success(getLogisticsRecordById(db, id), '物流记录已作废');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'LOGISTICS_RECORD_NOT_FOUND') return error(404, '物流记录不存在');
            throw e;
        }
    } catch (e) {
        console.error('Void logistics record error:', e);
        return error(500, '作废物流记录失败');
    }
}
