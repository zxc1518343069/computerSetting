import { getDb } from '@/lib/db';
import {
    getPurchaseOrderById,
    getPurchaseOrderSummaryCents,
    recalculatePurchaseOrderStatus,
} from '@/lib/db/purchaseOrders';
import { syncLogisticsRecordForRelated } from '@/lib/db/logistics';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface ReceiveItemInput {
    purchase_order_item_id: number;
    quantity: number;
    serial_tracking_enabled?: boolean;
    serial_numbers?: string[];
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    note?: string | null;
}

interface PurchaseOrderItemRow {
    id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    received_quantity: number;
    purchase_price_cents: number;
}

const normalizeDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

const normalizeSerialNumbers = (serialNumbers: unknown) =>
    Array.isArray(serialNumbers)
        ? serialNumbers.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

const recalculateProductStock = (db: ReturnType<typeof getDb>, productId: number) => {
    const row = db
        .prepare(
            "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
        )
        .get(productId) as { count: number };

    db.prepare(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(row.count, productId);
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const purchaseOrderId = Number(idParam);
        const db = getDb();
        const {
            inbound_at,
            note,
            shipping_fee,
            misc_fee,
            logistics_company_id,
            tracking_no,
            payment,
            items,
        } = await request.json();

        const receivePurchaseOrder = db.transaction(() => {
            const order = db
                .prepare('SELECT * FROM purchase_orders WHERE id = ?')
                .get(purchaseOrderId) as Record<string, unknown> | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
            if (order.status === 'cancelled') throw new Error('PURCHASE_ORDER_CANCELLED');
            if (order.status === 'draft') throw new Error('PURCHASE_ORDER_NOT_CONFIRMED');

            const orderItems = db
                .prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?')
                .all(purchaseOrderId) as PurchaseOrderItemRow[];
            const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));
            const remainingItems = orderItems.filter(
                (item) => item.ordered_quantity > item.received_quantity
            );
            if (remainingItems.length === 0) throw new Error('NO_REMAINING_ITEMS');

            const inputItems: ReceiveItemInput[] =
                Array.isArray(items) && items.length > 0
                    ? items
                    : remainingItems.map((item) => ({
                          purchase_order_item_id: item.id,
                          quantity: item.ordered_quantity - item.received_quantity,
                          serial_tracking_enabled: false,
                      }));

            const seenOrderItemIds = new Set<number>();
            const allSerialNumbers = new Set<string>();
            const validatedItems = inputItems.map((input) => {
                const orderItemId = Number(input.purchase_order_item_id);
                const orderItem = orderItemMap.get(orderItemId);
                if (!orderItem) throw new Error('ITEM_NOT_FOUND');
                if (seenOrderItemIds.has(orderItemId)) throw new Error('DUPLICATE_RECEIVE_ITEM');
                seenOrderItemIds.add(orderItemId);

                const quantity = Number(input.quantity || 0);
                const remainingQuantity =
                    Number(orderItem.ordered_quantity || 0) -
                    Number(orderItem.received_quantity || 0);
                if (!Number.isInteger(quantity) || quantity < 1)
                    throw new Error('INVALID_QUANTITY');
                if (quantity > remainingQuantity) throw new Error('QUANTITY_EXCEEDS_REMAINING');

                const serialNumbers = normalizeSerialNumbers(input.serial_numbers);
                const serialTrackingEnabled = Boolean(input.serial_tracking_enabled);
                if (serialTrackingEnabled && serialNumbers.length !== quantity) {
                    throw new Error('SERIAL_COUNT_REQUIRED');
                }
                if (!serialTrackingEnabled && serialNumbers.length > quantity) {
                    throw new Error('SERIAL_COUNT_EXCEEDS_QUANTITY');
                }

                serialNumbers.forEach((serialNumber) => {
                    if (allSerialNumbers.has(serialNumber)) throw new Error('DUPLICATE_SERIAL');
                    allSerialNumbers.add(serialNumber);
                });

                return {
                    ...input,
                    orderItem,
                    quantity,
                    serialNumbers,
                    serialTrackingEnabled,
                };
            });

            if (allSerialNumbers.size > 0) {
                const serials = Array.from(allSerialNumbers);
                const existing = db
                    .prepare(
                        `SELECT serial_number FROM inventory_items WHERE serial_number IN (${serials
                            .map(() => '?')
                            .join(',')})`
                    )
                    .all(...serials) as Array<{ serial_number: string }>;
                if (existing.length > 0) throw new Error('SERIAL_EXISTS');
            }

            const inboundAt = normalizeDate(inbound_at);
            const nextShippingFeeCents =
                shipping_fee === undefined
                    ? Number(order.shipping_fee_cents || 0)
                    : toCents(Number(shipping_fee || 0));
            const nextMiscFeeCents =
                misc_fee === undefined
                    ? Number(order.misc_fee_cents || 0)
                    : toCents(Number(misc_fee || 0));

            if (shipping_fee !== undefined || misc_fee !== undefined) {
                db.prepare(
                    `
                    UPDATE purchase_orders
                    SET shipping_fee_cents = @shipping_fee_cents,
                        misc_fee_cents = @misc_fee_cents,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                ).run({
                    id: purchaseOrderId,
                    shipping_fee_cents: nextShippingFeeCents,
                    misc_fee_cents: nextMiscFeeCents,
                });
            }

            syncLogisticsRecordForRelated(db, {
                type: 'purchase',
                related_type: 'purchase_order',
                related_id: purchaseOrderId,
                company_id:
                    logistics_company_id === undefined
                        ? undefined
                        : Number(logistics_company_id || 0) || null,
                tracking_no: tracking_no === undefined ? undefined : tracking_no || null,
                shipping_fee: nextShippingFeeCents / 100,
                self_amount: nextShippingFeeCents / 100,
                occurred_at: inboundAt,
                shipping_fee_bearer: 'self',
                note: '进货入库同步物流',
            });

            const inboundOrderResult = db
                .prepare(
                    `
                    INSERT INTO inbound_orders (
                        supplier_id, shipping_fee_cents, misc_fee_cents, is_paid,
                        source_type, purchase_order_id, status, inbound_at, note, updated_at
                    )
                    VALUES (
                        @supplier_id, 0, 0, 0,
                        'purchase_order', @purchase_order_id, 'completed',
                        @inbound_at, @note, CURRENT_TIMESTAMP
                    )
                `
                )
                .run({
                    supplier_id: order.supplier_id,
                    purchase_order_id: purchaseOrderId,
                    inbound_at: inboundAt,
                    note: note || null,
                });
            const inboundOrderId = Number(inboundOrderResult.lastInsertRowid);

            const insertInboundItem = db.prepare(
                `
                INSERT INTO inbound_order_items (
                    inbound_order_id, product_id, quantity, purchase_price_cents,
                    purchase_order_item_id, serial_tracking_enabled,
                    warranty_enabled, warranty_until, note
                )
                VALUES (
                    @inbound_order_id, @product_id, @quantity, @purchase_price_cents,
                    @purchase_order_item_id, @serial_tracking_enabled,
                    @warranty_enabled, @warranty_until, @note
                )
            `
            );
            const insertInventoryItem = db.prepare(
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
            const updatePurchaseItem = db.prepare(
                `
                UPDATE purchase_order_items
                SET received_quantity = received_quantity + @quantity,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id AND purchase_order_id = @purchase_order_id
            `
            );
            const affectedProductIds = new Set<number>();

            validatedItems.forEach((item) => {
                const inboundItemResult = insertInboundItem.run({
                    inbound_order_id: inboundOrderId,
                    product_id: item.orderItem.product_id,
                    quantity: item.quantity,
                    purchase_price_cents: item.orderItem.purchase_price_cents,
                    purchase_order_item_id: item.orderItem.id,
                    serial_tracking_enabled: item.serialTrackingEnabled ? 1 : 0,
                    warranty_enabled: item.warranty_enabled ? 1 : 0,
                    warranty_until: item.warranty_until || null,
                    note: item.note || null,
                });
                const inboundOrderItemId = Number(inboundItemResult.lastInsertRowid);

                for (let index = 0; index < item.quantity; index += 1) {
                    insertInventoryItem.run({
                        product_id: item.orderItem.product_id,
                        supplier_id: order.supplier_id,
                        inbound_order_id: inboundOrderId,
                        inbound_order_item_id: inboundOrderItemId,
                        cost_price_cents: item.orderItem.purchase_price_cents,
                        serial_number: item.serialNumbers[index] || null,
                        warranty_enabled: item.warranty_enabled ? 1 : 0,
                        warranty_until: item.warranty_until || null,
                        inbound_at: inboundAt,
                        note: item.note || null,
                    });
                }

                updatePurchaseItem.run({
                    id: item.orderItem.id,
                    purchase_order_id: purchaseOrderId,
                    quantity: item.quantity,
                });
                affectedProductIds.add(item.orderItem.product_id);
            });

            affectedProductIds.forEach((productId) => recalculateProductStock(db, productId));
            recalculatePurchaseOrderStatus(db, purchaseOrderId);

            const paymentAmountCents = toCents(Number(payment?.amount || 0));
            if (paymentAmountCents > 0) {
                const summary = getPurchaseOrderSummaryCents(db, purchaseOrderId, {
                    shipping_fee_cents: nextShippingFeeCents,
                    misc_fee_cents: nextMiscFeeCents,
                });
                if (paymentAmountCents > summary.pendingPaymentCents) {
                    throw new Error('PAYMENT_EXCEEDS_PAYABLE');
                }

                db.prepare(
                    `
                    INSERT INTO purchase_payments (
                        purchase_order_id, amount_cents, payment_account,
                        paid_at, status, note, updated_at
                    )
                    VALUES (
                        @purchase_order_id, @amount_cents, @payment_account,
                        @paid_at, 'active', @note, CURRENT_TIMESTAMP
                    )
                `
                ).run({
                    purchase_order_id: purchaseOrderId,
                    amount_cents: paymentAmountCents,
                    payment_account: payment?.payment_account || null,
                    paid_at: normalizeDate(payment?.paid_at),
                    note: payment?.note || null,
                });
            }

            return inboundOrderId;
        });

        try {
            const inboundOrderId = receivePurchaseOrder();
            return success(
                {
                    inbound_order_id: inboundOrderId,
                    purchase_order: getPurchaseOrderById(db, purchaseOrderId),
                },
                '进货单入库成功'
            );
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_ORDER_NOT_FOUND: '进货单不存在',
                PURCHASE_ORDER_CANCELLED: '已取消进货单不能入库',
                PURCHASE_ORDER_NOT_CONFIRMED: '预下单需要先确认下单后才能入库',
                NO_REMAINING_ITEMS: '该进货单没有剩余可入库物品',
                ITEM_NOT_FOUND: '入库明细不属于该进货单',
                DUPLICATE_RECEIVE_ITEM: '同一进货明细不能重复入库',
                INVALID_QUANTITY: '本次入库数量必须大于 0',
                QUANTITY_EXCEEDS_REMAINING: '本次入库数量不能超过剩余未入库数量',
                SERIAL_COUNT_REQUIRED: '启用序列号管理时，序列号数量必须等于入库数量',
                SERIAL_COUNT_EXCEEDS_QUANTITY: '序列号数量不能超过入库数量',
                DUPLICATE_SERIAL: '同一张入库单内序列号不能重复',
                SERIAL_EXISTS: '序列号已存在',
                PAYMENT_EXCEEDS_PAYABLE: '本次付款会超过当前应付款',
                LOGISTICS_COMPANY_NOT_FOUND: '物流公司不存在',
            };
            if (messageMap[message])
                return error(
                    message === 'PURCHASE_ORDER_NOT_FOUND' ? 404 : 400,
                    messageMap[message]
                );
            throw e;
        }
    } catch (e) {
        console.error('Receive purchase order error:', e);
        return error(500, '进货单入库失败');
    }
}
