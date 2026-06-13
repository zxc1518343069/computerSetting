import { getDb } from '@/lib/db';
import {
    createLogisticsCompany,
    listLogisticsCompanies,
    LogisticsCompanyStatus,
} from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const companyError = (message: string) => {
    if (message === 'LOGISTICS_COMPANY_NAME_REQUIRED') return error(400, '请输入物流公司名称');
    if (message.includes('UNIQUE')) return error(400, '物流公司名称已存在');
    return null;
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status') as LogisticsCompanyStatus | 'all' | null;

        return success(
            listLogisticsCompanies(db, { search, status: status || 'all' }),
            '获取物流公司成功'
        );
    } catch (e) {
        console.error('Get logistics companies error:', e);
        return error(500, '获取物流公司失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const payload = await request.json();

        try {
            const id = createLogisticsCompany(db, payload);
            const company = listLogisticsCompanies(db, { status: 'all' }).find(
                (item) => item.id === id
            );
            return success(company, '物流公司已创建');
        } catch (e) {
            const handled = companyError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Create logistics company error:', e);
        return error(500, '创建物流公司失败');
    }
}
