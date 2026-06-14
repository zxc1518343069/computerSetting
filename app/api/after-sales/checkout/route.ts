import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const createMockCheckoutNo = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `AS${date}${time}`;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const services = Array.isArray(body?.services) ? body.services : [];

        if (services.length === 0) {
            return error(400, '请选择至少一个售后服务');
        }

        return success(
            {
                checkout_no: createMockCheckoutNo(),
                status: 'mock_created',
            },
            '售后服务下单请求已提交'
        );
    } catch (e) {
        console.error('After-sales checkout mock error:', e);
        return error(500, '售后服务下单失败');
    }
}

