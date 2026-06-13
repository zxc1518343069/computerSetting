import type { SqliteDb } from './index';
import {
    InventoryItemRow,
    ProductRow,
    serializeInventoryItem,
    serializeProduct,
    toYuan,
} from './serializers';

type InboundRecordStatus = 'inbound' | 'partial_returned' | 'returned';

interface InboundOrderRow {
    id: number;
    supplier_id: number;
    shipping_fee_cents: number;
    misc_fee_cents: number;
    is_paid: number;
    source_type?: 'purchase_order' | 'opening_stock';
    purchase_order_id?: number | null;
    status?: string;
    inbound_at: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier_name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    supplier_note?: string | null;
}

interface InboundOrderItemRow {
    id: number;
    inbound_order_id: number;
    product_id: number;
    quantity: number;
    purchase_price_cents: number;
    purchase_order_item_id?: number | null;
    serial_tracking_enabled?: number;
    warranty_enabled?: number;
    warranty_until?: string | null;
    note?: string | null;
    created_at?: string;
    p_id: number;
    category: string;
    category_id?: number | null;
    category_name?: string | null;
    category_label?: string | null;
    category_tag_color?: string | null;
    name: string;
    barcode?: string | null;
    price_cents: number;
    stock_quantity: number;
    selling_price_cents: number | null;
    is_use_premium: number;
    product_created_at?: string;
    product_updated_at?: string;
}

interface InboundSummaryCents {
    inboundQuantity: number;
    soldQuantity: number;
    inStockQuantity: number;
    returnedQuantity: number;
    returnableQuantity: number;
    goodsAmountCents: number;
    recordStatus: InboundRecordStatus;
}

const productFromRow = (row: InboundOrderItemRow | ReturnableGroupRow) =>
    serializeProduct({
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
    } as ProductRow);

export const getInboundOrderSummaryCents = (
    db: SqliteDb,
    inboundOrderId: number
): InboundSummaryCents => {
    const goodsRow = db
        .prepare(
            `
            SELECT COALESCE(SUM(quantity * purchase_price_cents), 0) AS goods_amount_cents
            FROM inbound_order_items
            WHERE inbound_order_id = ?
        `
        )
        .get(inboundOrderId) as { goods_amount_cents: number };

    const quantityRow = db
        .prepare(
            `
            SELECT COUNT(*) AS inbound_quantity,
                   COALESCE(SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END), 0) AS sold_quantity,
                   COALESCE(SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END), 0) AS in_stock_quantity,
                   COALESCE(SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END), 0) AS returned_quantity
            FROM inventory_items
            WHERE inbound_order_id = ?
        `
        )
        .get(inboundOrderId) as Record<string, number>;

    const inboundQuantity = Number(quantityRow.inbound_quantity || 0);
    const returnedQuantity = Number(quantityRow.returned_quantity || 0);
    let recordStatus: InboundRecordStatus = 'inbound';
    if (inboundQuantity > 0 && returnedQuantity >= inboundQuantity) {
        recordStatus = 'returned';
    } else if (returnedQuantity > 0) {
        recordStatus = 'partial_returned';
    }

    return {
        inboundQuantity,
        soldQuantity: Number(quantityRow.sold_quantity || 0),
        inStockQuantity: Number(quantityRow.in_stock_quantity || 0),
        returnedQuantity,
        returnableQuantity: Number(quantityRow.in_stock_quantity || 0),
        goodsAmountCents: Number(goodsRow.goods_amount_cents || 0),
        recordStatus,
    };
};

const serializeSummary = (summary: InboundSummaryCents) => ({
    inbound_quantity: summary.inboundQuantity,
    sold_quantity: summary.soldQuantity,
    in_stock_quantity: summary.inStockQuantity,
    returned_quantity: summary.returnedQuantity,
    returnable_quantity: summary.returnableQuantity,
    goods_amount: toYuan(summary.goodsAmountCents),
    record_status: summary.recordStatus,
});

const getInboundOrderItems = (db: SqliteDb, inboundOrderId: number) => {
    const rows = db
        .prepare(
            `
            SELECT ioi.*,
                   p.id AS p_id, p.category, p.category_id, pc.name AS category_name,
                   pc.label AS category_label, pc.tag_color AS category_tag_color,
                   p.name, p.barcode, p.price_cents, p.stock_quantity,
                   p.selling_price_cents, p.is_use_premium,
                   p.created_at AS product_created_at, p.updated_at AS product_updated_at
            FROM inbound_order_items ioi
            JOIN products p ON p.id = ioi.product_id
            LEFT JOIN product_categories pc ON pc.id = p.category_id
            WHERE ioi.inbound_order_id = ?
            ORDER BY ioi.id ASC
        `
        )
        .all(inboundOrderId) as InboundOrderItemRow[];

    const inventoryStmt = db.prepare(
        'SELECT * FROM inventory_items WHERE inbound_order_item_id = ? ORDER BY id ASC'
    );

    return rows.map((row) => ({
        id: row.id,
        inbound_order_id: row.inbound_order_id,
        product_id: row.product_id,
        purchase_order_item_id: row.purchase_order_item_id,
        quantity: row.quantity,
        purchase_price: toYuan(row.purchase_price_cents),
        serial_tracking_enabled: Boolean(row.serial_tracking_enabled),
        warranty_enabled: Boolean(row.warranty_enabled),
        warranty_until: row.warranty_until,
        note: row.note,
        created_at: row.created_at,
        product: productFromRow(row),
        inventory_items: (inventoryStmt.all(row.id) as InventoryItemRow[]).map(
            serializeInventoryItem
        ),
    }));
};

export const serializeInboundOrder = (db: SqliteDb, row: InboundOrderRow) => ({
    id: row.id,
    supplier_id: row.supplier_id,
    shipping_fee: toYuan(row.shipping_fee_cents),
    misc_fee: toYuan(row.misc_fee_cents),
    is_paid: Boolean(row.is_paid),
    source_type: row.source_type || 'opening_stock',
    purchase_order_id: row.purchase_order_id,
    status: row.status || 'completed',
    inbound_at: row.inbound_at,
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
    items: getInboundOrderItems(db, row.id),
    summary: serializeSummary(getInboundOrderSummaryCents(db, row.id)),
});

const baseInboundOrderQuery = `
    SELECT io.*, s.name AS supplier_name, s.contact_name, s.phone, s.address,
           s.note AS supplier_note
    FROM inbound_orders io
    LEFT JOIN suppliers s ON s.id = io.supplier_id
`;

export const getInboundOrderById = (db: SqliteDb, id: number) => {
    const row = db
        .prepare(`${baseInboundOrderQuery} WHERE io.id = ?`)
        .get(id) as InboundOrderRow | undefined;

    return row ? serializeInboundOrder(db, row) : null;
};

export const listInboundOrders = (
    db: SqliteDb,
    filters: {
        purchaseOrderId?: number;
        inboundOrderId?: number;
        supplierId?: number;
        search?: string | null;
        recordStatus?: string | null;
        sourceType?: string | null;
    } = {}
) => {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filters.purchaseOrderId) {
        conditions.push('io.purchase_order_id = @purchaseOrderId');
        params.purchaseOrderId = filters.purchaseOrderId;
    }
    if (filters.inboundOrderId) {
        conditions.push('io.id = @inboundOrderId');
        params.inboundOrderId = filters.inboundOrderId;
    }
    if (filters.supplierId) {
        conditions.push('io.supplier_id = @supplierId');
        params.supplierId = filters.supplierId;
    }
    if (filters.sourceType && filters.sourceType !== 'all') {
        conditions.push('io.source_type = @sourceType');
        params.sourceType = filters.sourceType;
    }
    if (filters.search) {
        conditions.push(`
            (
                CAST(io.id AS TEXT) LIKE @search
                OR CAST(io.purchase_order_id AS TEXT) LIKE @search
                OR s.name LIKE @search
                OR EXISTS (
                    SELECT 1
                    FROM inbound_order_items ioi
                    JOIN products p ON p.id = ioi.product_id
                    WHERE ioi.inbound_order_id = io.id
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
            ${baseInboundOrderQuery}
            ${where}
            ORDER BY io.inbound_at DESC, io.created_at DESC, io.id DESC
        `
        )
        .all(params) as InboundOrderRow[];

    const orders = rows.map((row) => serializeInboundOrder(db, row));
    if (filters.recordStatus && filters.recordStatus !== 'all') {
        return orders.filter((order) => order.summary.record_status === filters.recordStatus);
    }

    return orders;
};

interface ReturnableGroupRow extends InboundOrderItemRow {
    sold_quantity: number;
    returned_quantity: number;
    returnable_quantity: number;
}

export const getReturnableItemsForInboundOrder = (db: SqliteDb, inboundOrderId: number) => {
    const inboundOrder = getInboundOrderById(db, inboundOrderId);
    if (!inboundOrder) return null;
    if (!inboundOrder.purchase_order_id) throw new Error('NO_PURCHASE_ORDER');

    const purchaseOrder = db
        .prepare(
            `
            SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone, s.address,
                   s.note AS supplier_note
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.id = ?
        `
        )
        .get(inboundOrder.purchase_order_id);

    const groups = db
        .prepare(
            `
            SELECT ioi.*,
                   p.id AS p_id, p.category, p.category_id, pc.name AS category_name,
                   pc.label AS category_label, pc.tag_color AS category_tag_color,
                   p.name, p.barcode, p.price_cents, p.stock_quantity,
                   p.selling_price_cents, p.is_use_premium,
                   p.created_at AS product_created_at, p.updated_at AS product_updated_at,
                   COALESCE(SUM(CASE WHEN ii.status = 'sold' THEN 1 ELSE 0 END), 0) AS sold_quantity,
                   COALESCE(SUM(CASE WHEN ii.status = 'returned' THEN 1 ELSE 0 END), 0) AS returned_quantity,
                   COALESCE(SUM(CASE WHEN ii.status = 'in_stock' THEN 1 ELSE 0 END), 0) AS returnable_quantity
            FROM inbound_order_items ioi
            JOIN products p ON p.id = ioi.product_id
            LEFT JOIN product_categories pc ON pc.id = p.category_id
            LEFT JOIN inventory_items ii ON ii.inbound_order_item_id = ioi.id
            WHERE ioi.inbound_order_id = ?
            GROUP BY ioi.id
            HAVING returnable_quantity > 0
            ORDER BY ioi.id ASC
        `
        )
        .all(inboundOrderId) as ReturnableGroupRow[];

    const inventoryStmt = db.prepare(
        `
        SELECT id, serial_number, status
        FROM inventory_items
        WHERE inbound_order_item_id = ?
          AND status = 'in_stock'
        ORDER BY id ASC
    `
    );

    return {
        inbound_order: inboundOrder,
        purchase_order: purchaseOrder,
        supplier: inboundOrder.supplier,
        groups: groups.map((group) => ({
            product_id: group.product_id,
            product: productFromRow(group),
            inbound_order_item_id: group.id,
            purchase_order_item_id: group.purchase_order_item_id,
            serial_tracking_enabled: Boolean(group.serial_tracking_enabled),
            purchase_price: toYuan(group.purchase_price_cents),
            inbound_quantity: group.quantity,
            sold_quantity: Number(group.sold_quantity || 0),
            returned_quantity: Number(group.returned_quantity || 0),
            returnable_quantity: Number(group.returnable_quantity || 0),
            inventory_items: inventoryStmt.all(group.id),
        })),
    };
};
