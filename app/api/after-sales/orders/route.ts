import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    createAfterSalesOrder,
    getAfterSalesOrderById,
    serializeCreatedAfterSalesOrder,
} from '@/lib/db/afterSalesOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const afterSalesOrderError = (e: unknown) => {
    if (isAuthError(e)) return error(e.code, e.message);

    const message = e instanceof Error ? e.message : '';
    if (message === 'SERVICES_REQUIRED') return error(400, '请选择至少一个售后服务');
    if (message === 'SERVICE_REQUIRED') return error(400, '请选择售后服务项目');
    if (message === 'INVALID_QUANTITY') return error(400, '服务数量必须大于 0');
    if (message === 'SERVICE_NOT_FOUND') return error(400, '售后服务不存在或已停用');
    if (message === 'SALE_PRICE_REQUIRED') return error(400, '非固定价服务需要填写实际成交价');
    if (message === 'INVALID_FINAL_AMOUNT') return error(400, '最终成交金额不能小于 0');
    if (message === 'HANDLER_REQUIRED') return error(400, '请选择经手人');
    if (message === 'HANDLER_NOT_FOUND') return error(400, '经手人不存在或已停用');
    if (message === 'CUSTOMER_NOT_FOUND') return error(400, '客户不存在');
    if (message === 'CUSTOMER_NAME_REQUIRED') return error(400, '客户名称不能为空');
    if (message === 'CUSTOMER_PHONE_REQUIRED') return error(400, '手机号不能为空');
    if (message === 'CUSTOMER_PHONE_EXISTS') return error(400, '该手机号已存在，请选择已有客户');

    return null;
};

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const payload = await request.json();
        const orderId = createAfterSalesOrder(db, payload);
        const createdOrder = getAfterSalesOrderById(db, orderId);

        if (!createdOrder) return error(500, '售后服务订单创建后读取失败');
        return success(serializeCreatedAfterSalesOrder(createdOrder), '售后服务订单创建成功');
    } catch (e) {
        const knownError = afterSalesOrderError(e);
        if (knownError) return knownError;

        console.error('Create after-sales order error:', e);
        return error(500, '售后服务下单失败');
    }
}
