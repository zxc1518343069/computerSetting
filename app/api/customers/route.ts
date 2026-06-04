import { getDb } from '@/lib/db';
import { createCustomer, getCustomerById, listCustomers } from '@/lib/db/customers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const customerError = (e: unknown) => {
    const message = e instanceof Error ? e.message : '';
    if (message === 'CUSTOMER_NAME_REQUIRED') return error(400, '客户名称不能为空');
    if (message === 'CUSTOMER_PHONE_REQUIRED') return error(400, '手机号不能为空');
    if (message === 'CUSTOMER_PHONE_EXISTS') return error(400, '该手机号已存在，请选择已有客户');
    return null;
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        return success(
            listCustomers(db, { search: searchParams.get('search') }),
            '获取客户信息成功'
        );
    } catch (e) {
        console.error('Get customers error:', e);
        return error(500, '获取客户信息失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const id = createCustomer(db, await request.json());
        return success(getCustomerById(db, id), '客户创建成功');
    } catch (e) {
        const knownError = customerError(e);
        if (knownError) return knownError;
        console.error('Create customer error:', e);
        return error(500, '创建客户失败');
    }
}
