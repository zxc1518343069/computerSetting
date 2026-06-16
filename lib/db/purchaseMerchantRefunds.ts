import type { SqliteDb } from './index';
import { ProductRow, serializeProduct, toCents, toYuan } from './serializers';

export type PurchaseMerchantRefundType = 'rebate' | 'price_protection';
export type PurchaseMerchantRefundStatus = 'pending' | 'partial_settled' | 'settled' | 'voided';
export type PurchaseMerchantRefundSettlementType = 'cash' | 'payable_offset';

interface MerchantRefundRow {
    id: number;
    purchase_order_id: number;
    supplier_id: number;
    type: PurchaseMerchantRefundType;
    status: PurchaseMerchantRefundStatus;
    amount_cents: number;
    settled_amount_cents: number;
    occurred_at: string;
    reason?: string | null;
    note?: string | null;
    voided_at?: string | null;
    void_reason?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier_name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
}

interface MerchantRefundItemRow {
    id: number;
    merchant_refund_id: number;
    purchase_order_item_id?: number | null;
    inbound_order_item_id?: number | null;
    product_id?: number | null;
    quantity: number;
    original_unit_cost_cents?: number | null;
    adjusted_unit_cost_cents?: number | null;
    amount_cents: number;
    note?: string | null;
    created_at?: string;
    p_id?: number | null;
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
}

interface MerchantRefundSettlementRow {
    id: number;
    merchant_refund_id: number;
    settlement_type: PurchaseMerchantRefundSettlementType;
    amount_cents: number;
    account?: string | null;
    settled_at: string;
    status: 'active' | 'voided';
    voided_at?: string | null;
    void_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface InventoryCandidateRow {
    id: number;
    product_id: number;
    inbound_order_id?: number | null;
    inbound_order_item_id?: number | null;
    cost_price_cents: number;
    serial_number?: string | null;
    status: 'in_stock' | 'sold' | 'returned';
    order_inventory_item_id?: number | null;
    order_cost_price_cents?: number | null;
    sales_order_id?: number | null;
    order_no?: string | null;
    customer_name?: string | null;
}

interface NormalizedPriceProtectionItem {
    purchase_order_item_id: number;
    inbound_order_item_id: number;
    product_id: number;
    adjusted_unit_cost_cents: number;
    inventory_items: InventoryCandidateRow[];
    amount_cents: number;
}

export interface MerchantRefundSettlementInput {
    settlement_type: PurchaseMerchantRefundSettlementType;
    amount: number;
    account?: string | null;
    settled_at?: string | null;
    note?: string | null;
}

export interface CreateMerchantRefundInput {
    type: PurchaseMerchantRefundType;
    amount?: number;
    occurred_at?: string | null;
    reason?: string | null;
    note?: string | null;
    rebate_basis_quantity?: number | null;
    settlement?: MerchantRefundSettlementInput | null;
    items?: Array<{
        purchase_order_item_id?: number;
        inbound_order_item_id?: number;
        product_id?: number;
        adjusted_unit_cost?: number;
        inventory_item_ids?: number[];
        note?: string | null;
    }>;
}

const normalizeDate = (value?: string | null) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

const getSettlementSummaryCents = (db: SqliteDb, merchantRefundId: number) => {
    const row = db
        .prepare(
            `
            SELECT COALESCE(SUM(amount_cents), 0) AS settled_amount_cents,
                   COALESCE(SUM(CASE WHEN settlement_type = 'cash' THEN amount_cents ELSE 0 END), 0) AS cash_amount_cents,
                   COALESCE(SUM(CASE WHEN settlement_type = 'payable_offset' THEN amount_cents ELSE 0 END), 0) AS offset_amount_cents
            FROM purchase_merchant_refund_settlements
            WHERE merchant_refund_id = ?
              AND status = 'active'
        `
        )
        .get(merchantRefundId) as Record<string, number>;

    return {
        settledAmountCents: Number(row.settled_amount_cents || 0),
        cashAmountCents: Number(row.cash_amount_cents || 0),
        offsetAmountCents: Number(row.offset_amount_cents || 0),
    };
};

export const getPurchaseMerchantRefundSummaryCents = (db: SqliteDb, purchaseOrderId: number) => {
    const refundRow = db
        .prepare(
            `
            SELECT COALESCE(SUM(amount_cents), 0) AS amount_cents,
                   COALESCE(SUM(CASE WHEN type = 'rebate' THEN amount_cents ELSE 0 END), 0) AS rebate_amount_cents,
                   COALESCE(SUM(CASE WHEN type = 'price_protection' THEN amount_cents ELSE 0 END), 0) AS price_protection_amount_cents
            FROM purchase_merchant_refunds
            WHERE purchase_order_id = ?
              AND status != 'voided'
        `
        )
        .get(purchaseOrderId) as Record<string, number>;

    const settlementRow = db
        .prepare(
            `
            SELECT COALESCE(SUM(pmrs.amount_cents), 0) AS settled_amount_cents,
                   COALESCE(SUM(CASE WHEN pmrs.settlement_type = 'cash' THEN pmrs.amount_cents ELSE 0 END), 0) AS cash_amount_cents,
                   COALESCE(SUM(CASE WHEN pmrs.settlement_type = 'payable_offset' THEN pmrs.amount_cents ELSE 0 END), 0) AS offset_amount_cents
            FROM purchase_merchant_refund_settlements pmrs
            JOIN purchase_merchant_refunds pmr ON pmr.id = pmrs.merchant_refund_id
            WHERE pmr.purchase_order_id = ?
              AND pmr.status != 'voided'
              AND pmrs.status = 'active'
        `
        )
        .get(purchaseOrderId) as Record<string, number>;

    const amountCents = Number(refundRow.amount_cents || 0);
    const settledAmountCents = Number(settlementRow.settled_amount_cents || 0);

    return {
        amountCents,
        settledAmountCents,
        pendingAmountCents: Math.max(amountCents - settledAmountCents, 0),
        cashAmountCents: Number(settlementRow.cash_amount_cents || 0),
        offsetAmountCents: Number(settlementRow.offset_amount_cents || 0),
        rebateAmountCents: Number(refundRow.rebate_amount_cents || 0),
        priceProtectionAmountCents: Number(refundRow.price_protection_amount_cents || 0),
    };
};

const getPurchaseOrderPayableBalanceCents = (db: SqliteDb, purchaseOrderId: number) => {
    const orderFees = db
        .prepare('SELECT misc_fee_cents FROM purchase_orders WHERE id = ?')
        .get(purchaseOrderId) as { misc_fee_cents: number } | undefined;

    const itemRow = db
        .prepare(
            `
            SELECT COALESCE(SUM(received_quantity * purchase_price_cents), 0) AS goods_amount_cents
            FROM purchase_order_items
            WHERE purchase_order_id = ?
        `
        )
        .get(purchaseOrderId) as { goods_amount_cents: number };

    const paymentRow = db
        .prepare(
            `
            SELECT COALESCE(SUM(amount_cents), 0) AS paid_amount_cents
            FROM purchase_payments
            WHERE purchase_order_id = ?
              AND status = 'active'
        `
        )
        .get(purchaseOrderId) as { paid_amount_cents: number };

    const merchantRefundSummary = getPurchaseMerchantRefundSummaryCents(db, purchaseOrderId);
    const payableAmountCents =
        Number(itemRow.goods_amount_cents || 0) + Number(orderFees?.misc_fee_cents || 0);

    return Math.max(
        payableAmountCents -
            Number(paymentRow.paid_amount_cents || 0) -
            merchantRefundSummary.offsetAmountCents,
        0
    );
};

const computeStatus = (
    amountCents: number,
    settledAmountCents: number
): PurchaseMerchantRefundStatus => {
    if (settledAmountCents >= amountCents) return 'settled';
    if (settledAmountCents > 0) return 'partial_settled';
    return 'pending';
};

const syncMerchantRefundStatus = (db: SqliteDb, merchantRefundId: number) => {
    const row = db
        .prepare('SELECT id, amount_cents, status FROM purchase_merchant_refunds WHERE id = ?')
        .get(merchantRefundId) as
        | { id: number; amount_cents: number; status: PurchaseMerchantRefundStatus }
        | undefined;
    if (!row) throw new Error('MERCHANT_REFUND_NOT_FOUND');
    if (row.status === 'voided') return 'voided' as const;

    const settlementSummary = getSettlementSummaryCents(db, merchantRefundId);
    const status = computeStatus(row.amount_cents, settlementSummary.settledAmountCents);

    db.prepare(
        `
        UPDATE purchase_merchant_refunds
        SET status = @status,
            settled_amount_cents = @settled_amount_cents,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    ).run({
        id: merchantRefundId,
        status,
        settled_amount_cents: settlementSummary.settledAmountCents,
    });

    return status;
};

const serializeSettlement = (row: MerchantRefundSettlementRow) => ({
    id: row.id,
    merchant_refund_id: row.merchant_refund_id,
    settlement_type: row.settlement_type,
    amount: toYuan(row.amount_cents),
    account: row.account,
    settled_at: row.settled_at,
    status: row.status,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const getPurchaseMerchantRefundSettlements = (db: SqliteDb, merchantRefundId: number) => {
    const rows = db
        .prepare(
            `
            SELECT *
            FROM purchase_merchant_refund_settlements
            WHERE merchant_refund_id = ?
            ORDER BY settled_at DESC, created_at DESC, id DESC
        `
        )
        .all(merchantRefundId) as MerchantRefundSettlementRow[];

    return rows.map(serializeSettlement);
};

const serializeItem = (row: MerchantRefundItemRow) => ({
    id: row.id,
    merchant_refund_id: row.merchant_refund_id,
    purchase_order_item_id: row.purchase_order_item_id,
    inbound_order_item_id: row.inbound_order_item_id,
    product_id: row.product_id,
    quantity: row.quantity,
    original_unit_cost:
        row.original_unit_cost_cents === null || row.original_unit_cost_cents === undefined
            ? null
            : toYuan(row.original_unit_cost_cents),
    adjusted_unit_cost:
        row.adjusted_unit_cost_cents === null || row.adjusted_unit_cost_cents === undefined
            ? null
            : toYuan(row.adjusted_unit_cost_cents),
    amount: toYuan(row.amount_cents),
    note: row.note,
    created_at: row.created_at,
    product:
        row.p_id && row.category && row.name
            ? serializeProduct({
                  id: row.p_id,
                  category: row.category,
                  category_id: row.category_id,
                  category_name: row.category_name,
                  category_label: row.category_label,
                  category_tag_color: row.category_tag_color,
                  name: row.name,
                  barcode: row.barcode,
                  price_cents: row.price_cents || 0,
                  stock_quantity: row.stock_quantity || 0,
                  selling_price_cents: row.selling_price_cents ?? null,
                  is_use_premium: row.is_use_premium ?? 1,
              } as ProductRow)
            : undefined,
});

export const getPurchaseMerchantRefundItems = (db: SqliteDb, merchantRefundId: number) => {
    const rows = db
        .prepare(
            `
            SELECT pmri.*,
                   p.id AS p_id, p.category, p.category_id, pc.name AS category_name,
                   pc.label AS category_label, pc.tag_color AS category_tag_color,
                   p.name, p.barcode, p.price_cents, p.stock_quantity,
                   p.selling_price_cents, p.is_use_premium
            FROM purchase_merchant_refund_items pmri
            LEFT JOIN products p ON p.id = pmri.product_id
            LEFT JOIN product_categories pc ON pc.id = p.category_id
            WHERE pmri.merchant_refund_id = ?
            ORDER BY pmri.id ASC
        `
        )
        .all(merchantRefundId) as MerchantRefundItemRow[];

    return rows.map(serializeItem);
};

const serializeMerchantRefund = (db: SqliteDb, row: MerchantRefundRow) => {
    const settlementSummary = getSettlementSummaryCents(db, row.id);
    const status =
        row.status === 'voided'
            ? row.status
            : computeStatus(row.amount_cents, settlementSummary.settledAmountCents);

    return {
        id: row.id,
        purchase_order_id: row.purchase_order_id,
        supplier_id: row.supplier_id,
        type: row.type,
        status,
        amount: toYuan(row.amount_cents),
        settled_amount: toYuan(settlementSummary.settledAmountCents),
        pending_amount: toYuan(
            Math.max(row.amount_cents - settlementSummary.settledAmountCents, 0)
        ),
        cash_amount: toYuan(settlementSummary.cashAmountCents),
        offset_amount: toYuan(settlementSummary.offsetAmountCents),
        occurred_at: row.occurred_at,
        reason: row.reason,
        note: row.note,
        voided_at: row.voided_at,
        void_reason: row.void_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
        supplier: row.supplier_name
            ? {
                  id: row.supplier_id,
                  name: row.supplier_name,
                  contact_name: row.contact_name,
                  phone: row.phone,
              }
            : undefined,
        items: getPurchaseMerchantRefundItems(db, row.id),
        settlements: getPurchaseMerchantRefundSettlements(db, row.id),
    };
};

export const listPurchaseMerchantRefunds = (
    db: SqliteDb,
    filters: {
        purchaseOrderId?: number;
        supplierId?: number;
        pendingOnly?: boolean;
    } = {}
) => {
    const conditions: string[] = [];
    const params: Record<string, number> = {};

    if (filters.purchaseOrderId) {
        conditions.push('pmr.purchase_order_id = @purchaseOrderId');
        params.purchaseOrderId = filters.purchaseOrderId;
    }
    if (filters.supplierId) {
        conditions.push('pmr.supplier_id = @supplierId');
        params.supplierId = filters.supplierId;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT pmr.*, s.name AS supplier_name, s.contact_name, s.phone
            FROM purchase_merchant_refunds pmr
            LEFT JOIN suppliers s ON s.id = pmr.supplier_id
            ${where}
            ORDER BY pmr.occurred_at DESC, pmr.created_at DESC, pmr.id DESC
        `
        )
        .all(params) as MerchantRefundRow[];

    const refunds = rows.map((row) => serializeMerchantRefund(db, row));
    if (filters.pendingOnly) {
        return refunds.filter((item) => item.status !== 'voided' && item.pending_amount > 0);
    }
    return refunds;
};

export const getPurchaseMerchantRefundById = (db: SqliteDb, merchantRefundId: number) => {
    const row = db
        .prepare(
            `
            SELECT pmr.*, s.name AS supplier_name, s.contact_name, s.phone
            FROM purchase_merchant_refunds pmr
            LEFT JOIN suppliers s ON s.id = pmr.supplier_id
            WHERE pmr.id = ?
        `
        )
        .get(merchantRefundId) as MerchantRefundRow | undefined;

    return row ? serializeMerchantRefund(db, row) : null;
};

const getInventoryCandidates = (db: SqliteDb, inventoryItemIds: number[]) => {
    if (inventoryItemIds.length === 0) return [];

    return db
        .prepare(
            `
            SELECT ii.*,
                   oii.id AS order_inventory_item_id,
                   oii.cost_price_cents AS order_cost_price_cents,
                   oii.order_id AS sales_order_id,
                   so.order_no,
                   so.customer_name
            FROM inventory_items ii
            LEFT JOIN order_inventory_items oii ON oii.inventory_item_id = ii.id
            LEFT JOIN sales_orders so ON so.id = oii.order_id
            WHERE ii.id IN (${inventoryItemIds.map(() => '?').join(',')})
            ORDER BY ii.id ASC
        `
        )
        .all(...inventoryItemIds) as InventoryCandidateRow[];
};

const recalculateSalesOrders = (db: SqliteDb, salesOrderIds: Set<number>) => {
    const getCost = db.prepare(
        `
        SELECT COALESCE(SUM(cost_price_cents), 0) AS cost_amount_cents
        FROM order_inventory_items
        WHERE order_id = ?
    `
    );
    const getOrder = db.prepare('SELECT final_amount_cents FROM sales_orders WHERE id = ?');
    const updateOrder = db.prepare(
        `
        UPDATE sales_orders
        SET cost_amount_cents = @cost_amount_cents,
            profit_amount_cents = @profit_amount_cents,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    );

    salesOrderIds.forEach((salesOrderId) => {
        const order = getOrder.get(salesOrderId) as { final_amount_cents: number } | undefined;
        if (!order) return;
        const cost = getCost.get(salesOrderId) as { cost_amount_cents: number };
        const costAmountCents = Number(cost.cost_amount_cents || 0);
        updateOrder.run({
            id: salesOrderId,
            cost_amount_cents: costAmountCents,
            profit_amount_cents: Number(order.final_amount_cents || 0) - costAmountCents,
        });
    });
};

const normalizePriceProtectionItems = (
    db: SqliteDb,
    purchaseOrderId: number,
    items: CreateMerchantRefundInput['items']
): NormalizedPriceProtectionItem[] => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('PRICE_PROTECTION_ITEMS_REQUIRED');
    }

    const seenInventoryIds = new Set<number>();
    const normalized: NormalizedPriceProtectionItem[] = [];

    for (const item of items) {
        const purchaseOrderItemId = Number(item.purchase_order_item_id || 0);
        const inboundOrderItemId = Number(item.inbound_order_item_id || 0);
        const adjustedUnitCostCents = toCents(Number(item.adjusted_unit_cost ?? NaN));
        const inventoryItemIds = (item.inventory_item_ids || []).map(Number).filter(Boolean);

        if (!purchaseOrderItemId || !inboundOrderItemId || inventoryItemIds.length === 0) {
            throw new Error('PRICE_PROTECTION_ITEMS_REQUIRED');
        }
        if (adjustedUnitCostCents < 0) throw new Error('INVALID_ADJUSTED_UNIT_COST');

        for (const inventoryItemId of inventoryItemIds) {
            if (seenInventoryIds.has(inventoryItemId)) throw new Error('DUPLICATE_INVENTORY_ITEM');
            seenInventoryIds.add(inventoryItemId);
        }

        const orderItem = db
            .prepare(
                `
                SELECT poi.id AS purchase_order_item_id,
                       poi.product_id,
                       ioi.id AS inbound_order_item_id
                FROM purchase_order_items poi
                JOIN inbound_order_items ioi ON ioi.purchase_order_item_id = poi.id
                WHERE poi.id = ?
                  AND ioi.id = ?
                  AND poi.purchase_order_id = ?
            `
            )
            .get(purchaseOrderItemId, inboundOrderItemId, purchaseOrderId) as
            | { purchase_order_item_id: number; product_id: number; inbound_order_item_id: number }
            | undefined;
        if (!orderItem) throw new Error('PRICE_PROTECTION_ITEM_NOT_FOUND');

        const inventoryRows = getInventoryCandidates(db, inventoryItemIds);
        if (inventoryRows.length !== inventoryItemIds.length) {
            throw new Error('INVENTORY_ITEM_NOT_FOUND');
        }

        let amountCents = 0;
        for (const inventoryItem of inventoryRows) {
            if (Number(inventoryItem.inbound_order_item_id) !== inboundOrderItemId) {
                throw new Error('INVENTORY_ITEM_NOT_IN_BATCH');
            }
            if (Number(inventoryItem.product_id) !== Number(orderItem.product_id)) {
                throw new Error('INVENTORY_PRODUCT_MISMATCH');
            }
            if (inventoryItem.status === 'returned') throw new Error('RETURNED_INVENTORY_ITEM');
            if (inventoryItem.status === 'sold' && !inventoryItem.order_inventory_item_id) {
                throw new Error('SOLD_INVENTORY_BINDING_NOT_FOUND');
            }
            if (adjustedUnitCostCents >= Number(inventoryItem.cost_price_cents || 0)) {
                throw new Error('ADJUSTED_COST_NOT_LOWER');
            }
            amountCents += Number(inventoryItem.cost_price_cents || 0) - adjustedUnitCostCents;
        }

        normalized.push({
            purchase_order_item_id: purchaseOrderItemId,
            inbound_order_item_id: inboundOrderItemId,
            product_id: Number(orderItem.product_id),
            adjusted_unit_cost_cents: adjustedUnitCostCents,
            inventory_items: inventoryRows,
            amount_cents: amountCents,
        });
    }

    return normalized;
};

const insertSettlement = (
    db: SqliteDb,
    merchantRefundId: number,
    purchaseOrderId: number,
    pendingAmountCents: number,
    input?: MerchantRefundSettlementInput | null
) => {
    if (!input) return;

    const settlementType = input.settlement_type;
    if (!['cash', 'payable_offset'].includes(settlementType)) {
        throw new Error('INVALID_SETTLEMENT_TYPE');
    }

    const amountCents = toCents(Number(input.amount || 0));
    if (amountCents <= 0) throw new Error('INVALID_SETTLEMENT_AMOUNT');
    if (amountCents > pendingAmountCents) throw new Error('SETTLEMENT_EXCEEDS_PENDING');

    if (settlementType === 'payable_offset') {
        const payableBalanceCents = getPurchaseOrderPayableBalanceCents(db, purchaseOrderId);
        if (amountCents > payableBalanceCents) throw new Error('OFFSET_EXCEEDS_PAYABLE');
    }

    db.prepare(
        `
        INSERT INTO purchase_merchant_refund_settlements (
            merchant_refund_id, settlement_type, amount_cents, account,
            settled_at, status, note, updated_at
        )
        VALUES (
            @merchant_refund_id, @settlement_type, @amount_cents, @account,
            @settled_at, 'active', @note, CURRENT_TIMESTAMP
        )
    `
    ).run({
        merchant_refund_id: merchantRefundId,
        settlement_type: settlementType,
        amount_cents: amountCents,
        account: input.account || null,
        settled_at: normalizeDate(input.settled_at),
        note: input.note || null,
    });

    syncMerchantRefundStatus(db, merchantRefundId);
};

export const createPurchaseMerchantRefund = (
    db: SqliteDb,
    purchaseOrderId: number,
    input: CreateMerchantRefundInput
) => {
    const create = db.transaction(() => {
        const order = db
            .prepare('SELECT * FROM purchase_orders WHERE id = ?')
            .get(purchaseOrderId) as Record<string, unknown> | undefined;
        if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
        if (order.status === 'cancelled') throw new Error('PURCHASE_ORDER_CANCELLED');

        const type = input.type;
        if (!['rebate', 'price_protection'].includes(type)) {
            throw new Error('INVALID_MERCHANT_REFUND_TYPE');
        }

        let amountCents = 0;
        let normalizedPriceProtectionItems: NormalizedPriceProtectionItem[] = [];

        if (type === 'rebate') {
            amountCents = toCents(Number(input.amount || 0));
            if (amountCents <= 0) throw new Error('INVALID_MERCHANT_REFUND_AMOUNT');
        } else {
            normalizedPriceProtectionItems = normalizePriceProtectionItems(
                db,
                purchaseOrderId,
                input.items
            );
            amountCents = normalizedPriceProtectionItems.reduce(
                (sum, item) => sum + item.amount_cents,
                0
            );
            if (amountCents <= 0) throw new Error('INVALID_MERCHANT_REFUND_AMOUNT');
        }

        const refundResult = db
            .prepare(
                `
                INSERT INTO purchase_merchant_refunds (
                    purchase_order_id, supplier_id, type, status, amount_cents,
                    settled_amount_cents, occurred_at, reason, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @supplier_id, @type, 'pending', @amount_cents,
                    0, @occurred_at, @reason, @note, CURRENT_TIMESTAMP
                )
            `
            )
            .run({
                purchase_order_id: purchaseOrderId,
                supplier_id: Number(order.supplier_id),
                type,
                amount_cents: amountCents,
                occurred_at: normalizeDate(input.occurred_at),
                reason: input.reason || null,
                note: input.note || null,
            });

        const merchantRefundId = Number(refundResult.lastInsertRowid);
        const insertItemStmt = db.prepare(
            `
            INSERT INTO purchase_merchant_refund_items (
                merchant_refund_id, purchase_order_item_id, inbound_order_item_id,
                product_id, quantity, original_unit_cost_cents, adjusted_unit_cost_cents,
                amount_cents, note
            )
            VALUES (
                @merchant_refund_id, @purchase_order_item_id, @inbound_order_item_id,
                @product_id, @quantity, @original_unit_cost_cents, @adjusted_unit_cost_cents,
                @amount_cents, @note
            )
        `
        );

        if (type === 'rebate' && input.items?.length) {
            input.items.forEach((item) => {
                insertItemStmt.run({
                    merchant_refund_id: merchantRefundId,
                    purchase_order_item_id: item.purchase_order_item_id || null,
                    inbound_order_item_id: item.inbound_order_item_id || null,
                    product_id: item.product_id || null,
                    quantity: Number(input.rebate_basis_quantity || 0),
                    original_unit_cost_cents: null,
                    adjusted_unit_cost_cents: null,
                    amount_cents: 0,
                    note: item.note || null,
                });
            });
        }

        const insertImpactStmt = db.prepare(
            `
            INSERT INTO purchase_merchant_refund_inventory_items (
                merchant_refund_item_id, inventory_item_id, inventory_status_at_adjustment,
                order_inventory_item_id, sales_order_id, old_cost_price_cents,
                new_cost_price_cents, old_order_cost_price_cents, new_order_cost_price_cents
            )
            VALUES (
                @merchant_refund_item_id, @inventory_item_id, @inventory_status_at_adjustment,
                @order_inventory_item_id, @sales_order_id, @old_cost_price_cents,
                @new_cost_price_cents, @old_order_cost_price_cents, @new_order_cost_price_cents
            )
        `
        );
        const updateInventoryStmt = db.prepare(
            'UPDATE inventory_items SET cost_price_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        const updateOrderInventoryStmt = db.prepare(
            'UPDATE order_inventory_items SET cost_price_cents = ? WHERE id = ?'
        );
        const affectedSalesOrderIds = new Set<number>();

        normalizedPriceProtectionItems.forEach((item) => {
            const originalUnitCostCents = item.inventory_items[0]?.cost_price_cents ?? null;
            const itemResult = insertItemStmt.run({
                merchant_refund_id: merchantRefundId,
                purchase_order_item_id: item.purchase_order_item_id,
                inbound_order_item_id: item.inbound_order_item_id,
                product_id: item.product_id,
                quantity: item.inventory_items.length,
                original_unit_cost_cents: originalUnitCostCents,
                adjusted_unit_cost_cents: item.adjusted_unit_cost_cents,
                amount_cents: item.amount_cents,
                note: null,
            });
            const merchantRefundItemId = Number(itemResult.lastInsertRowid);

            item.inventory_items.forEach((inventoryItem) => {
                const orderInventoryItemId = inventoryItem.order_inventory_item_id || null;
                const salesOrderId = inventoryItem.sales_order_id || null;
                insertImpactStmt.run({
                    merchant_refund_item_id: merchantRefundItemId,
                    inventory_item_id: inventoryItem.id,
                    inventory_status_at_adjustment: inventoryItem.status,
                    order_inventory_item_id: orderInventoryItemId,
                    sales_order_id: salesOrderId,
                    old_cost_price_cents: inventoryItem.cost_price_cents,
                    new_cost_price_cents: item.adjusted_unit_cost_cents,
                    old_order_cost_price_cents: inventoryItem.order_cost_price_cents ?? null,
                    new_order_cost_price_cents: orderInventoryItemId
                        ? item.adjusted_unit_cost_cents
                        : null,
                });
                updateInventoryStmt.run(item.adjusted_unit_cost_cents, inventoryItem.id);
                if (orderInventoryItemId) {
                    updateOrderInventoryStmt.run(
                        item.adjusted_unit_cost_cents,
                        orderInventoryItemId
                    );
                }
                if (salesOrderId) affectedSalesOrderIds.add(Number(salesOrderId));
            });
        });

        recalculateSalesOrders(db, affectedSalesOrderIds);
        insertSettlement(db, merchantRefundId, purchaseOrderId, amountCents, input.settlement);
        syncMerchantRefundStatus(db, merchantRefundId);

        return merchantRefundId;
    });

    const merchantRefundId = create();
    return getPurchaseMerchantRefundById(db, merchantRefundId);
};

export const createPurchaseMerchantRefundSettlement = (
    db: SqliteDb,
    merchantRefundId: number,
    input: MerchantRefundSettlementInput
) => {
    const create = db.transaction(() => {
        const row = db
            .prepare('SELECT * FROM purchase_merchant_refunds WHERE id = ?')
            .get(merchantRefundId) as MerchantRefundRow | undefined;
        if (!row) throw new Error('MERCHANT_REFUND_NOT_FOUND');
        if (row.status === 'voided') throw new Error('MERCHANT_REFUND_VOIDED');

        const settlementSummary = getSettlementSummaryCents(db, merchantRefundId);
        const pendingAmountCents = Math.max(
            row.amount_cents - settlementSummary.settledAmountCents,
            0
        );
        if (pendingAmountCents <= 0) throw new Error('NO_PENDING_SETTLEMENT');

        insertSettlement(db, merchantRefundId, row.purchase_order_id, pendingAmountCents, input);
        return merchantRefundId;
    });

    const id = create();
    return getPurchaseMerchantRefundById(db, id);
};

export const voidPurchaseMerchantRefundSettlement = (
    db: SqliteDb,
    merchantRefundId: number,
    settlementId: number,
    input: { void_reason?: string | null }
) => {
    const voidSettlement = db.transaction(() => {
        const reason = input.void_reason?.trim();
        if (!reason) throw new Error('VOID_REASON_REQUIRED');

        const row = db
            .prepare(
                `
                SELECT pmrs.*
                FROM purchase_merchant_refund_settlements pmrs
                JOIN purchase_merchant_refunds pmr ON pmr.id = pmrs.merchant_refund_id
                WHERE pmrs.id = ?
                  AND pmrs.merchant_refund_id = ?
            `
            )
            .get(settlementId, merchantRefundId) as MerchantRefundSettlementRow | undefined;
        if (!row) throw new Error('SETTLEMENT_NOT_FOUND');
        if (row.status === 'voided') return merchantRefundId;

        db.prepare(
            `
            UPDATE purchase_merchant_refund_settlements
            SET status = 'voided',
                voided_at = CURRENT_TIMESTAMP,
                void_reason = @void_reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({ id: settlementId, void_reason: reason });

        syncMerchantRefundStatus(db, merchantRefundId);
        return merchantRefundId;
    });

    const id = voidSettlement();
    return getPurchaseMerchantRefundById(db, id);
};

export const voidPurchaseMerchantRefund = (
    db: SqliteDb,
    merchantRefundId: number,
    input: { void_reason?: string | null }
) => {
    const voidRefund = db.transaction(() => {
        const reason = input.void_reason?.trim();
        if (!reason) throw new Error('VOID_REASON_REQUIRED');

        const refund = db
            .prepare('SELECT * FROM purchase_merchant_refunds WHERE id = ?')
            .get(merchantRefundId) as MerchantRefundRow | undefined;
        if (!refund) throw new Error('MERCHANT_REFUND_NOT_FOUND');
        if (refund.status === 'voided') return merchantRefundId;

        const settlementSummary = getSettlementSummaryCents(db, merchantRefundId);
        if (settlementSummary.settledAmountCents > 0) throw new Error('HAS_ACTIVE_SETTLEMENTS');

        const impacts = db
            .prepare(
                `
                SELECT pmrii.*
                FROM purchase_merchant_refund_inventory_items pmrii
                JOIN purchase_merchant_refund_items pmri ON pmri.id = pmrii.merchant_refund_item_id
                WHERE pmri.merchant_refund_id = ?
                ORDER BY pmrii.id ASC
            `
            )
            .all(merchantRefundId) as Array<{
            inventory_item_id: number;
            order_inventory_item_id?: number | null;
            sales_order_id?: number | null;
            old_cost_price_cents: number;
            old_order_cost_price_cents?: number | null;
        }>;

        const newerImpactStmt = db.prepare(
            `
            SELECT COUNT(*) AS count
            FROM purchase_merchant_refund_inventory_items pmrii
            JOIN purchase_merchant_refund_items pmri ON pmri.id = pmrii.merchant_refund_item_id
            JOIN purchase_merchant_refunds pmr ON pmr.id = pmri.merchant_refund_id
            WHERE pmrii.inventory_item_id = ?
              AND pmr.status != 'voided'
              AND pmr.id > ?
        `
        );
        impacts.forEach((impact) => {
            const newer = newerImpactStmt.get(impact.inventory_item_id, merchantRefundId) as {
                count: number;
            };
            if (Number(newer.count || 0) > 0) throw new Error('HAS_NEWER_PRICE_PROTECTION');
        });

        const updateInventoryStmt = db.prepare(
            'UPDATE inventory_items SET cost_price_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        const updateOrderInventoryStmt = db.prepare(
            'UPDATE order_inventory_items SET cost_price_cents = ? WHERE id = ?'
        );
        const affectedSalesOrderIds = new Set<number>();

        impacts.forEach((impact) => {
            updateInventoryStmt.run(impact.old_cost_price_cents, impact.inventory_item_id);
            if (impact.order_inventory_item_id) {
                updateOrderInventoryStmt.run(
                    impact.old_order_cost_price_cents ?? impact.old_cost_price_cents,
                    impact.order_inventory_item_id
                );
            }
            if (impact.sales_order_id) affectedSalesOrderIds.add(Number(impact.sales_order_id));
        });

        recalculateSalesOrders(db, affectedSalesOrderIds);

        db.prepare(
            `
            UPDATE purchase_merchant_refunds
            SET status = 'voided',
                voided_at = CURRENT_TIMESTAMP,
                void_reason = @void_reason,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        ).run({ id: merchantRefundId, void_reason: reason });

        return merchantRefundId;
    });

    const id = voidRefund();
    return getPurchaseMerchantRefundById(db, id);
};

export const getPurchaseMerchantRefundContext = (db: SqliteDb, purchaseOrderId: number) => {
    const purchaseOrder = db
        .prepare(
            `
            SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.id = ?
        `
        )
        .get(purchaseOrderId) as
        | (Record<string, unknown> & {
              supplier_id: number;
              supplier_name?: string | null;
              contact_name?: string | null;
              phone?: string | null;
          })
        | undefined;
    if (!purchaseOrder) return null;

    const groupRows = db
        .prepare(
            `
            SELECT poi.id AS purchase_order_item_id,
                   ioi.id AS inbound_order_item_id,
                   ioi.quantity AS inbound_quantity,
                   ioi.purchase_price_cents,
                   ioi.serial_tracking_enabled,
                   p.id AS p_id, p.category, p.category_id, pc.name AS category_name,
                   pc.label AS category_label, pc.tag_color AS category_tag_color,
                   p.name, p.barcode, p.price_cents, p.stock_quantity,
                   p.selling_price_cents, p.is_use_premium,
                   COALESCE(SUM(CASE WHEN ii.status = 'in_stock' THEN 1 ELSE 0 END), 0) AS in_stock_quantity,
                   COALESCE(SUM(CASE WHEN ii.status = 'sold' THEN 1 ELSE 0 END), 0) AS sold_quantity,
                   COALESCE(SUM(CASE WHEN ii.status = 'returned' THEN 1 ELSE 0 END), 0) AS returned_quantity
            FROM purchase_order_items poi
            JOIN inbound_order_items ioi ON ioi.purchase_order_item_id = poi.id
            JOIN products p ON p.id = poi.product_id
            LEFT JOIN product_categories pc ON pc.id = p.category_id
            LEFT JOIN inventory_items ii ON ii.inbound_order_item_id = ioi.id
            WHERE poi.purchase_order_id = ?
            GROUP BY ioi.id
            ORDER BY ioi.id ASC
        `
        )
        .all(purchaseOrderId) as Array<Record<string, unknown>>;

    const inventoryStmt = db.prepare(
        `
        SELECT ii.id, ii.product_id, ii.cost_price_cents, ii.serial_number, ii.status,
               ii.inbound_order_id, ii.inbound_order_item_id,
               oii.id AS order_inventory_item_id,
               oii.cost_price_cents AS order_cost_price_cents,
               oii.order_id AS sales_order_id,
               so.order_no,
               so.customer_name
        FROM inventory_items ii
        LEFT JOIN order_inventory_items oii ON oii.inventory_item_id = ii.id
        LEFT JOIN sales_orders so ON so.id = oii.order_id
        WHERE ii.inbound_order_item_id = ?
        ORDER BY CASE ii.status WHEN 'returned' THEN 2 WHEN 'sold' THEN 1 ELSE 0 END, ii.id ASC
    `
    );

    return {
        purchase_order: {
            id: purchaseOrderId,
            supplier_id: purchaseOrder.supplier_id,
            status: purchaseOrder.status,
        },
        supplier: purchaseOrder.supplier_name
            ? {
                  id: purchaseOrder.supplier_id,
                  name: purchaseOrder.supplier_name,
                  contact_name: purchaseOrder.contact_name,
                  phone: purchaseOrder.phone,
              }
            : undefined,
        payable_balance: toYuan(getPurchaseOrderPayableBalanceCents(db, purchaseOrderId)),
        merchant_refund_summary: (() => {
            const summary = getPurchaseMerchantRefundSummaryCents(db, purchaseOrderId);
            return {
                amount: toYuan(summary.amountCents),
                settled_amount: toYuan(summary.settledAmountCents),
                pending_amount: toYuan(summary.pendingAmountCents),
                cash_amount: toYuan(summary.cashAmountCents),
                offset_amount: toYuan(summary.offsetAmountCents),
                rebate_amount: toYuan(summary.rebateAmountCents),
                price_protection_amount: toYuan(summary.priceProtectionAmountCents),
            };
        })(),
        groups: groupRows.map((row) => ({
            purchase_order_item_id: Number(row.purchase_order_item_id),
            inbound_order_item_id: Number(row.inbound_order_item_id),
            product_id: Number(row.p_id),
            purchase_price: toYuan(Number(row.purchase_price_cents || 0)),
            serial_tracking_enabled: Boolean(row.serial_tracking_enabled),
            inbound_quantity: Number(row.inbound_quantity || 0),
            in_stock_quantity: Number(row.in_stock_quantity || 0),
            sold_quantity: Number(row.sold_quantity || 0),
            returned_quantity: Number(row.returned_quantity || 0),
            product: serializeProduct({
                id: Number(row.p_id),
                category: String(row.category || ''),
                category_id: row.category_id as number | null,
                category_name: row.category_name as string | null,
                category_label: row.category_label as string | null,
                category_tag_color: row.category_tag_color as string | null,
                name: String(row.name || ''),
                barcode: row.barcode as string | null,
                price_cents: Number(row.price_cents || 0),
                stock_quantity: Number(row.stock_quantity || 0),
                selling_price_cents: row.selling_price_cents as number | null,
                is_use_premium: Number(row.is_use_premium ?? 1),
            } as ProductRow),
            inventory_items: (
                inventoryStmt.all(row.inbound_order_item_id) as InventoryCandidateRow[]
            ).map((item) => ({
                id: item.id,
                product_id: item.product_id,
                inbound_order_id: item.inbound_order_id,
                inbound_order_item_id: item.inbound_order_item_id,
                cost_price: toYuan(item.cost_price_cents),
                serial_number: item.serial_number,
                status: item.status,
                selectable: item.status !== 'returned',
                sales_order_id: item.sales_order_id,
                order_no: item.order_no,
                customer_name: item.customer_name,
            })),
        })),
    };
};
