import { getDb } from '@/lib/db';
import { getPricingConfigResponse, savePricingConfig } from '@/lib/db/pricing';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET() {
    try {
        const db = getDb();
        return success(getPricingConfigResponse(db), '获取溢价配置成功');
    } catch (e) {
        console.error('Get pricing config error:', e);
        return error(500, '获取溢价配置失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const config = await request.json();
        return success(savePricingConfig(db, config), '溢价配置已保存');
    } catch (e) {
        console.error('Update pricing config error:', e);
        return error(500, '保存溢价配置失败');
    }
}
