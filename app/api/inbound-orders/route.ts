import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toCents, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface InboundItemInput {
    product_id: number;
    quantity: number;
    purchase_price: number;
    serial_numbers?: string[];
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    note?: string | null;
}

const recalculateProductStock = (db: ReturnType<typeof getDb>, productId: number) => {
    const row = db
        .prepare(
            "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
        )
        .get(productId) as { count: number };

    db.prepare(
        'UPDATE products SET stock_quantity = @stock_quantity, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
    ).run({ id: productId, stock_quantity: row.count });
};

const getInboundOrders = () => {
    const db = getDb();
    const orders = db
        .prepare(
            `
            SELECT io.*, s.name AS supplier_name, s.contact_name, s.phone, s.address, s.note AS supplier_note
            FROM inbound_orders io
            LEFT JOIN suppliers s ON s.id = io.supplier_id
            ORDER BY io.created_at DESC
        `
        )
        .all() as Array<Record<string, unknown>>;

    const itemStmt = db.prepare(
        `
        SELECT ioi.*, p.id AS p_id, p.category, p.name, p.price_cents, p.stock_quantity,
               p.selling_price_cents, p.is_use_premium, p.created_at AS product_created_at,
               p.updated_at AS product_updated_at
        FROM inbound_order_items ioi
        JOIN products p ON p.id = ioi.product_id
        WHERE ioi.inbound_order_id = ?
        ORDER BY ioi.id ASC
    `
    );

    const inventoryStmt = db.prepare(
        'SELECT * FROM inventory_items WHERE inbound_order_item_id = ?'
    );

    return orders.map((order) => {
        const items = itemStmt.all(order.id) as Array<Record<string, unknown>>;
        return {
            id: order.id,
            supplier_id: order.supplier_id,
            shipping_fee: toYuan(order.shipping_fee_cents as number),
            misc_fee: toYuan(order.misc_fee_cents as number),
            is_paid: Boolean(order.is_paid),
            inbound_at: order.inbound_at,
            note: order.note,
            created_at: order.created_at,
            updated_at: order.updated_at,
            supplier: order.supplier_name
                ? {
                      id: order.supplier_id,
                      name: order.supplier_name,
                      contact_name: order.contact_name,
                      phone: order.phone,
                      address: order.address,
                      note: order.supplier_note,
                  }
                : undefined,
            items: items.map((item) => ({
                id: item.id,
                inbound_order_id: item.inbound_order_id,
                product_id: item.product_id,
                quantity: item.quantity,
                purchase_price: toYuan(item.purchase_price_cents as number),
                warranty_enabled: Boolean(item.warranty_enabled),
                warranty_until: item.warranty_until,
                note: item.note,
                created_at: item.created_at,
                product: serializeProduct({
                    id: item.p_id,
                    category: item.category,
                    name: item.name,
                    price_cents: item.price_cents,
                    stock_quantity: item.stock_quantity,
                    selling_price_cents: item.selling_price_cents,
                    is_use_premium: item.is_use_premium,
                    created_at: item.product_created_at,
                    updated_at: item.product_updated_at,
                } as ProductRow),
                inventory_items: inventoryStmt.all(item.id),
            })),
        };
    });
};

export async function GET() {
    try {
        return success(getInboundOrders(), '获取入库单成功');
    } catch (e) {
        console.error('Get inbound orders error:', e);
        return error(500, '获取入库单失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const {
            supplier_id,
            shipping_fee = 0,
            misc_fee = 0,
            is_paid = false,
            inbound_at,
            note,
            items,
        } = await request.json();

        if (!supplier_id) return error(400, '请选择进货商家');
        if (!Array.isArray(items) || items.length === 0)
            return error(400, '请至少添加一条入库明细');

        for (const item of items as InboundItemInput[]) {
            if (
                !item.product_id ||
                !item.quantity ||
                item.quantity < 1 ||
                item.purchase_price === undefined
            ) {
                return error(400, '入库明细中的物品、数量和成本价不能为空');
            }
        }

        const createInboundOrder = db.transaction(() => {
            const orderResult = db
                .prepare(
                    `
                    INSERT INTO inbound_orders (
                        supplier_id, shipping_fee_cents, misc_fee_cents, is_paid, inbound_at, note, updated_at
                    )
                    VALUES (@supplier_id, @shipping_fee_cents, @misc_fee_cents, @is_paid, @inbound_at, @note, CURRENT_TIMESTAMP)
                `
                )
                .run({
                    supplier_id,
                    shipping_fee_cents: toCents(shipping_fee),
                    misc_fee_cents: toCents(misc_fee),
                    is_paid: is_paid ? 1 : 0,
                    inbound_at: inbound_at || new Date().toISOString(),
                    note,
                });

            const orderId = Number(orderResult.lastInsertRowid);

            for (const item of items as InboundItemInput[]) {
                const itemResult = db
                    .prepare(
                        `
                        INSERT INTO inbound_order_items (
                            inbound_order_id, product_id, quantity, purchase_price_cents,
                            warranty_enabled, warranty_until, note
                        )
                        VALUES (
                            @inbound_order_id, @product_id, @quantity, @purchase_price_cents,
                            @warranty_enabled, @warranty_until, @note
                        )
                    `
                    )
                    .run({
                        inbound_order_id: orderId,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        purchase_price_cents: toCents(item.purchase_price),
                        warranty_enabled: item.warranty_enabled ? 1 : 0,
                        warranty_until: item.warranty_until || null,
                        note: item.note || null,
                    });

                const orderItemId = Number(itemResult.lastInsertRowid);
                const inventoryInsert = db.prepare(
                    `
                    INSERT INTO inventory_items (
                        product_id, supplier_id, inbound_order_id, inbound_order_item_id,
                        cost_price_cents, serial_number, warranty_enabled, warranty_until,
                        inbound_at, status, note, updated_at
                    )
                    VALUES (
                        @product_id, @supplier_id, @inbound_order_id, @inbound_order_item_id,
                        @cost_price_cents, @serial_number, @warranty_enabled, @warranty_until,
                        @inbound_at, 'in_stock', @note, CURRENT_TIMESTAMP
                    )
                `
                );

                for (let index = 0; index < item.quantity; index += 1) {
                    inventoryInsert.run({
                        product_id: item.product_id,
                        supplier_id,
                        inbound_order_id: orderId,
                        inbound_order_item_id: orderItemId,
                        cost_price_cents: toCents(item.purchase_price),
                        serial_number: item.serial_numbers?.[index] || null,
                        warranty_enabled: item.warranty_enabled ? 1 : 0,
                        warranty_until: item.warranty_until || null,
                        inbound_at: inbound_at || new Date().toISOString(),
                        note: item.note || null,
                    });
                }

                recalculateProductStock(db, item.product_id);
            }

            return orderId;
        });

        const orderId = createInboundOrder();
        const order = getInboundOrders().find((item) => item.id === orderId);

        return success(order, '入库单提交成功');
    } catch (e) {
        console.error('Create inbound order error:', e);
        return error(500, '提交入库单失败');
    }
}
