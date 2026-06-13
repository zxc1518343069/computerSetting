import { getDb } from '@/lib/db';
import {
    getLogisticsRecordById,
    updateLogisticsRecord,
    voidLogisticsRecord,
} from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const recordError = (message: string) => {
    const messageMap: Record<string, { code: number; text: string }> = {
        LOGISTICS_RECORD_NOT_FOUND: { code: 404, text: '物流记录不存在' },
        LOGISTICS_COMPANY_NOT_FOUND: { code: 400, text: '物流公司不存在' },
        LOGISTICS_COMPANY_REQUIRED: { code: 400, text: '请选择物流公司' },
        INVALID_LOGISTICS_AMOUNT: { code: 400, text: '物流金额不能为负数' },
    };
    return messageMap[message] ? error(messageMap[message].code, messageMap[message].text) : null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            updateLogisticsRecord(db, id, payload);
            return success(getLogisticsRecordById(db, id), '物流记录已更新');
        } catch (e) {
            const handled = recordError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Update logistics record error:', e);
        return error(500, '更新物流记录失败');
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();

        try {
            voidLogisticsRecord(db, id);
            return success(getLogisticsRecordById(db, id), '物流记录已作废');
        } catch (e) {
            const handled = recordError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Void logistics record error:', e);
        return error(500, '作废物流记录失败');
    }
}
