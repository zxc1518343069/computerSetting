import { getDb } from '@/lib/db';
import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import {
    inferSalesOrderSourceType,
    normalizeSalesDeliveryStatus,
    normalizeSalesOrderSourceType,
    normalizeSalesPaymentStatus,
    resolveSalesOrderStatuses,
    salesOrderSourceTypeLabels,
} from '@/lib/db/salesOrders';
import {
    serializeAfterSalesOrderDetail,
    serializeAfterSalesOrderItem,
} from '@/lib/db/afterSalesOrders';
import { createProductSalesOrder } from '@/lib/db/salesProductOrders';
import { ProductRow, serializeProduct, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const serializeOrderRow = (row: Record<string, unknown>) => {
    const { paymentStatus, deliveryStatus } = resolveSalesOrderStatuses(row);
    const sourceType = normalizeSalesOrderSourceType(
        row.source_type,
        inferSalesOrderSourceType(row.source)
    );

    return {
        id: row.id,
        order_no: row.order_no,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        original_amount: toYuan(row.original_amount_cents as number),
        final_amount: toYuan(row.final_amount_cents as number),
        discount_amount: toYuan(row.discount_amount_cents as number),
        cost_amount: toYuan(row.cost_amount_cents as number),
        profit_amount: toYuan(row.profit_amount_cents as number),
        status: row.status,
        payment_status: paymentStatus,
        delivery_status: deliveryStatus,
        is_paid: Boolean(row.is_paid),
        source: row.source,
        source_type: sourceType,
        source_type_label: salesOrderSourceTypeLabels[sourceType],
        created_by_user_id: row.created_by_user_id,
        created_by_username: row.created_by_username,
        latest_adjustment_id: row.latest_adjustment_id,
        note: row.note,
        sold_at: row.sold_at,
        delivered_at: row.delivered_at || row.sold_at,
        cancelled_at: row.cancelled_at,
        cancelled_by_user_id: row.cancelled_by_user_id,
        cancelled_by_username: row.cancelled_by_username,
        cancel_reason: row.cancel_reason,
        refunded_at: row.refunded_at,
        refunded_by_user_id: row.refunded_by_user_id,
        refunded_by_username: row.refunded_by_username,
        refund_note: row.refund_note,
        created_at: row.created_at,
        updated_at: row.updated_at,
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

const orderHandlerError = (e: unknown) => {
    const message = e instanceof Error ? e.message : '';
    if (message === 'HANDLER_REQUIRED') return error(400, '请选择经手人');
    if (message === 'HANDLER_NOT_FOUND') return error(400, '经手人不存在或已停用');
    return null;
};

const serializeAdjustmentRow = (row: Record<string, unknown>) => ({
    id: row.id,
    order_id: row.order_id,
    previous_adjustment_id: row.previous_adjustment_id,
    original_amount: toYuan(row.original_amount_cents as number),
    previous_adjusted_amount: toYuan(row.previous_adjusted_amount_cents as number),
    adjusted_amount: toYuan(row.adjusted_amount_cents as number),
    previous_final_amount: toYuan(row.previous_final_amount_cents as number),
    final_amount: toYuan(row.final_amount_cents as number),
    adjustment_note: row.adjustment_note,
    created_by_user_id: row.created_by_user_id,
    created_by_username: row.created_by_username,
    created_at: row.created_at,
});

const serializeOrderItemRow = (
    row: Record<string, unknown>,
    product: ProductRow | undefined,
    inventoryBindings: Record<string, unknown>[]
) => ({
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_category: row.product_category,
    quantity: row.quantity,
    cost_price:
        row.cost_price_cents === null || row.cost_price_cents === undefined
            ? null
            : toYuan(row.cost_price_cents as number),
    sale_price: toYuan(row.sale_price_cents as number),
    created_at: row.created_at,
    source_type: 'order_item' as const,
    product: product ? serializeProduct(product) : undefined,
    inventory_bindings: inventoryBindings,
});

const serializeAdjustmentItemRow = (
    row: Record<string, unknown>,
    orderId: number,
    product: ProductRow | undefined,
    inventoryBindings: Record<string, unknown>[]
) => ({
    id: row.id,
    adjustment_id: row.adjustment_id,
    order_id: orderId,
    source_order_item_id: row.source_order_item_id,
    product_id: row.product_id,
    product_name: row.product_name,
    product_category: row.product_category,
    quantity: row.quantity,
    sale_price: toYuan(row.sale_price_cents as number),
    created_at: row.created_at,
    source_type: 'adjustment_item' as const,
    product: product ? serializeProduct(product) : undefined,
    inventory_bindings: inventoryBindings,
});

const getOrders = (filters: {
    search?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    deliveryStatus?: string | null;
    sourceType?: string | null;
    scope?: string | null;
}) => {
    const db = getDb();
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.status) {
        conditions.push('status = @status');
        params.status = filters.status;
    }
    if (filters.paymentStatus) {
        conditions.push('payment_status = @payment_status');
        params.payment_status = normalizeSalesPaymentStatus(filters.paymentStatus);
    }
    if (filters.deliveryStatus) {
        conditions.push('delivery_status = @delivery_status');
        params.delivery_status = normalizeSalesDeliveryStatus(filters.deliveryStatus);
    }
    if (filters.sourceType && filters.sourceType !== 'all') {
        conditions.push('source_type = @source_type');
        params.source_type = normalizeSalesOrderSourceType(filters.sourceType);
    }
    if (filters.scope === 'todo') {
        conditions.push(`
            NOT (
                (payment_status = 'paid' AND delivery_status = 'delivered')
                OR (payment_status = 'unpaid' AND delivery_status = 'cancelled')
                OR (payment_status = 'refunded' AND delivery_status = 'cancelled')
            )
        `);
    }
    if (filters.search) {
        conditions.push(
            '(order_no LIKE @search OR customer_name LIKE @search OR customer_phone LIKE @search)'
        );
        params.search = `%${filters.search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(`SELECT * FROM sales_orders ${where} ORDER BY created_at DESC`)
        .all(params) as Record<string, unknown>[];

    const itemStmt = db.prepare(
        'SELECT * FROM sales_order_items WHERE order_id = ? ORDER BY id ASC'
    );
    const productStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const adjustmentStmt = db.prepare(
        'SELECT * FROM sales_order_adjustments WHERE order_id = ? ORDER BY created_at ASC, id ASC'
    );
    const adjustmentItemStmt = db.prepare(
        'SELECT * FROM sales_order_adjustment_items WHERE adjustment_id = ? ORDER BY id ASC'
    );
    const orderItemBindingStmt = db.prepare(
        'SELECT * FROM order_inventory_items WHERE order_item_id = ?'
    );
    const adjustmentItemBindingStmt = db.prepare(
        'SELECT * FROM order_inventory_items WHERE adjustment_item_id = ?'
    );
    const afterSalesDetailStmt = db.prepare(
        'SELECT * FROM sales_order_after_sales_details WHERE order_id = ?'
    );
    const afterSalesItemStmt = db.prepare(
        'SELECT * FROM sales_order_after_sales_items WHERE order_id = ? ORDER BY id ASC'
    );

    return rows.map((row) => {
        const sourceType = normalizeSalesOrderSourceType(
            row.source_type,
            inferSalesOrderSourceType(row.source)
        );
        if (sourceType === 'after_sales') {
            const afterSalesDetail = afterSalesDetailStmt.get(row.id) as
                | Record<string, unknown>
                | undefined;
            const afterSalesItems = afterSalesItemStmt.all(row.id) as Record<string, unknown>[];

            return {
                ...serializeOrderRow(row),
                adjusted_amount: null,
                adjustment_note: null,
                adjusted_at: null,
                adjusted_by_username: null,
                latest_adjustment: null,
                adjustment_history: [],
                original_items: [],
                latest_adjustment_items: [],
                items: [],
                after_sales_detail: serializeAfterSalesOrderDetail(afterSalesDetail || null),
                after_sales_items: afterSalesItems.map(serializeAfterSalesOrderItem),
            };
        }

        const items = itemStmt.all(row.id) as Record<string, unknown>[];
        const originalItems = items.map((item) => {
            const product = productStmt.get(item.product_id) as ProductRow | undefined;
            return serializeOrderItemRow(
                item,
                product,
                orderItemBindingStmt.all(item.id) as Record<string, unknown>[]
            );
        });
        const adjustments = adjustmentStmt.all(row.id) as Record<string, unknown>[];
        const adjustmentHistory = adjustments.map(serializeAdjustmentRow);
        const latestAdjustment =
            adjustmentHistory.find((item) => item.id === row.latest_adjustment_id) ||
            adjustmentHistory[adjustmentHistory.length - 1] ||
            null;
        const latestAdjustmentItems = latestAdjustment
            ? (adjustmentItemStmt.all(latestAdjustment.id) as Record<string, unknown>[]).map(
                  (item) => {
                      const product = productStmt.get(item.product_id) as ProductRow | undefined;
                      return serializeAdjustmentItemRow(
                          item,
                          row.id as number,
                          product,
                          adjustmentItemBindingStmt.all(item.id) as Record<string, unknown>[]
                      );
                  }
              )
            : [];

        return {
            ...serializeOrderRow(row),
            adjusted_amount: latestAdjustment?.adjusted_amount ?? null,
            adjustment_note: latestAdjustment?.adjustment_note ?? null,
            adjusted_at: latestAdjustment?.created_at ?? null,
            adjusted_by_username: latestAdjustment?.created_by_username ?? null,
            latest_adjustment: latestAdjustment,
            adjustment_history: adjustmentHistory,
            original_items: originalItems,
            latest_adjustment_items: latestAdjustmentItems,
            items: latestAdjustment ? latestAdjustmentItems : originalItems,
            after_sales_detail: null,
            after_sales_items: [],
        };
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        return success(
            getOrders({
                search: searchParams.get('search'),
                status: searchParams.get('status'),
                paymentStatus: searchParams.get('payment_status'),
                deliveryStatus: searchParams.get('delivery_status'),
                sourceType: searchParams.get('source_type'),
                scope: searchParams.get('scope'),
            }),
            '获取订单列表成功'
        );
    } catch (e) {
        console.error('Get orders error:', e);
        return error(500, '获取订单列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdminUser();
        const db = getDb();
        const payload = await request.json();
        const orderId = createProductSalesOrder(db, payload, {
            sourceType: 'manual',
            legacySource: 'manual',
        });
        const order = getOrders({}).find((item) => item.id === orderId);
        return success(order, '订单保存成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        const handlerError = orderHandlerError(e);
        if (handlerError) return handlerError;
        const knownError = orderCustomerError(e);
        if (knownError) return knownError;
        const message = e instanceof Error ? e.message : '';
        if (message === 'ORDER_ITEMS_REQUIRED') return error(400, '订单明细不能为空');
        if (message === 'INVALID_ORIGINAL_AMOUNT') return error(400, '原始金额不能小于 0');
        if (message === 'INVALID_FINAL_AMOUNT') return error(400, '最终成交金额不能小于 0');
        if (message === 'PRODUCT_REQUIRED') return error(400, '请选择商品');
        if (message === 'INVALID_QUANTITY') return error(400, '商品数量必须大于 0');
        console.error('Create order error:', e);
        return error(500, '保存订单失败');
    }
}
