import { getDb } from '@/lib/db';
import {
    getLogisticsStats,
    LogisticsPaymentStatus,
    LogisticsRecordType,
    LogisticsSettlementTarget,
} from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const companyId = Number(searchParams.get('company_id') || 0) || null;

        return success(
            getLogisticsStats(db, {
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
                dateFrom: searchParams.get('date_from'),
                dateTo: searchParams.get('date_to'),
            }),
            '获取物流统计成功'
        );
    } catch (e) {
        console.error('Get logistics stats error:', e);
        return error(500, '获取物流统计失败');
    }
}
