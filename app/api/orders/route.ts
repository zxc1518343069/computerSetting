import { getDb } from '@/lib/db';
import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { ProductRow, serializeProduct, toCents, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface OrderItemInput {
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    sale_price: number;
}

const createOrderNo = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `ORD${date}${time}`;
};

const serializeOrderRow = (row: Record<string, unknown>) => ({
    id: row.id,
    order_no: row.order_no,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    original_amount: toYuan(row.original_amount_cents as number),
    final_amount: toYuan(row.final_amount_cents as number),
    discount_amount: toYuan(row.discount_amount_cents as number),
    cost_amount: toYuan(row.cost_amount_cents as number),
    profit_amount: toYuan(row.profit_amount_cents as number),
    status: row.status,
    is_paid: Boolean(row.is_paid),
    source: row.source,
    created_by_user_id: row.created_by_user_id,
    created_by_username: row.created_by_username,
    latest_adjustment_id: row.latest_adjustment_id,
    note: row.note,
    sold_at: row.sold_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

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

const getOrders = (search?: string | null, status?: string | null) => {
    const db = getDb();
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (status) {
        conditions.push('status = @status');
        params.status = status;
    }
    if (search) {
        conditions.push(
            '(order_no LIKE @search OR customer_name LIKE @search OR customer_phone LIKE @search)'
        );
        params.search = `%${search}%`;
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

    return rows.map((row) => {
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
        };
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        return success(
            getOrders(searchParams.get('search'), searchParams.get('status')),
            '获取订单列表成功'
        );
    } catch (e) {
        console.error('Get orders error:', e);
        return error(500, '获取订单列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await requireAdminUser();
        const db = getDb();
        const {
            customer_name,
            customer_phone,
            original_amount = 0,
            final_amount,
            source = 'manual',
            note,
            items,
        } = await request.json();

        if (!customer_name) return error(400, '客户名称不能为空');
        if (!Array.isArray(items) || items.length === 0) return error(400, '订单明细不能为空');

        const finalAmount = Number(final_amount ?? original_amount);
        const originalCents = toCents(original_amount);
        const finalCents = toCents(finalAmount);

        const createOrder = db.transaction(() => {
            const orderResult = db
                .prepare(
                    `
                    INSERT INTO sales_orders (
                        order_no, customer_name, customer_phone, original_amount_cents,
                        final_amount_cents, discount_amount_cents, cost_amount_cents,
                        profit_amount_cents, status, is_paid, source, created_by_user_id,
                        created_by_username, note, updated_at
                    )
                    VALUES (
                        @order_no, @customer_name, @customer_phone, @original_amount_cents,
                        @final_amount_cents, @discount_amount_cents, 0,
                        @profit_amount_cents, 'pending', 0, @source, @created_by_user_id,
                        @created_by_username, @note, CURRENT_TIMESTAMP
                    )
                `
                )
                .run({
                    order_no: createOrderNo(),
                    customer_name,
                    customer_phone,
                    original_amount_cents: originalCents,
                    final_amount_cents: finalCents,
                    discount_amount_cents: originalCents - finalCents,
                    profit_amount_cents: finalCents,
                    source,
                    created_by_user_id: currentUser.id,
                    created_by_username: currentUser.username,
                    note,
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

            for (const item of items as OrderItemInput[]) {
                insertItem.run({
                    order_id: orderId,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_category: item.product_category,
                    quantity: item.quantity || 1,
                    sale_price_cents: toCents(item.sale_price || 0),
                });
            }

            return orderId;
        });

        const orderId = createOrder();
        const order = getOrders(null, null).find((item) => item.id === orderId);
        return success(order, '订单保存成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Create order error:', e);
        return error(500, '保存订单失败');
    }
}
