import type { SqliteDb } from './index';
import { ProductRow, serializeProduct, toYuan } from './serializers';

interface PurchaseReturnRow {
    id: number;
    purchase_order_id: number;
    inbound_order_id: number;
    type: 'return' | 'exchange';
    reason: string;
    status: 'completed';
    created_at?: string;
    updated_at?: string;
    amount_cents?: number;
    item_count?: number;
}

interface PurchaseReturnItemRow {
    id: number;
    purchase_return_id: number;
    purchase_order_item_id?: number | null;
    inbound_order_item_id?: number | null;
    inventory_item_id?: number | null;
    product_id: number;
    purchase_price_cents: number;
    created_at?: string;
    p_id?: number;
    category?: string;
    name?: string;
    barcode?: string | null;
    price_cents?: number;
    stock_quantity?: number;
    selling_price_cents?: number | null;
    is_use_premium?: number;
    product_created_at?: string;
    product_updated_at?: string;
}

interface ReturnableInventoryRow {
    id: number;
    product_id: number;
    inbound_order_item_id: number;
    purchase_price_cents: number;
    purchase_order_item_id: number | null;
}

const recalculateProductStock = (db: SqliteDb, productId: number) => {
    const row = db
        .prepare(
            "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
        )
        .get(productId) as { count: number };

    db.prepare(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(row.count, productId);
};

const serializeReturnItem = (row: PurchaseReturnItemRow) => ({
    id: row.id,
    purchase_return_id: row.purchase_return_id,
    purchase_order_item_id: row.purchase_order_item_id,
    inbound_order_item_id: row.inbound_order_item_id,
    inventory_item_id: row.inventory_item_id,
    product_id: row.product_id,
    purchase_price: toYuan(row.purchase_price_cents),
    created_at: row.created_at,
    product: row.p_id
        ? serializeProduct({
              id: row.p_id,
              category: row.category,
              name: row.name,
              barcode: row.barcode,
              price_cents: row.price_cents,
              stock_quantity: row.stock_quantity,
              selling_price_cents: row.selling_price_cents,
              is_use_premium: row.is_use_premium,
              created_at: row.product_created_at,
              updated_at: row.product_updated_at,
          } as ProductRow)
        : undefined,
});

export const getPurchaseReturnItems = (db: SqliteDb, purchaseReturnId: number) => {
    const rows = db
        .prepare(
            `
            SELECT pri.*,
                   p.id AS p_id, p.category, p.name, p.barcode, p.price_cents,
                   p.stock_quantity, p.selling_price_cents, p.is_use_premium,
                   p.created_at AS product_created_at, p.updated_at AS product_updated_at
            FROM purchase_return_items pri
            JOIN products p ON p.id = pri.product_id
            WHERE pri.purchase_return_id = ?
            ORDER BY pri.id ASC
        `
        )
        .all(purchaseReturnId) as PurchaseReturnItemRow[];

    return rows.map(serializeReturnItem);
};

const serializeReturn = (db: SqliteDb, row: PurchaseReturnRow) => ({
    id: row.id,
    purchase_order_id: row.purchase_order_id,
    inbound_order_id: row.inbound_order_id,
    type: row.type,
    reason: row.reason,
    status: row.status,
    amount: toYuan(Number(row.amount_cents || 0)),
    item_count: Number(row.item_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    items: getPurchaseReturnItems(db, row.id),
});

export const listPurchaseReturns = (
    db: SqliteDb,
    filters: { purchaseOrderId?: number; inboundOrderId?: number } = {}
) => {
    const conditions: string[] = [];
    const params: Record<string, number> = {};

    if (filters.purchaseOrderId) {
        conditions.push('pr.purchase_order_id = @purchaseOrderId');
        params.purchaseOrderId = filters.purchaseOrderId;
    }

    if (filters.inboundOrderId) {
        conditions.push('pr.inbound_order_id = @inboundOrderId');
        params.inboundOrderId = filters.inboundOrderId;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT pr.*,
                   COUNT(pri.id) AS item_count,
                   COALESCE(SUM(pri.purchase_price_cents), 0) AS amount_cents
            FROM purchase_returns pr
            LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id
            ${where}
            GROUP BY pr.id
            ORDER BY pr.created_at DESC, pr.id DESC
        `
        )
        .all(params) as PurchaseReturnRow[];

    return rows.map((row) => serializeReturn(db, row));
};

export const createPurchaseReturnForInboundOrder = (
    db: SqliteDb,
    inboundOrderId: number,
    input: {
        reason: string;
        inventoryItemIds?: number[];
        type?: 'return' | 'exchange';
    }
) => {
    const reason = String(input.reason || '').trim();
    if (!reason) throw new Error('RETURN_REASON_REQUIRED');

    const createReturn = db.transaction(() => {
        const order = db
            .prepare('SELECT * FROM inbound_orders WHERE id = ?')
            .get(inboundOrderId) as Record<string, unknown> | undefined;
        if (!order) throw new Error('ORDER_NOT_FOUND');
        if (!order.purchase_order_id) throw new Error('NO_PURCHASE_ORDER');

        const selectedIds = Array.from(
            new Set((input.inventoryItemIds || []).map((id) => Number(id)).filter(Boolean))
        );
        const idFilter = selectedIds.length
            ? `AND ii.id IN (${selectedIds.map(() => '?').join(',')})`
            : '';
        const inventoryRows = db
            .prepare(
                `
                SELECT ii.id,
                       ii.product_id,
                       ii.inbound_order_item_id,
                       ioi.purchase_price_cents,
                       ioi.purchase_order_item_id
                FROM inventory_items ii
                JOIN inbound_order_items ioi ON ioi.id = ii.inbound_order_item_id
                WHERE ii.inbound_order_id = ?
                  AND ii.status = 'in_stock'
                  ${idFilter}
                ORDER BY ii.id ASC
            `
            )
            .all(inboundOrderId, ...selectedIds) as ReturnableInventoryRow[];

        if (selectedIds.length > 0 && inventoryRows.length !== selectedIds.length) {
            throw new Error('INVENTORY_NOT_AVAILABLE');
        }
        if (inventoryRows.length === 0) throw new Error('NO_AVAILABLE_INVENTORY');
        if (inventoryRows.some((row) => !row.purchase_order_item_id)) {
            throw new Error('NO_PURCHASE_ORDER_ITEM');
        }

        const returnResult = db
            .prepare(
                `
                INSERT INTO purchase_returns (
                    purchase_order_id, inbound_order_id, type, reason, status, updated_at
                )
                VALUES (
                    @purchase_order_id, @inbound_order_id, @type, @reason, 'completed',
                    CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                purchase_order_id: order.purchase_order_id,
                inbound_order_id: inboundOrderId,
                type: input.type || 'return',
                reason,
            });
        const purchaseReturnId = Number(returnResult.lastInsertRowid);
        const insertReturnItem = db.prepare(
            `
            INSERT INTO purchase_return_items (
                purchase_return_id, purchase_order_item_id, inbound_order_item_id,
                inventory_item_id, product_id, purchase_price_cents
            )
            VALUES (
                @purchase_return_id, @purchase_order_item_id, @inbound_order_item_id,
                @inventory_item_id, @product_id, @purchase_price_cents
            )
        `
        );
        const updateInventory = db.prepare(
            "UPDATE inventory_items SET status = 'returned', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        );
        const affectedProductIds = new Set<number>();

        inventoryRows.forEach((row) => {
            insertReturnItem.run({
                purchase_return_id: purchaseReturnId,
                purchase_order_item_id: row.purchase_order_item_id,
                inbound_order_item_id: row.inbound_order_item_id,
                inventory_item_id: row.id,
                product_id: row.product_id,
                purchase_price_cents: row.purchase_price_cents,
            });
            updateInventory.run(row.id);
            affectedProductIds.add(row.product_id);
        });

        affectedProductIds.forEach((productId) => recalculateProductStock(db, productId));

        return purchaseReturnId;
    });

    return createReturn();
};
