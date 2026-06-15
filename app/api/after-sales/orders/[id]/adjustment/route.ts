import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import {
    adjustAfterSalesOrder,
    getAfterSalesOrderById,
    serializeCreatedAfterSalesOrder,
} from '@/lib/db/afterSalesOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const afterSalesAdjustmentError = (e: unknown) => {
    if (isAuthError(e)) return error(e.code, e.message);

    const message = e instanceof Error ? e.message : '';
    if (message === 'ORDER_NOT_FOUND') return error(404, '订单不存在');
    if (message === 'NOT_AFTER_SALES_ORDER') return error(400, '只有售后服务订单可以调整服务项目');
    if (message === 'ORDER_NOT_PENDING') return error(400, '只有未完成售后服务订单可以调整');
    if (message === 'SERVICES_REQUIRED') return error(400, '调整后的服务项目不能为空');
    if (message === 'SERVICE_REQUIRED') return error(400, '请选择售后服务项目');
    if (message === 'INVALID_QUANTITY') return error(400, '服务数量必须大于 0');
    if (message === 'SERVICE_NOT_FOUND') return error(400, '售后服务不存在或已停用');
    if (message === 'SALE_PRICE_REQUIRED') return error(400, '请填写服务实际成交单价');
    if (message === 'INVALID_FINAL_AMOUNT') return error(400, '最终成交金额不能小于 0');
    if (message === 'ADJUSTMENT_NOTE_REQUIRED') return error(400, '请填写调整说明');
    if (message === 'SOURCE_SERVICE_ITEM_NOT_FOUND') return error(400, '原始服务明细不存在');

    return null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAdminUser();
        const { id: idParam } = await params;
        const orderId = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        if (!Number.isInteger(orderId) || orderId <= 0) return error(400, '订单不存在');

        adjustAfterSalesOrder(db, orderId, payload, user);
        const updatedOrder = getAfterSalesOrderById(db, orderId);

        if (!updatedOrder) return error(500, '售后服务订单调整后读取失败');
        return success(serializeCreatedAfterSalesOrder(updatedOrder), '售后服务订单已调整');
    } catch (e) {
        const knownError = afterSalesAdjustmentError(e);
        if (knownError) return knownError;

        console.error('Adjust after-sales order error:', e);
        return error(500, '调整售后服务订单失败');
    }
}
