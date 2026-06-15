import type { SqliteDb } from './index';
import {
    createCustomer,
    getCustomerRowById,
    normalizeCustomerName,
    normalizeCustomerPhone,
} from './customers';
import type { SalesOrderSourceType } from './salesOrders';
import { toCents } from './serializers';

interface ProductOrderItemInput {
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    sale_price: number;
}

export interface CreateProductSalesOrderInput {
    handler_user_id?: number | null;
    customer_id?: number | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    save_customer?: boolean;
    original_amount?: number;
    final_amount?: number;
    note?: string | null;
    items: ProductOrderItemInput[];
}

interface OrderHandlerUserRow {
    id: number;
    username: string;
    role: 'admin' | 'staff';
    status: 'active' | 'disabled';
}

const createOrderNo = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `ORD${date}${time}${suffix}`;
};

const normalizeNullableText = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
};

const resolveOrderCustomer = (
    db: SqliteDb,
    input: Pick<
        CreateProductSalesOrderInput,
        'customer_id' | 'customer_name' | 'customer_phone' | 'save_customer'
    >
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

const resolveActiveHandlerUser = (db: SqliteDb, handlerUserId: unknown): OrderHandlerUserRow => {
    const id = Number(handlerUserId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('HANDLER_REQUIRED');

    const row = db
        .prepare('SELECT id, username, role, status FROM admin_users WHERE id = ?')
        .get(id) as OrderHandlerUserRow | undefined;

    if (!row || row.status !== 'active') throw new Error('HANDLER_NOT_FOUND');
    return row;
};

export const createProductSalesOrder = (
    db: SqliteDb,
    input: CreateProductSalesOrderInput,
    options: {
        sourceType: Extract<SalesOrderSourceType, 'diy' | 'retail' | 'manual'>;
        legacySource: string;
    }
) => {
    if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new Error('ORDER_ITEMS_REQUIRED');
    }

    const originalAmount = Number(input.original_amount || 0);
    const finalAmount = Number(input.final_amount ?? originalAmount);
    if (!Number.isFinite(originalAmount) || originalAmount < 0) {
        throw new Error('INVALID_ORIGINAL_AMOUNT');
    }
    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
        throw new Error('INVALID_FINAL_AMOUNT');
    }

    const createOrder = db.transaction(() => {
        const handlerUser = resolveActiveHandlerUser(db, input.handler_user_id);
        const customer = resolveOrderCustomer(db, input);
        const originalCents = toCents(originalAmount);
        const finalCents = toCents(finalAmount);

        const orderResult = db
            .prepare(
                `
                INSERT INTO sales_orders (
                    order_no, customer_id, customer_name, customer_phone, original_amount_cents,
                    final_amount_cents, discount_amount_cents, cost_amount_cents,
                    profit_amount_cents, status, is_paid, payment_status, delivery_status,
                    source_type, source, created_by_user_id, created_by_username, note, updated_at
                )
                VALUES (
                    @order_no, @customer_id, @customer_name, @customer_phone, @original_amount_cents,
                    @final_amount_cents, @discount_amount_cents, 0,
                    @profit_amount_cents, 'pending', 0, 'unpaid', 'undelivered',
                    @source_type, @source, @created_by_user_id, @created_by_username, @note, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                order_no: createOrderNo(),
                customer_id: customer.customerId,
                customer_name: customer.customerName,
                customer_phone: customer.customerPhone,
                original_amount_cents: originalCents,
                final_amount_cents: finalCents,
                discount_amount_cents: originalCents - finalCents,
                profit_amount_cents: finalCents,
                source_type: options.sourceType,
                source: options.legacySource,
                created_by_user_id: handlerUser.id,
                created_by_username: handlerUser.username,
                note: normalizeNullableText(input.note),
            });

        const orderId = Number(orderResult.lastInsertRowid);
        const insertItem = db.prepare(
            `
            INSERT INTO sales_order_items (
                order_id, product_id, product_name, product_category, quantity, sale_price_cents
            )
            VALUES (@order_id, @product_id, @product_name, @product_category, @quantity, @sale_price_cents)
        `
        );

        for (const item of input.items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity || 0);
            if (!Number.isInteger(productId) || productId <= 0) throw new Error('PRODUCT_REQUIRED');
            if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');

            insertItem.run({
                order_id: orderId,
                product_id: productId,
                product_name: String(item.product_name || '').trim() || '未知产品',
                product_category: String(item.product_category || '').trim(),
                quantity,
                sale_price_cents: toCents(item.sale_price || 0),
            });
        }

        return orderId;
    });

    return createOrder();
};
