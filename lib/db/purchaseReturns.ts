import type { SqliteDb } from './index';
import {
    getLogisticsRecordByRelated,
    syncLogisticsRecordForRelated,
    voidLogisticsRecordForRelated,
} from './logistics';
import { ProductRow, serializeProduct, toCents, toYuan } from './serializers';

export type PurchaseReturnGoodsStatus =
    | 'pending_shipment'
    | 'shipped'
    | 'merchant_received'
    | 'cancelled';
export type PurchaseReturnRefundStatus = 'unrefunded' | 'partial_refunded' | 'refunded';
export type PurchaseReturnShippingFeeBearer = 'self' | 'merchant' | 'shared';

interface PurchaseReturnRow {
    id: number;
    purchase_order_id: number;
    inbound_order_id: number;
    type: 'return' | 'exchange';
    reason: string;
    status: string;
    goods_status?: PurchaseReturnGoodsStatus | null;
    shipping_fee_cents?: number;
    shipping_fee_bearer?: PurchaseReturnShippingFeeBearer;
    self_shipping_fee_cents?: number;
    merchant_shipping_fee_cents?: number;
    logistics_company_id?: number | null;
    logistics_company?: string | null;
    tracking_no?: string | null;
    shipped_at?: string | null;
    merchant_received_at?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier_id?: number;
    supplier_name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    supplier_note?: string | null;
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
    category_id?: number | null;
    category_name?: string | null;
    category_label?: string | null;
    category_tag_color?: string | null;
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
    serial_tracking_enabled: number;
}

interface CreatePurchaseReturnItemInput {
    inbound_order_item_id?: number;
    product_id?: number;
    quantity?: number;
    inventory_item_ids?: number[];
}

interface PurchaseRefundRow {
    id: number;
    purchase_order_id: number;
    purchase_return_id?: number | null;
    amount_cents: number;
    refund_account?: string | null;
    refunded_at: string;
    status: 'active' | 'voided';
    voided_at?: string | null;
    void_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

const goodsStatuses: PurchaseReturnGoodsStatus[] = [
    'pending_shipment',
    'shipped',
    'merchant_received',
    'cancelled',
];
const shippingFeeBearers: PurchaseReturnShippingFeeBearer[] = ['self', 'merchant', 'shared'];

const normalizeDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

const normalizeOptionalText = (value: unknown) => {
    const text = String(value || '').trim();
    return text || null;
};

const normalizeOptionalId = (value: unknown) => {
    const id = Number(value || 0);
    return id > 0 ? id : null;
};

const getLogisticsCompanyName = (db: SqliteDb, id?: number | null) => {
    if (!id) return null;
    const row = db.prepare('SELECT name FROM logistics_companies WHERE id = ?').get(id) as
        | { name: string }
        | undefined;
    if (!row) throw new Error('LOGISTICS_COMPANY_NOT_FOUND');
    return row.name;
};

const normalizeGoodsStatus = (row: PurchaseReturnRow): PurchaseReturnGoodsStatus => {
    if (row.goods_status && goodsStatuses.includes(row.goods_status)) return row.goods_status;
    if (row.status === 'cancelled') return 'cancelled';
    if (row.status === 'completed') return 'merchant_received';
    return 'pending_shipment';
};

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

const productFromReturnItem = (row: PurchaseReturnItemRow) =>
    row.p_id
        ? serializeProduct({
              id: row.p_id,
              category: row.category,
              category_id: row.category_id,
              category_name: row.category_name,
              category_label: row.category_label,
              category_tag_color: row.category_tag_color,
              name: row.name,
              barcode: row.barcode,
              price_cents: row.price_cents,
              stock_quantity: row.stock_quantity,
              selling_price_cents: row.selling_price_cents,
              is_use_premium: row.is_use_premium,
              created_at: row.product_created_at,
              updated_at: row.product_updated_at,
          } as ProductRow)
        : undefined;

const serializeReturnItem = (row: PurchaseReturnItemRow) => ({
    id: row.id,
    purchase_return_id: row.purchase_return_id,
    purchase_order_item_id: row.purchase_order_item_id,
    inbound_order_item_id: row.inbound_order_item_id,
    inventory_item_id: row.inventory_item_id,
    product_id: row.product_id,
    purchase_price: toYuan(row.purchase_price_cents),
    created_at: row.created_at,
    product: productFromReturnItem(row),
});

export const getPurchaseReturnItems = (db: SqliteDb, purchaseReturnId: number) => {
    const rows = db
        .prepare(
            `
            SELECT pri.*,
                   p.id AS p_id, p.category, p.category_id, pc.name AS category_name,
                   pc.label AS category_label, pc.tag_color AS category_tag_color,
                   p.name, p.barcode, p.price_cents, p.stock_quantity,
                   p.selling_price_cents, p.is_use_premium,
                   p.created_at AS product_created_at, p.updated_at AS product_updated_at
            FROM purchase_return_items pri
            JOIN products p ON p.id = pri.product_id
            LEFT JOIN product_categories pc ON pc.id = p.category_id
            WHERE pri.purchase_return_id = ?
            ORDER BY pri.id ASC
        `
        )
        .all(purchaseReturnId) as PurchaseReturnItemRow[];

    return rows.map(serializeReturnItem);
};

const getPurchaseReturnRefunds = (db: SqliteDb, purchaseReturnId: number) => {
    const rows = db
        .prepare(
            `
            SELECT *
            FROM purchase_refunds
            WHERE purchase_return_id = ?
            ORDER BY refunded_at DESC, created_at DESC, id DESC
        `
        )
        .all(purchaseReturnId) as PurchaseRefundRow[];

    return rows.map((row) => ({
        id: row.id,
        purchase_order_id: row.purchase_order_id,
        purchase_return_id: row.purchase_return_id,
        amount: toYuan(row.amount_cents),
        refund_account: row.refund_account,
        refunded_at: row.refunded_at,
        status: row.status,
        voided_at: row.voided_at,
        void_reason: row.void_reason,
        note: row.note,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
};

const getPurchaseReturnSummaryCents = (db: SqliteDb, row: PurchaseReturnRow) => {
    const itemSummary = db
        .prepare(
            `
            SELECT COUNT(*) AS item_count,
                   COALESCE(SUM(purchase_price_cents), 0) AS amount_cents
            FROM purchase_return_items
            WHERE purchase_return_id = ?
        `
        )
        .get(row.id) as { item_count: number; amount_cents: number };

    const refundSummary = db
        .prepare(
            `
            SELECT COALESCE(SUM(amount_cents), 0) AS refunded_amount_cents
            FROM purchase_refunds
            WHERE purchase_return_id = ?
              AND status = 'active'
        `
        )
        .get(row.id) as { refunded_amount_cents: number };

    const goodsStatus = normalizeGoodsStatus(row);
    const itemAmountCents = Number(itemSummary.amount_cents || 0);
    const merchantShippingFeeCents =
        goodsStatus === 'cancelled' ? 0 : Number(row.merchant_shipping_fee_cents || 0);
    const receivableAmountCents =
        goodsStatus === 'cancelled' ? 0 : itemAmountCents + merchantShippingFeeCents;
    const refundedAmountCents =
        goodsStatus === 'cancelled' ? 0 : Number(refundSummary.refunded_amount_cents || 0);
    const pendingRefundCents = Math.max(receivableAmountCents - refundedAmountCents, 0);

    let refundStatus: PurchaseReturnRefundStatus = 'unrefunded';
    if (pendingRefundCents === 0) {
        refundStatus = 'refunded';
    } else if (refundedAmountCents > 0) {
        refundStatus = 'partial_refunded';
    }

    return {
        itemCount: Number(itemSummary.item_count || 0),
        amountCents: itemAmountCents,
        receivableAmountCents,
        refundedAmountCents,
        pendingRefundCents,
        refundStatus,
    };
};

const serializeReturn = (db: SqliteDb, row: PurchaseReturnRow) => {
    const summary = getPurchaseReturnSummaryCents(db, row);

    return {
        id: row.id,
        purchase_order_id: row.purchase_order_id,
        inbound_order_id: row.inbound_order_id,
        type: row.type,
        reason: row.reason,
        status: row.status,
        goods_status: normalizeGoodsStatus(row),
        shipping_fee: toYuan(Number(row.shipping_fee_cents || 0)),
        shipping_fee_bearer: row.shipping_fee_bearer || 'self',
        self_shipping_fee: toYuan(Number(row.self_shipping_fee_cents || 0)),
        merchant_shipping_fee: toYuan(Number(row.merchant_shipping_fee_cents || 0)),
        logistics_company_id: row.logistics_company_id || null,
        logistics_company: row.logistics_company,
        tracking_no: row.tracking_no,
        logistics_record: getLogisticsRecordByRelated(
            db,
            'purchase_return',
            row.id,
            'purchase_return'
        ),
        shipped_at: row.shipped_at,
        merchant_received_at: row.merchant_received_at,
        cancelled_at: row.cancelled_at,
        cancel_reason: row.cancel_reason,
        note: row.note,
        amount: toYuan(summary.amountCents),
        receivable_amount: toYuan(summary.receivableAmountCents),
        refunded_amount: toYuan(summary.refundedAmountCents),
        pending_refund: toYuan(summary.pendingRefundCents),
        refund_status: summary.refundStatus,
        item_count: summary.itemCount,
        created_at: row.created_at,
        updated_at: row.updated_at,
        supplier: row.supplier_name
            ? {
                  id: row.supplier_id,
                  name: row.supplier_name,
                  contact_name: row.contact_name,
                  phone: row.phone,
                  address: row.address,
                  note: row.supplier_note,
              }
            : undefined,
        items: getPurchaseReturnItems(db, row.id),
        refunds: getPurchaseReturnRefunds(db, row.id),
    };
};

export const listPurchaseReturns = (
    db: SqliteDb,
    filters: {
        search?: string | null;
        purchaseOrderId?: number;
        inboundOrderId?: number;
        supplierId?: number;
        goodsStatus?: string | null;
        refundStatus?: string | null;
    } = {}
) => {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filters.purchaseOrderId) {
        conditions.push('pr.purchase_order_id = @purchaseOrderId');
        params.purchaseOrderId = filters.purchaseOrderId;
    }
    if (filters.inboundOrderId) {
        conditions.push('pr.inbound_order_id = @inboundOrderId');
        params.inboundOrderId = filters.inboundOrderId;
    }
    if (filters.supplierId) {
        conditions.push('po.supplier_id = @supplierId');
        params.supplierId = filters.supplierId;
    }
    if (
        filters.goodsStatus &&
        filters.goodsStatus !== 'all' &&
        goodsStatuses.includes(filters.goodsStatus as PurchaseReturnGoodsStatus)
    ) {
        conditions.push('pr.goods_status = @goodsStatus');
        params.goodsStatus = filters.goodsStatus;
    }
    const search = filters.search?.trim();
    if (search) {
        const documentMatch = search.match(/^(JH|RK|TH)-?(\d+)$/i);
        if (documentMatch) {
            const [, prefix, id] = documentMatch;
            if (prefix.toUpperCase() === 'JH') {
                conditions.push('pr.purchase_order_id = @searchPurchaseOrderId');
                params.searchPurchaseOrderId = Number(id);
            }
            if (prefix.toUpperCase() === 'RK') {
                conditions.push('pr.inbound_order_id = @searchInboundOrderId');
                params.searchInboundOrderId = Number(id);
            }
            if (prefix.toUpperCase() === 'TH') {
                conditions.push('pr.id = @searchPurchaseReturnId');
                params.searchPurchaseReturnId = Number(id);
            }
        } else {
            conditions.push(`
                (
                    CAST(pr.id AS TEXT) LIKE @search
                    OR CAST(pr.purchase_order_id AS TEXT) LIKE @search
                    OR CAST(pr.inbound_order_id AS TEXT) LIKE @search
                    OR s.name LIKE @search
                    OR EXISTS (
                        SELECT 1
                        FROM purchase_return_items pri
                        JOIN products p ON p.id = pri.product_id
                        WHERE pri.purchase_return_id = pr.id
                          AND (p.name LIKE @search OR p.barcode LIKE @search)
                    )
                )
            `);
            params.search = `%${search}%`;
        }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT pr.*, po.supplier_id, s.name AS supplier_name, s.contact_name,
                   s.phone, s.address, s.note AS supplier_note
            FROM purchase_returns pr
            JOIN purchase_orders po ON po.id = pr.purchase_order_id
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            ${where}
            ORDER BY pr.created_at DESC, pr.id DESC
        `
        )
        .all(params) as PurchaseReturnRow[];

    const returns = rows.map((row) => serializeReturn(db, row));
    if (filters.refundStatus && filters.refundStatus !== 'all') {
        return returns.filter((item) => item.refund_status === filters.refundStatus);
    }

    return returns;
};

export const getPurchaseReturnById = (db: SqliteDb, id: number) => {
    const row = db
        .prepare(
            `
            SELECT pr.*, po.supplier_id, s.name AS supplier_name, s.contact_name,
                   s.phone, s.address, s.note AS supplier_note
            FROM purchase_returns pr
            JOIN purchase_orders po ON po.id = pr.purchase_order_id
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE pr.id = ?
        `
        )
        .get(id) as PurchaseReturnRow | undefined;

    return row ? serializeReturn(db, row) : null;
};

const normalizeInventoryIds = (value: unknown) =>
    Array.isArray(value) ? Array.from(new Set(value.map((id) => Number(id)).filter(Boolean))) : [];

const normalizeShippingFees = (input: {
    shipping_fee?: number;
    shipping_fee_bearer?: PurchaseReturnShippingFeeBearer;
    self_shipping_fee?: number;
    merchant_shipping_fee?: number;
}) => {
    const bearer = shippingFeeBearers.includes(input.shipping_fee_bearer || 'self')
        ? input.shipping_fee_bearer || 'self'
        : 'self';
    const explicitSelf = input.self_shipping_fee !== undefined;
    const explicitMerchant = input.merchant_shipping_fee !== undefined;
    let selfShippingFeeCents = toCents(Number(input.self_shipping_fee || 0));
    let merchantShippingFeeCents = toCents(Number(input.merchant_shipping_fee || 0));
    let shippingFeeCents = toCents(Number(input.shipping_fee || 0));

    if (shippingFeeCents < 0 || selfShippingFeeCents < 0 || merchantShippingFeeCents < 0) {
        throw new Error('INVALID_SHIPPING_FEE');
    }

    if (!explicitSelf && !explicitMerchant) {
        if (bearer === 'merchant') merchantShippingFeeCents = shippingFeeCents;
        if (bearer === 'self') selfShippingFeeCents = shippingFeeCents;
    }

    if (
        shippingFeeCents > 0 &&
        selfShippingFeeCents === 0 &&
        merchantShippingFeeCents === 0 &&
        (bearer === 'self' || bearer === 'merchant')
    ) {
        if (bearer === 'self') selfShippingFeeCents = shippingFeeCents;
        if (bearer === 'merchant') merchantShippingFeeCents = shippingFeeCents;
    }

    if (shippingFeeCents < selfShippingFeeCents + merchantShippingFeeCents) {
        shippingFeeCents = selfShippingFeeCents + merchantShippingFeeCents;
    }

    return {
        shippingFeeCents,
        shippingFeeBearer: bearer,
        selfShippingFeeCents,
        merchantShippingFeeCents,
    };
};

const syncPurchaseReturnLogisticsRecord = (
    db: SqliteDb,
    input: {
        purchaseReturnId: number;
        logisticsCompanyId?: number | null;
        trackingNo?: string | null;
        shipping: ReturnType<typeof normalizeShippingFees>;
        occurredAt?: string | null;
    }
) =>
    syncLogisticsRecordForRelated(db, {
        type: 'purchase_return',
        related_type: 'purchase_return',
        related_id: input.purchaseReturnId,
        company_id: input.logisticsCompanyId || null,
        tracking_no: input.trackingNo || null,
        shipping_fee: toYuan(input.shipping.shippingFeeCents),
        self_amount: toYuan(input.shipping.selfShippingFeeCents),
        occurred_at: input.occurredAt || undefined,
        shipping_fee_bearer: input.shipping.shippingFeeBearer,
        note: '采购退货物流',
    });

const selectInventoryRowsByIds = (
    db: SqliteDb,
    inboundOrderId: number,
    inventoryItemIds: number[]
) => {
    if (inventoryItemIds.length === 0) return [];

    return db
        .prepare(
            `
            SELECT ii.id, ii.product_id, ii.inbound_order_item_id,
                   ioi.purchase_price_cents, ioi.purchase_order_item_id,
                   ioi.serial_tracking_enabled
            FROM inventory_items ii
            JOIN inbound_order_items ioi ON ioi.id = ii.inbound_order_item_id
            WHERE ii.inbound_order_id = ?
              AND ii.status = 'in_stock'
              AND ii.id IN (${inventoryItemIds.map(() => '?').join(',')})
            ORDER BY ii.id ASC
        `
        )
        .all(inboundOrderId, ...inventoryItemIds) as ReturnableInventoryRow[];
};

const selectInventoryRowsByQuantity = (
    db: SqliteDb,
    inboundOrderId: number,
    inboundOrderItemId: number,
    quantity: number
) =>
    db
        .prepare(
            `
            SELECT ii.id, ii.product_id, ii.inbound_order_item_id,
                   ioi.purchase_price_cents, ioi.purchase_order_item_id,
                   ioi.serial_tracking_enabled
            FROM inventory_items ii
            JOIN inbound_order_items ioi ON ioi.id = ii.inbound_order_item_id
            WHERE ii.inbound_order_id = ?
              AND ii.inbound_order_item_id = ?
              AND ii.status = 'in_stock'
            ORDER BY ii.id ASC
            LIMIT ?
        `
        )
        .all(inboundOrderId, inboundOrderItemId, quantity) as ReturnableInventoryRow[];

export const createPurchaseReturn = (
    db: SqliteDb,
    input: {
        inboundOrderId: number;
        reason: string;
        note?: string | null;
        items?: CreatePurchaseReturnItemInput[];
        inventoryItemIds?: number[];
        type?: 'return' | 'exchange';
        shipping_fee?: number;
        shipping_fee_bearer?: PurchaseReturnShippingFeeBearer;
        self_shipping_fee?: number;
        merchant_shipping_fee?: number;
        logistics_company_id?: number | null;
        logistics_company?: string | null;
        tracking_no?: string | null;
    }
) => {
    const reason = String(input.reason || '').trim();
    if (!reason) throw new Error('RETURN_REASON_REQUIRED');

    const createReturn = db.transaction(() => {
        const order = db
            .prepare('SELECT * FROM inbound_orders WHERE id = ?')
            .get(input.inboundOrderId) as Record<string, unknown> | undefined;
        if (!order) throw new Error('ORDER_NOT_FOUND');
        if (!order.purchase_order_id) throw new Error('NO_PURCHASE_ORDER');

        const selectedRows: ReturnableInventoryRow[] = [];
        const seenInventoryIds = new Set<number>();
        const topLevelInventoryIds = normalizeInventoryIds(input.inventoryItemIds);

        if (topLevelInventoryIds.length > 0) {
            const rows = selectInventoryRowsByIds(db, input.inboundOrderId, topLevelInventoryIds);
            if (rows.length !== topLevelInventoryIds.length) {
                throw new Error('INVENTORY_NOT_AVAILABLE');
            }
            selectedRows.push(...rows);
        } else if (Array.isArray(input.items) && input.items.length > 0) {
            input.items.forEach((item) => {
                const inboundOrderItemId = Number(item.inbound_order_item_id || 0);
                if (!inboundOrderItemId) throw new Error('RETURN_ITEM_REQUIRED');

                const inboundItem = db
                    .prepare(
                        'SELECT * FROM inbound_order_items WHERE id = ? AND inbound_order_id = ?'
                    )
                    .get(inboundOrderItemId, input.inboundOrderId) as
                    | Record<string, unknown>
                    | undefined;
                if (!inboundItem) throw new Error('RETURN_ITEM_NOT_FOUND');
                if (item.product_id && Number(item.product_id) !== Number(inboundItem.product_id)) {
                    throw new Error('RETURN_ITEM_PRODUCT_MISMATCH');
                }

                const inventoryIds = normalizeInventoryIds(item.inventory_item_ids);
                const rows =
                    inventoryIds.length > 0
                        ? selectInventoryRowsByIds(db, input.inboundOrderId, inventoryIds).filter(
                              (row) => row.inbound_order_item_id === inboundOrderItemId
                          )
                        : [];

                if (inventoryIds.length > 0) {
                    if (rows.length !== inventoryIds.length) {
                        throw new Error('INVENTORY_NOT_AVAILABLE');
                    }
                    selectedRows.push(...rows);
                    return;
                }

                if (Number(inboundItem.serial_tracking_enabled || 0) === 1) {
                    throw new Error('SERIAL_SELECTION_REQUIRED');
                }

                const quantity = Number(item.quantity || 0);
                if (!Number.isInteger(quantity) || quantity < 1) {
                    throw new Error('INVALID_RETURN_QUANTITY');
                }

                const quantityRows = selectInventoryRowsByQuantity(
                    db,
                    input.inboundOrderId,
                    inboundOrderItemId,
                    quantity
                );
                if (quantityRows.length !== quantity) {
                    throw new Error('RETURN_QUANTITY_EXCEEDS_AVAILABLE');
                }
                selectedRows.push(...quantityRows);
            });
        } else {
            throw new Error('RETURN_ITEM_REQUIRED');
        }

        if (selectedRows.length === 0) throw new Error('NO_AVAILABLE_INVENTORY');
        selectedRows.forEach((row) => {
            if (seenInventoryIds.has(row.id)) throw new Error('DUPLICATE_INVENTORY_ITEM');
            if (!row.purchase_order_item_id) throw new Error('NO_PURCHASE_ORDER_ITEM');
            seenInventoryIds.add(row.id);
        });

        const shipping = normalizeShippingFees(input);
        const logisticsCompanyId = normalizeOptionalId(input.logistics_company_id);
        const logisticsCompanyName =
            input.logistics_company === undefined
                ? getLogisticsCompanyName(db, logisticsCompanyId)
                : normalizeOptionalText(input.logistics_company);
        const returnResult = db
            .prepare(
                `
                INSERT INTO purchase_returns (
                    purchase_order_id, inbound_order_id, type, reason, status,
                    goods_status, shipping_fee_cents, shipping_fee_bearer,
                    self_shipping_fee_cents, merchant_shipping_fee_cents,
                    logistics_company_id, logistics_company, tracking_no, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @inbound_order_id, @type, @reason, 'completed',
                    'pending_shipment', @shipping_fee_cents, @shipping_fee_bearer,
                    @self_shipping_fee_cents, @merchant_shipping_fee_cents,
                    @logistics_company_id, @logistics_company, @tracking_no, @note, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                purchase_order_id: order.purchase_order_id,
                inbound_order_id: input.inboundOrderId,
                type: input.type || 'return',
                reason,
                shipping_fee_cents: shipping.shippingFeeCents,
                shipping_fee_bearer: shipping.shippingFeeBearer,
                self_shipping_fee_cents: shipping.selfShippingFeeCents,
                merchant_shipping_fee_cents: shipping.merchantShippingFeeCents,
                logistics_company_id: logisticsCompanyId,
                logistics_company: logisticsCompanyName,
                tracking_no: normalizeOptionalText(input.tracking_no),
                note: normalizeOptionalText(input.note),
            });
        const purchaseReturnId = Number(returnResult.lastInsertRowid);
        syncPurchaseReturnLogisticsRecord(db, {
            purchaseReturnId,
            logisticsCompanyId,
            trackingNo: normalizeOptionalText(input.tracking_no),
            shipping,
        });
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

        selectedRows.forEach((row) => {
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

export const createPurchaseReturnForInboundOrder = (
    db: SqliteDb,
    inboundOrderId: number,
    input: {
        reason: string;
        inventoryItemIds?: number[];
        type?: 'return' | 'exchange';
    }
) =>
    createPurchaseReturn(db, {
        inboundOrderId,
        reason: input.reason,
        inventoryItemIds: input.inventoryItemIds,
        type: input.type || 'return',
    });

export const updatePurchaseReturn = (
    db: SqliteDb,
    id: number,
    input: {
        reason?: string;
        note?: string | null;
        shipping_fee?: number;
        shipping_fee_bearer?: PurchaseReturnShippingFeeBearer;
        self_shipping_fee?: number;
        merchant_shipping_fee?: number;
        logistics_company_id?: number | null;
        logistics_company?: string | null;
        tracking_no?: string | null;
    }
) => {
    const updateReturn = db.transaction(() => {
        const row = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as
            | PurchaseReturnRow
            | undefined;
        if (!row) throw new Error('PURCHASE_RETURN_NOT_FOUND');
        if (normalizeGoodsStatus(row) === 'cancelled') throw new Error('PURCHASE_RETURN_CANCELLED');

        const reason = input.reason === undefined ? row.reason : String(input.reason || '').trim();
        if (!reason) throw new Error('RETURN_REASON_REQUIRED');

        const shipping = normalizeShippingFees({
            shipping_fee:
                input.shipping_fee === undefined
                    ? toYuan(Number(row.shipping_fee_cents || 0))
                    : input.shipping_fee,
            shipping_fee_bearer: input.shipping_fee_bearer || row.shipping_fee_bearer,
            self_shipping_fee:
                input.self_shipping_fee === undefined
                    ? toYuan(Number(row.self_shipping_fee_cents || 0))
                    : input.self_shipping_fee,
            merchant_shipping_fee:
                input.merchant_shipping_fee === undefined
                    ? toYuan(Number(row.merchant_shipping_fee_cents || 0))
                    : input.merchant_shipping_fee,
        });
        const logisticsCompanyId =
            input.logistics_company_id === undefined
                ? row.logistics_company_id || null
                : normalizeOptionalId(input.logistics_company_id);
        const logisticsCompanyName =
            input.logistics_company !== undefined
                ? normalizeOptionalText(input.logistics_company)
                : input.logistics_company_id !== undefined
                  ? getLogisticsCompanyName(db, logisticsCompanyId)
                  : row.logistics_company;
        const trackingNo =
            input.tracking_no === undefined
                ? row.tracking_no
                : normalizeOptionalText(input.tracking_no);

        db.prepare(
            `
            UPDATE purchase_returns
            SET reason = @reason,
                note = @note,
                shipping_fee_cents = @shipping_fee_cents,
                shipping_fee_bearer = @shipping_fee_bearer,
                self_shipping_fee_cents = @self_shipping_fee_cents,
                merchant_shipping_fee_cents = @merchant_shipping_fee_cents,
                logistics_company_id = @logistics_company_id,
                logistics_company = @logistics_company,
                tracking_no = @tracking_no,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            reason,
            note: input.note === undefined ? row.note : normalizeOptionalText(input.note),
            shipping_fee_cents: shipping.shippingFeeCents,
            shipping_fee_bearer: shipping.shippingFeeBearer,
            self_shipping_fee_cents: shipping.selfShippingFeeCents,
            merchant_shipping_fee_cents: shipping.merchantShippingFeeCents,
            logistics_company_id: logisticsCompanyId,
            logistics_company: logisticsCompanyName,
            tracking_no: trackingNo,
        });
        syncPurchaseReturnLogisticsRecord(db, {
            purchaseReturnId: id,
            logisticsCompanyId,
            trackingNo,
            shipping,
            occurredAt: row.shipped_at || row.created_at,
        });

        return id;
    });

    return updateReturn();
};

export const shipPurchaseReturn = (
    db: SqliteDb,
    id: number,
    input: {
        logistics_company_id?: number | null;
        logistics_company?: string | null;
        tracking_no?: string | null;
        shipped_at?: string;
        shipping_fee?: number;
        shipping_fee_bearer?: PurchaseReturnShippingFeeBearer;
        self_shipping_fee?: number;
        merchant_shipping_fee?: number;
        note?: string | null;
    }
) => {
    const shipReturn = db.transaction(() => {
        const row = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as
            | PurchaseReturnRow
            | undefined;
        if (!row) throw new Error('PURCHASE_RETURN_NOT_FOUND');
        if (normalizeGoodsStatus(row) !== 'pending_shipment') {
            throw new Error('PURCHASE_RETURN_NOT_PENDING');
        }

        const shipping = normalizeShippingFees({
            shipping_fee:
                input.shipping_fee === undefined
                    ? toYuan(Number(row.shipping_fee_cents || 0))
                    : input.shipping_fee,
            shipping_fee_bearer: input.shipping_fee_bearer || row.shipping_fee_bearer,
            self_shipping_fee:
                input.self_shipping_fee === undefined
                    ? toYuan(Number(row.self_shipping_fee_cents || 0))
                    : input.self_shipping_fee,
            merchant_shipping_fee:
                input.merchant_shipping_fee === undefined
                    ? toYuan(Number(row.merchant_shipping_fee_cents || 0))
                    : input.merchant_shipping_fee,
        });
        const logisticsCompanyId =
            input.logistics_company_id === undefined
                ? row.logistics_company_id || null
                : normalizeOptionalId(input.logistics_company_id);
        const logisticsCompanyName =
            input.logistics_company !== undefined
                ? normalizeOptionalText(input.logistics_company)
                : input.logistics_company_id !== undefined
                  ? getLogisticsCompanyName(db, logisticsCompanyId)
                  : row.logistics_company;
        const trackingNo =
            input.tracking_no === undefined
                ? row.tracking_no
                : normalizeOptionalText(input.tracking_no);
        const shippedAt = normalizeDate(input.shipped_at);

        db.prepare(
            `
            UPDATE purchase_returns
            SET goods_status = 'shipped',
                logistics_company_id = @logistics_company_id,
                logistics_company = @logistics_company,
                tracking_no = @tracking_no,
                shipped_at = @shipped_at,
                shipping_fee_cents = @shipping_fee_cents,
                shipping_fee_bearer = @shipping_fee_bearer,
                self_shipping_fee_cents = @self_shipping_fee_cents,
                merchant_shipping_fee_cents = @merchant_shipping_fee_cents,
                note = COALESCE(@note, note),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            logistics_company_id: logisticsCompanyId,
            logistics_company: logisticsCompanyName,
            tracking_no: trackingNo,
            shipped_at: shippedAt,
            shipping_fee_cents: shipping.shippingFeeCents,
            shipping_fee_bearer: shipping.shippingFeeBearer,
            self_shipping_fee_cents: shipping.selfShippingFeeCents,
            merchant_shipping_fee_cents: shipping.merchantShippingFeeCents,
            note: normalizeOptionalText(input.note),
        });
        syncPurchaseReturnLogisticsRecord(db, {
            purchaseReturnId: id,
            logisticsCompanyId,
            trackingNo,
            shipping,
            occurredAt: shippedAt,
        });

        return id;
    });

    return shipReturn();
};

export const confirmPurchaseReturnMerchantReceived = (
    db: SqliteDb,
    id: number,
    input: { merchant_received_at?: string; note?: string | null } = {}
) => {
    const receiveReturn = db.transaction(() => {
        const row = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as
            | PurchaseReturnRow
            | undefined;
        if (!row) throw new Error('PURCHASE_RETURN_NOT_FOUND');
        if (normalizeGoodsStatus(row) !== 'shipped') throw new Error('PURCHASE_RETURN_NOT_SHIPPED');

        db.prepare(
            `
            UPDATE purchase_returns
            SET goods_status = 'merchant_received',
                merchant_received_at = @merchant_received_at,
                note = COALESCE(@note, note),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id,
            merchant_received_at: normalizeDate(input.merchant_received_at),
            note: normalizeOptionalText(input.note),
        });

        return id;
    });

    return receiveReturn();
};

export const cancelPurchaseReturn = (
    db: SqliteDb,
    id: number,
    input: { cancel_reason?: string | null } = {}
) => {
    const cancelReturn = db.transaction(() => {
        const row = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as
            | PurchaseReturnRow
            | undefined;
        if (!row) throw new Error('PURCHASE_RETURN_NOT_FOUND');
        if (normalizeGoodsStatus(row) !== 'pending_shipment') {
            throw new Error('PURCHASE_RETURN_NOT_PENDING');
        }

        const refundCount = db
            .prepare(
                "SELECT COUNT(*) AS count FROM purchase_refunds WHERE purchase_return_id = ? AND status = 'active'"
            )
            .get(id) as { count: number };
        if (Number(refundCount.count || 0) > 0) throw new Error('PURCHASE_RETURN_HAS_REFUNDS');

        const rows = db
            .prepare(
                `
                SELECT pri.inventory_item_id, pri.product_id, ii.status
                FROM purchase_return_items pri
                JOIN inventory_items ii ON ii.id = pri.inventory_item_id
                WHERE pri.purchase_return_id = ?
            `
            )
            .all(id) as Array<{
            inventory_item_id: number;
            product_id: number;
            status: string;
        }>;

        const updateInventory = db.prepare(
            "UPDATE inventory_items SET status = 'in_stock', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'returned'"
        );
        const affectedProductIds = new Set<number>();
        rows.forEach((item) => {
            if (item.status !== 'returned') throw new Error('RETURNED_INVENTORY_CHANGED');
            updateInventory.run(item.inventory_item_id);
            affectedProductIds.add(item.product_id);
        });

        db.prepare(
            `
            UPDATE purchase_returns
            SET goods_status = 'cancelled',
                status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancel_reason = @cancel_reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({ id, cancel_reason: normalizeOptionalText(input.cancel_reason) });

        voidLogisticsRecordForRelated(
            db,
            'purchase_return',
            id,
            'purchase_return',
            input.cancel_reason || '采购退货已取消'
        );
        affectedProductIds.forEach((productId) => recalculateProductStock(db, productId));
        return id;
    });

    return cancelReturn();
};

export const createPurchaseReturnRefund = (
    db: SqliteDb,
    id: number,
    input: {
        amount: number;
        refund_account?: string | null;
        refunded_at?: string;
        note?: string | null;
    }
) => {
    const amountCents = toCents(Number(input.amount || 0));
    if (amountCents <= 0) throw new Error('INVALID_REFUND_AMOUNT');

    const createRefund = db.transaction(() => {
        const row = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id) as
            | PurchaseReturnRow
            | undefined;
        if (!row) throw new Error('PURCHASE_RETURN_NOT_FOUND');
        if (normalizeGoodsStatus(row) === 'cancelled') throw new Error('PURCHASE_RETURN_CANCELLED');

        const summary = getPurchaseReturnSummaryCents(db, row);
        if (summary.pendingRefundCents <= 0) throw new Error('NO_PENDING_REFUND');
        if (amountCents > summary.pendingRefundCents) throw new Error('REFUND_EXCEEDS_PENDING');

        db.prepare(
            `
            INSERT INTO purchase_refunds (
                purchase_order_id, purchase_return_id, amount_cents,
                refund_account, refunded_at, status, note, updated_at
            )
            VALUES (
                @purchase_order_id, @purchase_return_id, @amount_cents,
                @refund_account, @refunded_at, 'active', @note, CURRENT_TIMESTAMP
            )
        `
        ).run({
            purchase_order_id: row.purchase_order_id,
            purchase_return_id: id,
            amount_cents: amountCents,
            refund_account: normalizeOptionalText(input.refund_account),
            refunded_at: normalizeDate(input.refunded_at),
            note: normalizeOptionalText(input.note),
        });

        return id;
    });

    return createRefund();
};

export const voidPurchaseReturnRefund = (
    db: SqliteDb,
    id: number,
    refundId: number,
    input: { void_reason?: string | null } = {}
) => {
    const voidRefund = db.transaction(() => {
        const voidReason = normalizeOptionalText(input.void_reason);
        const refund = db
            .prepare(
                `
                SELECT *
                FROM purchase_refunds
                WHERE id = ?
                  AND purchase_return_id = ?
            `
            )
            .get(refundId, id) as PurchaseRefundRow | undefined;
        if (!refund) throw new Error('PURCHASE_REFUND_NOT_FOUND');
        if (refund.status === 'voided') return id;
        if (!voidReason) throw new Error('VOID_REASON_REQUIRED');

        db.prepare(
            `
            UPDATE purchase_refunds
            SET status = 'voided',
                voided_at = CURRENT_TIMESTAMP,
                void_reason = @void_reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({
            id: refundId,
            void_reason: voidReason,
        });

        return id;
    });

    return voidRefund();
};
