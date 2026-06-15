import type { SqliteDb } from './index';
import {
    createCustomer,
    getCustomerRowById,
    normalizeCustomerName,
    normalizeCustomerPhone,
} from './customers';
import { getAfterSalesServiceById } from './afterSalesServices';
import { centsToYuan, yuanToCents } from './money';

interface CreateAfterSalesOrderServiceInput {
    service_id: number;
    quantity: number;
    sale_price?: number | null;
    note?: string | null;
}

interface AdjustAfterSalesOrderServiceInput extends CreateAfterSalesOrderServiceInput {
    source_service_item_id?: number | null;
}

export interface AdjustAfterSalesOrderInput {
    services: AdjustAfterSalesOrderServiceInput[];
    final_amount: number;
    adjustment_note: string;
}

export interface AfterSalesAdjustmentUser {
    id: number;
    username: string;
}

export interface CreateAfterSalesOrderInput {
    customer_id?: number | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    save_customer?: boolean;
    handler_user_id?: number | null;
    note?: string | null;
    device_model?: string | null;
    fault_description?: string | null;
    service_note?: string | null;
    final_amount?: number | null;
    services: CreateAfterSalesOrderServiceInput[];
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
    return `AS${date}${time}${suffix}`;
};

const normalizeNullableText = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
};

const resolveOrderCustomer = (db: SqliteDb, input: CreateAfterSalesOrderInput) => {
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

export const serializeAfterSalesOrderDetail = (row: Record<string, unknown> | null) => {
    if (!row) return null;

    return {
        id: row.id,
        order_id: row.order_id,
        device_model: row.device_model || null,
        fault_description: row.fault_description || null,
        service_note: row.service_note || null,
        completed_note: row.completed_note || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
};

export const serializeAfterSalesOrderItem = (row: Record<string, unknown>) => ({
    id: row.id,
    order_id: row.order_id,
    service_id: row.service_id,
    service_name: row.service_name,
    service_category_name: row.service_category_name || null,
    price_type: row.price_type,
    price_label: row.price_label || '',
    quantity: Number(row.quantity || 0),
    sale_price: centsToYuan(Number(row.sale_price_cents || 0)),
    total_price: centsToYuan(Number(row.total_price_cents || 0)),
    note: row.note || null,
    created_at: row.created_at,
});

export const serializeAfterSalesOrderAdjustment = (row: Record<string, unknown>) => ({
    id: row.id,
    order_id: row.order_id,
    previous_final_amount: centsToYuan(Number(row.previous_final_amount_cents || 0)),
    final_amount: centsToYuan(Number(row.final_amount_cents || 0)),
    adjustment_note: row.adjustment_note,
    created_by_user_id: row.created_by_user_id,
    created_by_username: row.created_by_username,
    created_at: row.created_at,
});

export const getAfterSalesOrderById = (db: SqliteDb, orderId: number) => {
    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as
        | Record<string, unknown>
        | undefined;
    if (!order) return null;

    const detail = db
        .prepare('SELECT * FROM sales_order_after_sales_details WHERE order_id = ?')
        .get(orderId) as Record<string, unknown> | undefined;
    const items = db
        .prepare('SELECT * FROM sales_order_after_sales_items WHERE order_id = ? ORDER BY id ASC')
        .all(orderId) as Record<string, unknown>[];
    const adjustments = db
        .prepare(
            'SELECT * FROM sales_order_after_sales_adjustments WHERE order_id = ? ORDER BY created_at ASC, id ASC'
        )
        .all(orderId) as Record<string, unknown>[];

    return {
        order,
        after_sales_detail: serializeAfterSalesOrderDetail(detail || null),
        after_sales_items: items.map(serializeAfterSalesOrderItem),
        after_sales_adjustment_history: adjustments.map(serializeAfterSalesOrderAdjustment),
    };
};

export const serializeCreatedAfterSalesOrder = (
    result: NonNullable<ReturnType<typeof getAfterSalesOrderById>>
) => {
    const order = result.order;

    return {
        id: order.id,
        order_no: order.order_no,
        checkout_no: order.order_no,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        original_amount: centsToYuan(Number(order.original_amount_cents || 0)),
        final_amount: centsToYuan(Number(order.final_amount_cents || 0)),
        discount_amount: centsToYuan(Number(order.discount_amount_cents || 0)),
        cost_amount: centsToYuan(Number(order.cost_amount_cents || 0)),
        profit_amount: centsToYuan(Number(order.profit_amount_cents || 0)),
        status: order.status,
        payment_status: order.payment_status,
        delivery_status: order.delivery_status,
        source: order.source,
        source_type: order.source_type,
        source_type_label: '售后服务',
        created_by_user_id: order.created_by_user_id,
        created_by_username: order.created_by_username,
        note: order.note,
        created_at: order.created_at,
        updated_at: order.updated_at,
        after_sales_detail: result.after_sales_detail,
        after_sales_items: result.after_sales_items,
        after_sales_adjustment_history: result.after_sales_adjustment_history,
    };
};

const normalizeAfterSalesItems = (
    db: SqliteDb,
    services: AdjustAfterSalesOrderServiceInput[]
) => {
    if (!Array.isArray(services) || services.length === 0) throw new Error('SERVICES_REQUIRED');

    return services.map((item) => {
        const serviceId = Number(item.service_id);
        const quantity = Number(item.quantity || 0);
        if (!Number.isInteger(serviceId) || serviceId <= 0) throw new Error('SERVICE_REQUIRED');
        if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');

        const service = getAfterSalesServiceById(db, serviceId);
        if (!service || !service.is_active) throw new Error('SERVICE_NOT_FOUND');

        const salePriceCents =
            service.price_type === 'fixed' ? Number(service.price_cents || 0) : yuanToCents(item.sale_price);
        if (salePriceCents <= 0) throw new Error('SALE_PRICE_REQUIRED');

        return {
            source_service_item_id: item.source_service_item_id
                ? Number(item.source_service_item_id)
                : null,
            service_id: service.id,
            service_name: service.name,
            service_category_name: service.category_name || null,
            price_type: service.price_type,
            price_label: service.price_label || '',
            quantity,
            sale_price_cents: salePriceCents,
            total_price_cents: salePriceCents * quantity,
            note: normalizeNullableText(item.note),
        };
    });
};

export const createAfterSalesOrder = (db: SqliteDb, input: CreateAfterSalesOrderInput) => {
    if (!Array.isArray(input.services) || input.services.length === 0) {
        throw new Error('SERVICES_REQUIRED');
    }

    const createOrder = db.transaction(() => {
        const handlerUser = resolveActiveHandlerUser(db, input.handler_user_id);
        const customer = resolveOrderCustomer(db, input);

        const normalizedItems = normalizeAfterSalesItems(db, input.services);

        const originalAmountCents = normalizedItems.reduce(
            (sum, item) => sum + item.total_price_cents,
            0
        );
        const finalAmountCents =
            input.final_amount === null || input.final_amount === undefined
                ? originalAmountCents
                : yuanToCents(input.final_amount);
        if (finalAmountCents < 0) throw new Error('INVALID_FINAL_AMOUNT');

        const orderResult = db
            .prepare(
                `
                INSERT INTO sales_orders (
                    order_no, customer_id, customer_name, customer_phone,
                    original_amount_cents, final_amount_cents, discount_amount_cents,
                    cost_amount_cents, profit_amount_cents, status, is_paid,
                    payment_status, delivery_status, source_type, source,
                    created_by_user_id, created_by_username, note, updated_at
                )
                VALUES (
                    @order_no, @customer_id, @customer_name, @customer_phone,
                    @original_amount_cents, @final_amount_cents, @discount_amount_cents,
                    0, 0, 'pending', 0,
                    'unpaid', 'undelivered', 'after_sales', 'after_sales',
                    @created_by_user_id, @created_by_username, @note, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                order_no: createOrderNo(),
                customer_id: customer.customerId,
                customer_name: customer.customerName,
                customer_phone: customer.customerPhone,
                original_amount_cents: originalAmountCents,
                final_amount_cents: finalAmountCents,
                discount_amount_cents: originalAmountCents - finalAmountCents,
                created_by_user_id: handlerUser.id,
                created_by_username: handlerUser.username,
                note: normalizeNullableText(input.note),
            });

        const orderId = Number(orderResult.lastInsertRowid);
        const deviceModel = normalizeNullableText(input.device_model);
        const faultDescription = normalizeNullableText(input.fault_description);
        const serviceNote = normalizeNullableText(input.service_note);

        if (deviceModel || faultDescription || serviceNote) {
            db.prepare(
                `
                INSERT INTO sales_order_after_sales_details (
                    order_id, device_model, fault_description, service_note, updated_at
                )
                VALUES (
                    @order_id, @device_model, @fault_description, @service_note, CURRENT_TIMESTAMP
                )
            `
            ).run({
                order_id: orderId,
                device_model: deviceModel,
                fault_description: faultDescription,
                service_note: serviceNote,
            });
        }

        const insertItem = db.prepare(
            `
            INSERT INTO sales_order_after_sales_items (
                order_id, service_id, service_name, service_category_name, price_type,
                price_label, quantity, sale_price_cents, total_price_cents, note
            )
            VALUES (
                @order_id, @service_id, @service_name, @service_category_name, @price_type,
                @price_label, @quantity, @sale_price_cents, @total_price_cents, @note
            )
        `
        );

        normalizedItems.forEach((item) => {
            insertItem.run({
                order_id: orderId,
                ...item,
            });
        });

        return orderId;
    });

    return createOrder();
};

export const adjustAfterSalesOrder = (
    db: SqliteDb,
    orderId: number,
    input: AdjustAfterSalesOrderInput,
    user: AfterSalesAdjustmentUser
) => {
    if (!input.adjustment_note || !String(input.adjustment_note).trim()) {
        throw new Error('ADJUSTMENT_NOTE_REQUIRED');
    }

    const finalAmountCents = yuanToCents(input.final_amount);
    if (finalAmountCents < 0) throw new Error('INVALID_FINAL_AMOUNT');

    const adjust = db.transaction(() => {
        const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as
            | Record<string, unknown>
            | undefined;
        if (!order) throw new Error('ORDER_NOT_FOUND');
        if (order.source_type !== 'after_sales') throw new Error('NOT_AFTER_SALES_ORDER');
        if (order.delivery_status !== 'undelivered') throw new Error('ORDER_NOT_PENDING');

        const currentItems = db
            .prepare('SELECT id FROM sales_order_after_sales_items WHERE order_id = ?')
            .all(orderId) as Array<{ id: number }>;
        const currentItemIds = new Set(currentItems.map((item) => Number(item.id)));
        const normalizedItems = normalizeAfterSalesItems(db, input.services);
        normalizedItems.forEach((item) => {
            if (item.source_service_item_id && !currentItemIds.has(item.source_service_item_id)) {
                throw new Error('SOURCE_SERVICE_ITEM_NOT_FOUND');
            }
        });

        const previousFinalAmountCents = Number(order.final_amount_cents || 0);
        const adjustmentResult = db
            .prepare(
                `
                INSERT INTO sales_order_after_sales_adjustments (
                    order_id, previous_final_amount_cents, final_amount_cents,
                    adjustment_note, created_by_user_id, created_by_username
                )
                VALUES (
                    @order_id, @previous_final_amount_cents, @final_amount_cents,
                    @adjustment_note, @created_by_user_id, @created_by_username
                )
            `
            )
            .run({
                order_id: orderId,
                previous_final_amount_cents: previousFinalAmountCents,
                final_amount_cents: finalAmountCents,
                adjustment_note: String(input.adjustment_note).trim(),
                created_by_user_id: user.id,
                created_by_username: user.username,
            });
        const adjustmentId = Number(adjustmentResult.lastInsertRowid);

        const insertAdjustmentItem = db.prepare(
            `
            INSERT INTO sales_order_after_sales_adjustment_items (
                adjustment_id, source_service_item_id, service_id, service_name,
                service_category_name, price_type, price_label, quantity,
                sale_price_cents, total_price_cents, note
            )
            VALUES (
                @adjustment_id, @source_service_item_id, @service_id, @service_name,
                @service_category_name, @price_type, @price_label, @quantity,
                @sale_price_cents, @total_price_cents, @note
            )
        `
        );
        normalizedItems.forEach((item) => insertAdjustmentItem.run({ adjustment_id: adjustmentId, ...item }));

        db.prepare('DELETE FROM sales_order_after_sales_items WHERE order_id = ?').run(orderId);
        const insertCurrentItem = db.prepare(
            `
            INSERT INTO sales_order_after_sales_items (
                order_id, service_id, service_name, service_category_name, price_type,
                price_label, quantity, sale_price_cents, total_price_cents, note
            )
            VALUES (
                @order_id, @service_id, @service_name, @service_category_name, @price_type,
                @price_label, @quantity, @sale_price_cents, @total_price_cents, @note
            )
        `
        );
        normalizedItems.forEach((item) => insertCurrentItem.run({ order_id: orderId, ...item }));

        const originalAmountCents = Number(order.original_amount_cents || 0);
        db.prepare(
            `
            UPDATE sales_orders
            SET final_amount_cents = @final_amount_cents,
                discount_amount_cents = @discount_amount_cents,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id: orderId,
            final_amount_cents: finalAmountCents,
            discount_amount_cents: originalAmountCents - finalAmountCents,
        });

        return adjustmentId;
    });

    return adjust();
};
