import { getDb } from '@/lib/db';
import {
    disableLogisticsCompany,
    listLogisticsCompanies,
    updateLogisticsCompany,
} from '@/lib/db/logistics';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const companyError = (message: string) => {
    if (message === 'LOGISTICS_COMPANY_NOT_FOUND') return error(404, '物流公司不存在');
    if (message === 'LOGISTICS_COMPANY_NAME_REQUIRED') return error(400, '请输入物流公司名称');
    if (message.includes('UNIQUE')) return error(400, '物流公司名称已存在');
    return null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        try {
            updateLogisticsCompany(db, id, payload);
            const company = listLogisticsCompanies(db, { status: 'all' }).find(
                (item) => item.id === id
            );
            return success(company, '物流公司已更新');
        } catch (e) {
            const handled = companyError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Update logistics company error:', e);
        return error(500, '更新物流公司失败');
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
            disableLogisticsCompany(db, id);
            return success(null, '物流公司已停用');
        } catch (e) {
            const handled = companyError(e instanceof Error ? e.message : '');
            if (handled) return handled;
            throw e;
        }
    } catch (e) {
        console.error('Disable logistics company error:', e);
        return error(500, '停用物流公司失败');
    }
}
