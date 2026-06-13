import { getDb } from '@/lib/db';
import {
    createLogisticsRecord,
    getLogisticsRecordById,
    listLogisticsRecords,
    LogisticsPaymentStatus,
    LogisticsRecordType,
    LogisticsRelatedType,
    LogisticsSettlementTarget,
} from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const recordError = (message: string) => {
    const messageMap: Record<string, string> = {
        LOGISTICS_COMPANY_NOT_FOUND: '物流公司不存在',
        LOGISTICS_COMPANY_REQUIRED: '请选择物流公司',
        INVALID_LOGISTICS_AMOUNT: '物流金额不能为负数',
    };
    return messageMap[message] ? error(400, messageMap[message]) : null;
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const companyId = Number(searchParams.get('company_id') || 0) || null;
        const relatedId = Number(searchParams.get('related_id') || 0) || null;

        return success(
            listLogisticsRecords(db, {
                search: searchParams.get('search'),
                type: searchParams.get('type') as LogisticsRecordType | 'all' | null,
                companyId,
                paymentStatus: searchParams.get('payment_status') as
                    | LogisticsPaymentStatus
                    | 'all'
                    | null,
                settlementTarget: searchParams.get('settlement_target') as
                    | LogisticsSettlementTarget
                    | 'all'
                    | null,
                relatedType: searchParams.get('related_type') as LogisticsRelatedType | null,
                relatedId,
                dateFrom: searchParams.get('date_from'),
                dateTo: searchParams.get('date_to'),
            }),
            '获取物流记录成功'
        );
    } catch (e) {
        console.error('Get logistics records error:', e);
        return error(500, '获取物流记录失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const payload = await request.json();

        try {
            const id = createLogisticsRecord(db, payload);
            return success(getLogisticsRecordById(db, id), '物流记录已创建');
        } catch (e) {
            const handled = recordError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Create logistics record error:', e);
        return error(500, '创建物流记录失败');
    }
}
