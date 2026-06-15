import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { createProductSalesOrder } from '@/lib/db/salesProductOrders';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const productOrderError = (e: unknown) => {
    if (isAuthError(e)) return error(e.code, e.message);

    const message = e instanceof Error ? e.message : '';
    if (message === 'ORDER_ITEMS_REQUIRED') return error(400, '订单明细不能为空');
    if (message === 'INVALID_ORIGINAL_AMOUNT') return error(400, '原始金额不能小于 0');
    if (message === 'INVALID_FINAL_AMOUNT') return error(400, '最终成交金额不能小于 0');
    if (message === 'HANDLER_REQUIRED') return error(400, '请选择经手人');
    if (message === 'HANDLER_NOT_FOUND') return error(400, '经手人不存在或已停用');
    if (message === 'CUSTOMER_NOT_FOUND') return error(400, '客户不存在');
    if (message === 'CUSTOMER_NAME_REQUIRED') return error(400, '客户名称不能为空');
    if (message === 'CUSTOMER_PHONE_REQUIRED') return error(400, '手机号不能为空');
    if (message === 'CUSTOMER_PHONE_EXISTS') return error(400, '该手机号已存在，请选择已有客户');
    if (message === 'PRODUCT_REQUIRED') return error(400, '请选择商品');
    if (message === 'INVALID_QUANTITY') return error(400, '商品数量必须大于 0');

    return null;
};

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();

        const db = getDb();
        const payload = await request.json();
        const orderId = createProductSalesOrder(db, payload, {
            sourceType: 'retail',
            legacySource: 'frontend_retail',
        });

        return success({ id: orderId, source_type: 'retail' }, '零售订单保存成功');
    } catch (e) {
        const knownError = productOrderError(e);
        if (knownError) return knownError;

        console.error('Create retail order error:', e);
        return error(500, '保存零售订单失败');
    }
}
