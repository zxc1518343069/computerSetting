import type { SqliteDb } from './index';
import { listInboundOrders } from './inboundOrders';
import { getLogisticsRecordByRelated } from './logistics';
import { listPurchaseReturns } from './purchaseReturns';
import { ProductRow, serializeProduct, toYuan } from './serializers';

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial_inbound' | 'inbound' | 'cancelled';

export const purchaseOrderStatuses: PurchaseOrderStatus[] = [
    'draft',
    'ordered',
    'partial_inbound',
    'inbound',
    'cancelled',
];

export const normalizePurchaseOrderStatus = (value: unknown): PurchaseOrderStatus | null => {
    if (value === 'completed') return 'inbound';
    return isPurchaseOrderStatus(value) ? value : null;
};

export const isPurchaseOrderStatus = (value: unknown): value is PurchaseOrderStatus =>
    typeof value === 'string' && purchaseOrderStatuses.includes(value as PurchaseOrderStatus);

interface PurchaseOrderRow {
    id: number;
    supplier_id: number;
    status: PurchaseOrderStatus;
    ordered_at: string;
    expected_inbound_at?: string | null;
    shipping_fee_cents: number;
    misc_fee_cents: number;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier_name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    supplier_note?: string | null;
}

interface PurchaseOrderItemRow {
    id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    received_quantity: number;
    purchase_price_cents: number;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    p_id: number;
    category: string;
    name: string;
    barcode?: string | null;
    price_cents: number;
    stock_quantity: number;
    selling_price_cents: number | null;
    is_use_premium: number;
    product_created_at?: string;
    product_updated_at?: string;
}

interface PurchasePaymentRow {
    id: number;
    purchase_order_id: number;
    amount_cents: number;
    payment_account?: string | null;
    paid_at: string;
    status: 'active' | 'voided';
    voided_at?: string | null;
    void_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
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

interface SummaryCents {
    lineCount: number;
    totalOrderedQuantity: number;
    totalReceivedQuantity: number;
    totalRemainingQuantity: number;
    goodsAmountCents: number;
    returnAmountCents: number;
    payableAmountCents: number;
    paidAmountCents: number;
    refundedAmountCents: number;
    netPaidCents: number;
    pendingPaymentCents: number;
    pendingRefundCents: number;
    paymentStatus: 'unpaid' | 'partial_paid' | 'settled';
}

export const getPurchaseOrderSummaryCents = (
    db: SqliteDb,
    purchaseOrderId: number,
    fees?: { shipping_fee_cents: number; misc_fee_cents: number }
): SummaryCents => {
    const orderFees =
        fees ||
        (db
            .prepare('SELECT shipping_fee_cents, misc_fee_cents FROM purchase_orders WHERE id = ?')
            .get(purchaseOrderId) as
            | { shipping_fee_cents: number; misc_fee_cents: number }
            | undefined);

    const itemSummary = db
        .prepare(
            `
            SELECT COUNT(*) AS line_count,
                   COALESCE(SUM(ordered_quantity), 0) AS total_ordered_quantity,
                   COALESCE(SUM(received_quantity), 0) AS total_received_quantity,
                   COALESCE(SUM(received_quantity * purchase_price_cents), 0) AS goods_amount_cents
            FROM purchase_order_items
            WHERE purchase_order_id = ?
        `
        )
        .get(purchaseOrderId) as Record<string, number>;

    const paymentSummary = db
        .prepare(
            `
            SELECT COALESCE(SUM(amount_cents), 0) AS paid_amount_cents
            FROM purchase_payments
            WHERE purchase_order_id = ? AND status = 'active'
        `
        )
        .get(purchaseOrderId) as { paid_amount_cents: number };

    const goodsAmountCents = Number(itemSummary.goods_amount_cents || 0);
    const payableAmountCents = Math.max(
        goodsAmountCents + Number(orderFees?.misc_fee_cents || 0),
        0
    );
    const paidAmountCents = Number(paymentSummary.paid_amount_cents || 0);
    const returnAmountCents = 0;
    const refundedAmountCents = 0;
    const netPaidCents = paidAmountCents;
    const pendingPaymentCents = Math.max(payableAmountCents - netPaidCents, 0);
    const pendingRefundCents = 0;

    let paymentStatus: SummaryCents['paymentStatus'] = 'unpaid';
    if (payableAmountCents === 0 || netPaidCents >= payableAmountCents) {
        paymentStatus = 'settled';
    } else if (netPaidCents > 0) {
        paymentStatus = 'partial_paid';
    }

    const totalOrderedQuantity = Number(itemSummary.total_ordered_quantity || 0);
    const totalReceivedQuantity = Number(itemSummary.total_received_quantity || 0);

    return {
        lineCount: Number(itemSummary.line_count || 0),
        totalOrderedQuantity,
        totalReceivedQuantity,
        totalRemainingQuantity: Math.max(totalOrderedQuantity - totalReceivedQuantity, 0),
        goodsAmountCents,
        returnAmountCents,
        payableAmountCents,
        paidAmountCents,
        refundedAmountCents,
        netPaidCents,
        pendingPaymentCents,
        pendingRefundCents,
        paymentStatus,
    };
};

export const recalculatePurchaseOrderStatus = (
    db: SqliteDb,
    purchaseOrderId: number
): PurchaseOrderStatus => {
    const order = db
        .prepare('SELECT status FROM purchase_orders WHERE id = ?')
        .get(purchaseOrderId) as { status: PurchaseOrderStatus } | undefined;
    if (!order) throw new Error('PURCHASE_ORDER_NOT_FOUND');
    if (order.status === 'cancelled') return 'cancelled';

    const summary = getPurchaseOrderSummaryCents(db, purchaseOrderId);
    let nextStatus: PurchaseOrderStatus = order.status === 'draft' ? 'draft' : 'ordered';

    if (
        summary.totalOrderedQuantity > 0 &&
        summary.totalReceivedQuantity >= summary.totalOrderedQuantity
    ) {
        nextStatus = 'inbound';
    } else if (summary.totalReceivedQuantity > 0) {
        nextStatus = 'partial_inbound';
    }

    db.prepare(
        'UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nextStatus, purchaseOrderId);

    return nextStatus;
};

const serializeSummary = (summary: SummaryCents) => ({
    line_count: summary.lineCount,
    total_ordered_quantity: summary.totalOrderedQuantity,
    total_received_quantity: summary.totalReceivedQuantity,
    total_remaining_quantity: summary.totalRemainingQuantity,
    goods_amount: toYuan(summary.goodsAmountCents),
    return_amount: toYuan(summary.returnAmountCents),
    payable_amount: toYuan(summary.payableAmountCents),
    paid_amount: toYuan(summary.paidAmountCents),
    refunded_amount: toYuan(summary.refundedAmountCents),
    net_paid: toYuan(summary.netPaidCents),
    pending_payment: toYuan(summary.pendingPaymentCents),
    pending_refund: toYuan(summary.pendingRefundCents),
    payment_status: summary.paymentStatus,
});

const serializePayment = (row: PurchasePaymentRow) => ({
    id: row.id,
    purchase_order_id: row.purchase_order_id,
    amount: toYuan(row.amount_cents),
    payment_account: row.payment_account,
    paid_at: row.paid_at,
    status: row.status,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const getPurchaseOrderPayments = (db: SqliteDb, purchaseOrderId: number) => {
    const rows = db
        .prepare(
            `
            SELECT *
            FROM purchase_payments
            WHERE purchase_order_id = ?
            ORDER BY paid_at DESC, created_at DESC, id DESC
        `
        )
        .all(purchaseOrderId) as PurchasePaymentRow[];

    return rows.map(serializePayment);
};

const serializeRefund = (row: PurchaseRefundRow) => ({
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
});

export const getPurchaseOrderRefunds = (db: SqliteDb, purchaseOrderId: number) => {
    const rows = db
        .prepare(
            `
            SELECT *
            FROM purchase_refunds
            WHERE purchase_order_id = ?
            ORDER BY refunded_at DESC, created_at DESC, id DESC
        `
        )
        .all(purchaseOrderId) as PurchaseRefundRow[];

    return rows.map(serializeRefund);
};

const getPurchaseOrderItems = (db: SqliteDb, purchaseOrderId: number) => {
    const rows = db
        .prepare(
            `
            SELECT poi.*,
                   p.id AS p_id, p.category, p.name, p.barcode, p.price_cents,
                   p.stock_quantity, p.selling_price_cents, p.is_use_premium,
                   p.created_at AS product_created_at, p.updated_at AS product_updated_at
            FROM purchase_order_items poi
            JOIN products p ON p.id = poi.product_id
            WHERE poi.purchase_order_id = ?
            ORDER BY poi.id ASC
        `
        )
        .all(purchaseOrderId) as PurchaseOrderItemRow[];

    return rows.map((row) => ({
        id: row.id,
        purchase_order_id: row.purchase_order_id,
        product_id: row.product_id,
        ordered_quantity: row.ordered_quantity,
        received_quantity: row.received_quantity,
        remaining_quantity: Math.max(row.ordered_quantity - row.received_quantity, 0),
        purchase_price: toYuan(row.purchase_price_cents),
        note: row.note,
        created_at: row.created_at,
        updated_at: row.updated_at,
        product: serializeProduct({
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
        } as ProductRow),
    }));
};

export const serializePurchaseOrder = (
    db: SqliteDb,
    row: PurchaseOrderRow,
    options: { includePayments?: boolean; includeInboundOrders?: boolean } = {}
) => {
    const status = normalizePurchaseOrderStatus(row.status) || 'ordered';
    const summary = getPurchaseOrderSummaryCents(db, row.id, {
        shipping_fee_cents: row.shipping_fee_cents,
        misc_fee_cents: row.misc_fee_cents,
    });

    return {
        id: row.id,
        supplier_id: row.supplier_id,
        status,
        ordered_at: row.ordered_at,
        expected_inbound_at: row.expected_inbound_at,
        shipping_fee: toYuan(row.shipping_fee_cents),
        misc_fee: toYuan(row.misc_fee_cents),
        note: row.note,
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
        items: getPurchaseOrderItems(db, row.id),
        summary: serializeSummary(summary),
        payments: options.includePayments ? getPurchaseOrderPayments(db, row.id) : undefined,
        returns: options.includePayments
            ? listPurchaseReturns(db, { purchaseOrderId: row.id })
            : undefined,
        refunds: options.includePayments ? getPurchaseOrderRefunds(db, row.id) : undefined,
        logistics_record: getLogisticsRecordByRelated(db, 'purchase_order', row.id, 'purchase'),
        inbound_orders: options.includeInboundOrders
            ? listInboundOrders(db, { purchaseOrderId: row.id })
            : undefined,
    };
};

export const getPurchaseOrderById = (
    db: SqliteDb,
    id: number,
    options: { includePayments?: boolean } = { includePayments: true }
) => {
    const row = db
        .prepare(
            `
            SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone, s.address,
                   s.note AS supplier_note
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.id = ?
        `
        )
        .get(id) as PurchaseOrderRow | undefined;

    if (!row) return null;
    return serializePurchaseOrder(db, row, { ...options, includeInboundOrders: true });
};

export const listPurchaseOrders = (
    db: SqliteDb,
    filters: {
        search?: string | null;
        status?: string | null;
        goodsStatus?: string | null;
        paymentStatus?: string | null;
    } = {}
) => {
    const conditions: string[] = [];
    const params: Record<string, string> = {};
    const goodsStatus = filters.goodsStatus || filters.status;
    const normalizedGoodsStatus = normalizePurchaseOrderStatus(goodsStatus);

    if (goodsStatus && goodsStatus !== 'all' && normalizedGoodsStatus) {
        conditions.push('po.status = @status');
        params.status = normalizedGoodsStatus;
    }

    if (filters.search) {
        conditions.push(`
            (
                CAST(po.id AS TEXT) LIKE @search
                OR s.name LIKE @search
                OR EXISTS (
                    SELECT 1
                    FROM purchase_order_items poi
                    JOIN products p ON p.id = poi.product_id
                    WHERE poi.purchase_order_id = po.id
                      AND (p.name LIKE @search OR p.barcode LIKE @search)
                )
            )
        `);
        params.search = `%${filters.search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone, s.address,
                   s.note AS supplier_note
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            ${where}
            ORDER BY po.ordered_at DESC, po.created_at DESC, po.id DESC
        `
        )
        .all(params) as PurchaseOrderRow[];

    const orders = rows.map((row) =>
        serializePurchaseOrder(db, row, { includePayments: true, includeInboundOrders: true })
    );
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        return orders.filter((order) => order.summary.payment_status === filters.paymentStatus);
    }

    return orders;
};
