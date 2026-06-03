import { getDb } from '@/lib/db';
import {
    getPurchaseOrderById,
    getPurchaseOrderSummaryCents,
    isPurchaseOrderStatus,
    recalculatePurchaseOrderStatus,
} from '@/lib/db/purchaseOrders';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface PurchaseOrderItemInput {
    id?: number;
    product_id: number;
    ordered_quantity: number;
    purchase_price: number;
    note?: string | null;
}

const normalizeOptionalDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : null;

const normalizeRequiredDate = (value: unknown, fallback: unknown) =>
    value ? new Date(String(value)).toISOString() : String(fallback);

const ensureProductsExist = (db: ReturnType<typeof getDb>, productIds: number[]) => {
    const ids = Array.from(new Set(productIds));
    if (ids.length === 0) return true;

    const row = db
        .prepare(
            `SELECT COUNT(*) AS count FROM products WHERE id IN (${ids.map(() => '?').join(',')})`
        )
        .get(...ids) as { count: number };

    return row.count === ids.length;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const purchaseOrder = getPurchaseOrderById(db, id);

        if (!purchaseOrder) return error(404, '进货单不存在');
        return success(purchaseOrder, '获取进货单成功');
    } catch (e) {
        console.error('Get purchase order error:', e);
        return error(500, '获取进货单失败');
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        const db = getDb();
        const payload = await request.json();

        const updatePurchaseOrder = db.transaction(() => {
            const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
            if (order.status === 'cancelled') throw new Error('PURCHASE_ORDER_CANCELLED');

            const summary = getPurchaseOrderSummaryCents(db, id, {
                shipping_fee_cents: Number(order.shipping_fee_cents || 0),
                misc_fee_cents: Number(order.misc_fee_cents || 0),
            });
            const hasReceivedItems = summary.totalReceivedQuantity > 0;

            if (
                payload.supplier_id &&
                Number(payload.supplier_id) !== Number(order.supplier_id) &&
                hasReceivedItems
            ) {
                throw new Error('SUPPLIER_LOCKED');
            }

            if (payload.status !== undefined) {
                if (
                    !isPurchaseOrderStatus(payload.status) ||
                    payload.status === 'cancelled' ||
                    payload.status === 'partial_inbound' ||
                    payload.status === 'completed'
                ) {
                    throw new Error('INVALID_STATUS');
                }
                if (hasReceivedItems) throw new Error('STATUS_LOCKED');
            }

            const nextSupplierId =
                payload.supplier_id === undefined ? order.supplier_id : Number(payload.supplier_id);
            const supplier = db
                .prepare('SELECT id FROM suppliers WHERE id = ?')
                .get(nextSupplierId);
            if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');

            db.prepare(
                `
                UPDATE purchase_orders
                SET supplier_id = @supplier_id,
                    status = @status,
                    ordered_at = @ordered_at,
                    expected_inbound_at = @expected_inbound_at,
                    shipping_fee_cents = @shipping_fee_cents,
                    misc_fee_cents = @misc_fee_cents,
                    note = @note,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({
                id,
                supplier_id: nextSupplierId,
                status: payload.status || order.status,
                ordered_at: normalizeRequiredDate(payload.ordered_at, order.ordered_at),
                expected_inbound_at:
                    payload.expected_inbound_at === undefined
                        ? order.expected_inbound_at
                        : normalizeOptionalDate(payload.expected_inbound_at),
                shipping_fee_cents:
                    payload.shipping_fee === undefined
                        ? order.shipping_fee_cents
                        : toCents(Number(payload.shipping_fee || 0)),
                misc_fee_cents:
                    payload.misc_fee === undefined
                        ? order.misc_fee_cents
                        : toCents(Number(payload.misc_fee || 0)),
                note: payload.note === undefined ? order.note : payload.note || null,
            });

            if (payload.items !== undefined) {
                if (order.status === 'completed') throw new Error('COMPLETED_ITEMS_LOCKED');
                if (!Array.isArray(payload.items) || payload.items.length === 0) {
                    throw new Error('EMPTY_ITEMS');
                }

                const items = payload.items as PurchaseOrderItemInput[];
                for (const item of items) {
                    if (
                        !item.product_id ||
                        !Number.isInteger(Number(item.ordered_quantity)) ||
                        Number(item.ordered_quantity) < 1 ||
                        item.purchase_price === undefined ||
                        Number(item.purchase_price) < 0
                    ) {
                        throw new Error('INVALID_ITEMS');
                    }
                }

                if (
                    !ensureProductsExist(
                        db,
                        items.map((item) => Number(item.product_id))
                    )
                ) {
                    throw new Error('PRODUCT_NOT_FOUND');
                }

                const existingItems = db
                    .prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?')
                    .all(id) as Array<Record<string, unknown>>;
                const existingMap = new Map(existingItems.map((item) => [Number(item.id), item]));
                const keepIds = new Set<number>();
                const updateItem = db.prepare(
                    `
                    UPDATE purchase_order_items
                    SET product_id = @product_id,
                        ordered_quantity = @ordered_quantity,
                        purchase_price_cents = @purchase_price_cents,
                        note = @note,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id AND purchase_order_id = @purchase_order_id
                `
                );
                const insertItem = db.prepare(
                    `
                    INSERT INTO purchase_order_items (
                        purchase_order_id, product_id, ordered_quantity, received_quantity,
                        purchase_price_cents, note, updated_at
                    )
                    VALUES (
                        @purchase_order_id, @product_id, @ordered_quantity, 0,
                        @purchase_price_cents, @note, CURRENT_TIMESTAMP
                    )
                `
                );
                const deleteItem = db.prepare(
                    'DELETE FROM purchase_order_items WHERE id = ? AND purchase_order_id = ?'
                );

                for (const item of items) {
                    const orderedQuantity = Number(item.ordered_quantity);
                    const purchasePriceCents = toCents(Number(item.purchase_price || 0));

                    if (item.id) {
                        const existing = existingMap.get(Number(item.id));
                        if (!existing) throw new Error('ITEM_NOT_FOUND');
                        keepIds.add(Number(item.id));

                        const receivedQuantity = Number(existing.received_quantity || 0);
                        if (orderedQuantity < receivedQuantity) {
                            throw new Error('QUANTITY_LESS_THAN_RECEIVED');
                        }
                        if (
                            receivedQuantity > 0 &&
                            (Number(existing.product_id) !== Number(item.product_id) ||
                                Number(existing.purchase_price_cents) !== purchasePriceCents)
                        ) {
                            throw new Error('RECEIVED_ITEM_LOCKED');
                        }

                        updateItem.run({
                            id: item.id,
                            purchase_order_id: id,
                            product_id: item.product_id,
                            ordered_quantity: orderedQuantity,
                            purchase_price_cents: purchasePriceCents,
                            note: item.note || null,
                        });
                    } else {
                        insertItem.run({
                            purchase_order_id: id,
                            product_id: item.product_id,
                            ordered_quantity: orderedQuantity,
                            purchase_price_cents: purchasePriceCents,
                            note: item.note || null,
                        });
                    }
                }

                for (const existing of existingItems) {
                    const existingId = Number(existing.id);
                    if (keepIds.has(existingId)) continue;
                    if (Number(existing.received_quantity || 0) > 0) {
                        throw new Error('DELETE_RECEIVED_ITEM');
                    }
                    deleteItem.run(existingId, id);
                }
            }

            const nextSummary = getPurchaseOrderSummaryCents(db, id);
            if (nextSummary.netPaidCents > nextSummary.payableAmountCents) {
                throw new Error('PAYABLE_LESS_THAN_PAID');
            }

            recalculatePurchaseOrderStatus(db, id);
            return id;
        });

        try {
            const purchaseOrderId = updatePurchaseOrder();
            return success(getPurchaseOrderById(db, purchaseOrderId), '进货单更新成功');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            const messageMap: Record<string, string> = {
                PURCHASE_ORDER_NOT_FOUND: '进货单不存在',
                PURCHASE_ORDER_CANCELLED: '已取消的进货单不能编辑',
                SUPPLIER_LOCKED: '已有入库记录的进货单不能修改商家',
                INVALID_STATUS: '进货单状态不正确',
                STATUS_LOCKED: '已有入库记录的进货单不能手动修改状态',
                SUPPLIER_NOT_FOUND: '进货商家不存在',
                COMPLETED_ITEMS_LOCKED: '已完成进货单不能修改明细',
                EMPTY_ITEMS: '请至少添加一条进货明细',
                INVALID_ITEMS: '进货明细中的物品、数量和采购单价不能为空',
                PRODUCT_NOT_FOUND: '进货明细存在无效物品',
                ITEM_NOT_FOUND: '进货明细不存在',
                QUANTITY_LESS_THAN_RECEIVED: '采购数量不能小于已入库数量',
                RECEIVED_ITEM_LOCKED: '已入库明细不能修改物品或采购单价',
                DELETE_RECEIVED_ITEM: '已入库明细不能删除',
                PAYABLE_LESS_THAN_PAID: '调整后应付款不能小于已付款净额',
            };
            if (messageMap[message])
                return error(
                    message === 'PURCHASE_ORDER_NOT_FOUND' ? 404 : 400,
                    messageMap[message]
                );
            throw e;
        }
    } catch (e) {
        console.error('Update purchase order error:', e);
        return error(500, '更新进货单失败');
    }
}
