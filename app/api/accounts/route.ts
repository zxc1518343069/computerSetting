import { getDb } from '@/lib/db';
import { listLogisticsPayableAccounts, listLogisticsPayableRecords } from '@/lib/db/logistics';
import { listPurchaseMerchantRefunds } from '@/lib/db/purchaseMerchantRefunds';
import { listPurchaseOrders } from '@/lib/db/purchaseOrders';
import { listPurchaseReturns } from '@/lib/db/purchaseReturns';
import {
    inferSalesOrderSourceType,
    normalizeSalesOrderSourceType,
    salesOrderSourceTypeLabels,
} from '@/lib/db/salesOrders';
import { toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';

type PayableDetail = ReturnType<typeof buildPayableDetail>;
type MerchantRefundDetail = ReturnType<typeof buildMerchantRefundDetail>;
type PurchaseReturnRefundDetail = ReturnType<typeof buildPurchaseReturnRefundDetail>;
type ReceivableDetail = ReturnType<typeof buildReceivableDetail>;

interface SupplierAccount {
    supplier_id?: number;
    supplier_name: string;
    contact_name?: string | null;
    phone?: string | null;
    order_count: number;
    line_count: number;
    payable_amount: number;
    paid_amount: number;
    refunded_amount: number;
    pending_payment: number;
    pending_refund: number;
    merchant_refund_amount: number;
    merchant_refund_settled_amount: number;
    merchant_refund_pending_amount: number;
    merchant_refund_cash_amount: number;
    merchant_refund_offset_amount: number;
    latest_ordered_at?: string;
    latest_return_at?: string;
    latest_merchant_refund_at?: string;
    orders: PayableDetail[];
    returns: PurchaseReturnRefundDetail[];
    merchant_refunds: MerchantRefundDetail[];
}

interface CustomerAccount {
    customer_key: string;
    customer_id?: number | null;
    customer_name: string;
    customer_phone?: string | null;
    order_count: number;
    line_count: number;
    total_quantity: number;
    receivable_amount: number;
    latest_order_at?: string;
    orders: ReceivableDetail[];
}

const buildPayableDetail = (order: ReturnType<typeof listPurchaseOrders>[number]) => ({
    id: order.id,
    supplier_id: order.supplier_id,
    supplier_name: order.supplier?.name || '未命名商家',
    contact_name: order.supplier?.contact_name || null,
    phone: order.supplier?.phone || null,
    line_count: order.summary.line_count,
    total_quantity: order.summary.total_ordered_quantity,
    received_quantity: order.summary.total_received_quantity,
    remaining_quantity: order.summary.total_remaining_quantity,
    goods_amount: order.summary.goods_amount,
    return_amount: order.summary.return_amount,
    shipping_fee: order.shipping_fee,
    misc_fee: order.misc_fee,
    payable_amount: order.summary.payable_amount,
    paid_amount: order.summary.paid_amount,
    refunded_amount: order.summary.refunded_amount,
    merchant_refund_amount: order.summary.merchant_refund_amount,
    merchant_refund_settled_amount: order.summary.merchant_refund_settled_amount,
    merchant_refund_pending_amount: order.summary.merchant_refund_pending_amount,
    merchant_refund_cash_amount: order.summary.merchant_refund_cash_amount,
    merchant_refund_offset_amount: order.summary.merchant_refund_offset_amount,
    net_paid: order.summary.net_paid,
    pending_payment: order.summary.pending_payment,
    pending_refund: 0,
    amount: order.summary.pending_payment,
    payment_status: order.summary.payment_status,
    ordered_at: order.ordered_at,
    note: order.note,
    created_at: order.created_at,
});

const buildMerchantRefundDetail = (
    item: ReturnType<typeof listPurchaseMerchantRefunds>[number]
) => ({
    id: item.id,
    purchase_order_id: item.purchase_order_id,
    supplier_id: item.supplier?.id || item.supplier_id,
    supplier_name: item.supplier?.name || '未命名商家',
    contact_name: item.supplier?.contact_name || null,
    phone: item.supplier?.phone || null,
    type: item.type,
    status: item.status,
    amount: item.amount,
    settled_amount: item.settled_amount,
    pending_amount: item.pending_amount,
    cash_amount: item.cash_amount,
    offset_amount: item.offset_amount,
    reason: item.reason,
    occurred_at: item.occurred_at,
    created_at: item.created_at,
});

const buildPurchaseReturnRefundDetail = (item: ReturnType<typeof listPurchaseReturns>[number]) => ({
    id: item.id,
    purchase_order_id: item.purchase_order_id,
    inbound_order_id: item.inbound_order_id,
    supplier_id: item.supplier?.id,
    supplier_name: item.supplier?.name || '未命名商家',
    contact_name: item.supplier?.contact_name || null,
    phone: item.supplier?.phone || null,
    item_count: item.item_count,
    amount: item.pending_refund,
    return_amount: item.amount,
    shipping_fee: item.shipping_fee,
    merchant_shipping_fee: item.merchant_shipping_fee,
    receivable_amount: item.receivable_amount,
    refunded_amount: item.refunded_amount,
    pending_refund: item.pending_refund,
    goods_status: item.goods_status,
    refund_status: item.refund_status,
    reason: item.reason,
    created_at: item.created_at,
});

const buildReceivableDetail = (row: Record<string, unknown>) => {
    const customerId = row.customer_id ? Number(row.customer_id) : null;
    const customerName = String(row.customer_name || '');
    const customerPhone = row.customer_phone ? String(row.customer_phone) : null;
    const sourceType = normalizeSalesOrderSourceType(
        row.source_type,
        inferSalesOrderSourceType(row.source)
    );
    const lineCount = Number(row.line_count || 0);
    const totalQuantity = Number(row.total_quantity || 0);

    return {
        id: Number(row.id),
        customer_id: customerId,
        customer_key: customerId
            ? `customer_${customerId}`
            : `snapshot_${customerPhone || ''}_${customerName}`,
        order_no: String(row.order_no || ''),
        customer_name: customerName,
        customer_phone: customerPhone,
        source_type: sourceType,
        source_type_label: salesOrderSourceTypeLabels[sourceType],
        line_count: lineCount,
        total_quantity: totalQuantity,
        detail_summary:
            sourceType === 'after_sales'
                ? `${lineCount} 项 / ${totalQuantity} 次`
                : `${lineCount} 条 / ${totalQuantity} 件`,
        amount: toYuan(row.final_amount_cents as number),
        status: String(row.status || ''),
        payment_status: String(row.payment_status || ''),
        delivery_status: String(row.delivery_status || ''),
        created_at: row.created_at ? String(row.created_at) : undefined,
    };
};

export async function GET() {
    try {
        const db = getDb();
        const purchaseOrders = listPurchaseOrders(db, { status: 'all' });
        const purchaseReturns = listPurchaseReturns(db);
        const merchantRefunds = listPurchaseMerchantRefunds(db, { pendingOnly: true });
        const logisticsPayables = listLogisticsPayableRecords(db);
        const logisticsAccounts = listLogisticsPayableAccounts(db);

        const receivableRows = db
            .prepare(
                `
                SELECT so.id,
                       so.customer_id,
                       so.order_no,
                       so.customer_name,
                       so.customer_phone,
                       so.final_amount_cents,
                       so.status,
                       so.payment_status,
                       so.delivery_status,
                       so.source,
                       so.source_type,
                       so.created_at,
                       CASE
                           WHEN so.source_type = 'after_sales' THEN (
                               SELECT COUNT(*)
                               FROM sales_order_after_sales_items asoi
                               WHERE asoi.order_id = so.id
                           )
                           ELSE (
                               SELECT COUNT(*)
                               FROM sales_order_items soi
                               WHERE soi.order_id = so.id
                           )
                       END AS line_count,
                       CASE
                           WHEN so.source_type = 'after_sales' THEN (
                               SELECT COALESCE(SUM(asoi.quantity), 0)
                               FROM sales_order_after_sales_items asoi
                               WHERE asoi.order_id = so.id
                           )
                           ELSE (
                               SELECT COALESCE(SUM(soi.quantity), 0)
                               FROM sales_order_items soi
                               WHERE soi.order_id = so.id
                           )
                       END AS total_quantity
                FROM sales_orders so
                WHERE so.payment_status = 'unpaid'
                  AND so.delivery_status != 'cancelled'
                ORDER BY so.created_at DESC
            `
            )
            .all() as Array<Record<string, unknown>>;

        const payables = purchaseOrders
            .filter(
                (order) =>
                    order.status !== 'cancelled' &&
                    order.summary.total_received_quantity > 0 &&
                    order.summary.pending_payment > 0
            )
            .map(buildPayableDetail);
        const purchaseReturnRefunds = purchaseReturns
            .filter((item) => item.goods_status !== 'cancelled' && item.pending_refund > 0)
            .map(buildPurchaseReturnRefundDetail);
        const purchaseMerchantRefunds = merchantRefunds.map(buildMerchantRefundDetail);

        const receivables = receivableRows.map(buildReceivableDetail);
        const supplierAccountMap = payables.reduce((map, order) => {
            const key = String(order.supplier_id || order.supplier_name);
            const current =
                map.get(key) ||
                ({
                    supplier_id: order.supplier_id,
                    supplier_name: order.supplier_name,
                    contact_name: order.contact_name,
                    phone: order.phone,
                    order_count: 0,
                    line_count: 0,
                    payable_amount: 0,
                    paid_amount: 0,
                    refunded_amount: 0,
                    pending_payment: 0,
                    pending_refund: 0,
                    merchant_refund_amount: 0,
                    merchant_refund_settled_amount: 0,
                    merchant_refund_pending_amount: 0,
                    merchant_refund_cash_amount: 0,
                    merchant_refund_offset_amount: 0,
                    latest_ordered_at: order.ordered_at,
                    latest_return_at: undefined,
                    latest_merchant_refund_at: undefined,
                    orders: [],
                    returns: [],
                    merchant_refunds: [],
                } as SupplierAccount);

            current.order_count += 1;
            current.line_count += order.line_count;
            current.payable_amount += order.payable_amount;
            current.paid_amount += order.paid_amount;
            current.refunded_amount += order.refunded_amount;
            current.pending_payment += order.pending_payment;
            current.latest_ordered_at =
                !current.latest_ordered_at ||
                (order.ordered_at && order.ordered_at > current.latest_ordered_at)
                    ? order.ordered_at
                    : current.latest_ordered_at;
            current.orders.push(order);
            map.set(key, current);
            return map;
        }, new Map<string, SupplierAccount>());

        purchaseReturnRefunds.forEach((item) => {
            const key = String(item.supplier_id || item.supplier_name);
            const current =
                supplierAccountMap.get(key) ||
                ({
                    supplier_id: item.supplier_id,
                    supplier_name: item.supplier_name,
                    contact_name: item.contact_name,
                    phone: item.phone,
                    order_count: 0,
                    line_count: 0,
                    payable_amount: 0,
                    paid_amount: 0,
                    refunded_amount: 0,
                    pending_payment: 0,
                    pending_refund: 0,
                    merchant_refund_amount: 0,
                    merchant_refund_settled_amount: 0,
                    merchant_refund_pending_amount: 0,
                    merchant_refund_cash_amount: 0,
                    merchant_refund_offset_amount: 0,
                    latest_ordered_at: undefined,
                    latest_return_at: item.created_at,
                    latest_merchant_refund_at: undefined,
                    orders: [],
                    returns: [],
                    merchant_refunds: [],
                } as SupplierAccount);

            current.pending_refund += item.pending_refund;
            current.refunded_amount += item.refunded_amount;
            current.latest_return_at =
                !current.latest_return_at ||
                (item.created_at && item.created_at > current.latest_return_at)
                    ? item.created_at
                    : current.latest_return_at;
            current.returns.push(item);
            supplierAccountMap.set(key, current);
        });

        purchaseMerchantRefunds.forEach((item) => {
            const key = String(item.supplier_id || item.supplier_name);
            const current =
                supplierAccountMap.get(key) ||
                ({
                    supplier_id: item.supplier_id,
                    supplier_name: item.supplier_name,
                    contact_name: item.contact_name,
                    phone: item.phone,
                    order_count: 0,
                    line_count: 0,
                    payable_amount: 0,
                    paid_amount: 0,
                    refunded_amount: 0,
                    pending_payment: 0,
                    pending_refund: 0,
                    merchant_refund_amount: 0,
                    merchant_refund_settled_amount: 0,
                    merchant_refund_pending_amount: 0,
                    merchant_refund_cash_amount: 0,
                    merchant_refund_offset_amount: 0,
                    latest_ordered_at: undefined,
                    latest_return_at: undefined,
                    latest_merchant_refund_at: item.occurred_at,
                    orders: [],
                    returns: [],
                    merchant_refunds: [],
                } as SupplierAccount);

            current.merchant_refund_amount += item.amount;
            current.merchant_refund_settled_amount += item.settled_amount;
            current.merchant_refund_pending_amount += item.pending_amount;
            current.merchant_refund_cash_amount += item.cash_amount;
            current.merchant_refund_offset_amount += item.offset_amount;
            current.latest_merchant_refund_at =
                !current.latest_merchant_refund_at ||
                (item.occurred_at && item.occurred_at > current.latest_merchant_refund_at)
                    ? item.occurred_at
                    : current.latest_merchant_refund_at;
            current.merchant_refunds.push(item);
            supplierAccountMap.set(key, current);
        });

        const supplierAccounts = Array.from(supplierAccountMap.values()).sort(
            (a, b) =>
                b.pending_payment +
                b.pending_refund +
                b.merchant_refund_pending_amount -
                (a.pending_payment + a.pending_refund + a.merchant_refund_pending_amount)
        );
        const customerAccounts = Array.from(
            receivables
                .reduce((map, order) => {
                    const current =
                        map.get(order.customer_key) ||
                        ({
                            customer_key: order.customer_key,
                            customer_id: order.customer_id,
                            customer_name: order.customer_name,
                            customer_phone: order.customer_phone,
                            order_count: 0,
                            line_count: 0,
                            total_quantity: 0,
                            receivable_amount: 0,
                            latest_order_at: order.created_at,
                            orders: [],
                        } as CustomerAccount);

                    current.order_count += 1;
                    current.line_count += order.line_count;
                    current.total_quantity += order.total_quantity;
                    current.receivable_amount += order.amount;
                    current.latest_order_at =
                        !current.latest_order_at ||
                        (order.created_at && order.created_at > current.latest_order_at)
                            ? order.created_at
                            : current.latest_order_at;
                    current.orders.push(order);
                    map.set(order.customer_key, current);
                    return map;
                }, new Map<string, CustomerAccount>())
                .values()
        ).sort((a, b) => b.receivable_amount - a.receivable_amount);

        return success(
            {
                supplier_accounts: supplierAccounts,
                logistics_accounts: logisticsAccounts,
                customer_accounts: customerAccounts,
                payables,
                logistics_payables: logisticsPayables,
                purchase_return_refunds: purchaseReturnRefunds,
                merchant_refunds: purchaseMerchantRefunds,
                receivables,
                summary: {
                    merchant_payable_count: payables.filter((item) => item.pending_payment > 0)
                        .length,
                    merchant_payable_amount: payables.reduce(
                        (sum, item) => sum + item.pending_payment,
                        0
                    ),
                    logistics_payable_count: logisticsPayables.length,
                    logistics_payable_amount: logisticsPayables.reduce(
                        (sum, item) => sum + item.payable_amount,
                        0
                    ),
                    payable_count: payables.filter((item) => item.pending_payment > 0).length,
                    refund_count: purchaseReturnRefunds.length,
                    merchant_refund_count: purchaseMerchantRefunds.length,
                    receivable_count: receivables.length,
                    payable_amount: payables.reduce((sum, item) => sum + item.pending_payment, 0),
                    refund_amount: purchaseReturnRefunds.reduce(
                        (sum, item) => sum + item.pending_refund,
                        0
                    ),
                    merchant_refund_amount: purchaseMerchantRefunds.reduce(
                        (sum, item) => sum + item.pending_amount,
                        0
                    ),
                    receivable_amount: receivables.reduce((sum, item) => sum + item.amount, 0),
                },
            },
            '获取账款列表成功'
        );
    } catch (e) {
        console.error('Get accounts error:', e);
        return error(500, '获取账款列表失败');
    }
}
