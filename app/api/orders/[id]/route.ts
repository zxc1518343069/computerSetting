import { getDb } from '@/lib/db';
import {
    createCustomer,
    getCustomerRowById,
    normalizeCustomerName,
    normalizeCustomerPhone,
} from '@/lib/db/customers';
import {
    legacyPaidFromPaymentStatus,
    normalizeSalesPaymentStatus,
    resolveSalesOrderStatuses,
} from '@/lib/db/salesOrders';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const resolveOrderCustomer = (
    db: ReturnType<typeof getDb>,
    input: {
        customer_id?: number | null;
        customer_name?: string | null;
        customer_phone?: string | null;
        save_customer?: boolean;
    }
) => {
    if (input.customer_id) {
        const customer = getCustomerRowById(db, Number(input.customer_id));
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
        return {
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
        };
    }

    const customerName = normalizeCustomerName(input.customer_name);
    const customerPhone = normalizeCustomerPhone(input.customer_phone);
    if (!customerName) throw new Error('CUSTOMER_NAME_REQUIRED');

    if (!input.save_customer) {
        return {
            customerId: null,
            customerName,
            customerPhone: customerPhone || null,
        };
    }

    const customerId = createCustomer(db, {
        name: customerName,
        phone: customerPhone,
    });
    const customer = getCustomerRowById(db, customerId);
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
    };
};

const orderCustomerError = (e: unknown) => {
    const message = e instanceof Error ? e.message : '';
    if (message === 'CUSTOMER_NOT_FOUND') return error(400, '客户不存在');
    if (message === 'CUSTOMER_NAME_REQUIRED') return error(400, '客户名称不能为空');
    if (message === 'CUSTOMER_PHONE_REQUIRED') return error(400, '手机号不能为空');
    if (message === 'CUSTOMER_PHONE_EXISTS') return error(400, '该手机号已存在，请选择已有客户');
    return null;
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const db = getDb();
        const {
            final_amount,
            customer_id,
            customer_name,
            customer_phone,
            save_customer,
            note,
            is_paid,
            payment_status,
        } = await request.json();

        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        if (!order) return error(404, '订单不存在');
        const currentStatuses = resolveSalesOrderStatuses(order);
        if (currentStatuses.deliveryStatus !== 'undelivered') {
            return error(400, '只有未交付订单可以修改');
        }

        const nextFinalCents =
            final_amount === undefined
                ? (order.final_amount_cents as number)
                : toCents(final_amount);
        const originalCents = order.original_amount_cents as number;
        const costCents = order.cost_amount_cents as number;
        const customer = resolveOrderCustomer(db, {
            customer_id,
            customer_name,
            customer_phone,
            save_customer,
        });
        const nextPaymentStatus =
            payment_status !== undefined
                ? normalizeSalesPaymentStatus(payment_status, currentStatuses.paymentStatus)
                : is_paid === undefined
                  ? currentStatuses.paymentStatus
                  : is_paid
                    ? 'paid'
                    : 'unpaid';

        if (nextPaymentStatus !== 'unpaid' && nextPaymentStatus !== 'paid') {
            return error(400, '未交付订单只能标记为未收款或已收款');
        }

        db.prepare(
            `
            UPDATE sales_orders
            SET customer_id = @customer_id,
                customer_name = @customer_name,
                customer_phone = @customer_phone,
                note = @note,
                final_amount_cents = @final_amount_cents,
                discount_amount_cents = @discount_amount_cents,
                profit_amount_cents = @profit_amount_cents,
                payment_status = @payment_status,
                is_paid = @is_paid,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            customer_id: customer.customerId,
            customer_name: customer.customerName,
            customer_phone: customer.customerPhone,
            note,
            final_amount_cents: nextFinalCents,
            discount_amount_cents: originalCents - nextFinalCents,
            profit_amount_cents: nextFinalCents - costCents,
            payment_status: nextPaymentStatus,
            is_paid: legacyPaidFromPaymentStatus(nextPaymentStatus) ? 1 : 0,
        });

        return success(null, '订单更新成功');
    } catch (e) {
        const knownError = orderCustomerError(e);
        if (knownError) return knownError;
        console.error('Update order error:', e);
        return error(500, '更新订单失败');
    }
}
