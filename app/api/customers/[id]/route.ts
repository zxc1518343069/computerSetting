import { getDb } from '@/lib/db';
import { getCustomerById, updateCustomer } from '@/lib/db/customers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const customerError = (e: unknown) => {
    const message = e instanceof Error ? e.message : '';
    if (message === 'CUSTOMER_NAME_REQUIRED') return error(400, '客户名称不能为空');
    if (message === 'CUSTOMER_PHONE_REQUIRED') return error(400, '手机号不能为空');
    if (message === 'CUSTOMER_PHONE_EXISTS') return error(400, '该手机号已存在，请选择已有客户');
    if (message === 'CUSTOMER_NOT_FOUND') return error(404, '客户不存在');
    return null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        if (!id) return error(400, '客户不存在');

        const db = getDb();
        updateCustomer(db, id, await request.json());

        return success(getCustomerById(db, id), '客户更新成功');
    } catch (e) {
        const knownError = customerError(e);
        if (knownError) return knownError;
        console.error('Update customer error:', e);
        return error(500, '更新客户失败');
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        if (!id) return error(400, '客户不存在');

        const db = getDb();
        const orderCount = db
            .prepare('SELECT COUNT(*) AS count FROM sales_orders WHERE customer_id = ?')
            .get(id) as { count: number };

        if (orderCount.count > 0) {
            return error(400, '该客户已有订单，暂不允许删除');
        }

        const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
        if (result.changes === 0) return error(404, '客户不存在');

        return success(null, '客户删除成功');
    } catch (e) {
        console.error('Delete customer error:', e);
        return error(500, '删除客户失败');
    }
}
