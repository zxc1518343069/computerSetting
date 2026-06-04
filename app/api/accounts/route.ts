import { getDb } from '@/lib/db';
import { listPurchaseOrders } from '@/lib/db/purchaseOrders';
import { toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';

type PayableDetail = ReturnType<typeof buildPayableDetail>;
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
    latest_ordered_at?: string;
    orders: PayableDetail[];
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
    net_paid: order.summary.net_paid,
    pending_payment: order.summary.pending_payment,
    pending_refund: order.summary.pending_refund,
    amount: order.summary.pending_payment,
    payment_status: order.summary.payment_status,
    ordered_at: order.ordered_at,
    note: order.note,
    created_at: order.created_at,
});

const buildReceivableDetail = (row: Record<string, unknown>) => {
    const customerId = row.customer_id ? Number(row.customer_id) : null;
    const customerName = String(row.customer_name || '');
    const customerPhone = row.customer_phone ? String(row.customer_phone) : null;

    return {
        id: Number(row.id),
        customer_id: customerId,
        customer_key: customerId
            ? `customer_${customerId}`
            : `snapshot_${customerPhone || ''}_${customerName}`,
        order_no: String(row.order_no || ''),
        customer_name: customerName,
        customer_phone: customerPhone,
        line_count: Number(row.line_count || 0),
        total_quantity: Number(row.total_quantity || 0),
        amount: toYuan(row.final_amount_cents as number),
        status: String(row.status || ''),
        created_at: row.created_at ? String(row.created_at) : undefined,
    };
};

export async function GET() {
    try {
        const db = getDb();
        const purchaseOrders = listPurchaseOrders(db, { status: 'all' });

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
                       so.created_at,
                       COUNT(soi.id) AS line_count,
                       COALESCE(SUM(soi.quantity), 0) AS total_quantity
                FROM sales_orders so
                LEFT JOIN sales_order_items soi ON soi.order_id = so.id
                WHERE so.is_paid = 0 AND so.status != 'cancelled'
                GROUP BY so.id
                ORDER BY so.created_at DESC
            `
            )
            .all() as Array<Record<string, unknown>>;

        const payables = purchaseOrders
            .filter(
                (order) =>
                    order.status !== 'cancelled' &&
                    (order.summary.pending_payment > 0 || order.summary.pending_refund > 0)
            )
            .map(buildPayableDetail);

        const receivables = receivableRows.map(buildReceivableDetail);
        const supplierAccounts = Array.from(
            payables
                .reduce((map, order) => {
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
                            latest_ordered_at: order.ordered_at,
                            orders: [],
                        } as SupplierAccount);

                    current.order_count += 1;
                    current.line_count += order.line_count;
                    current.payable_amount += order.payable_amount;
                    current.paid_amount += order.paid_amount;
                    current.refunded_amount += order.refunded_amount;
                    current.pending_payment += order.pending_payment;
                    current.pending_refund += order.pending_refund;
                    current.latest_ordered_at =
                        !current.latest_ordered_at ||
                        (order.ordered_at && order.ordered_at > current.latest_ordered_at)
                            ? order.ordered_at
                            : current.latest_ordered_at;
                    current.orders.push(order);
                    map.set(key, current);
                    return map;
                }, new Map<string, SupplierAccount>())
                .values()
        ).sort(
            (a, b) =>
                b.pending_payment +
                b.pending_refund -
                (a.pending_payment + a.pending_refund)
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
                customer_accounts: customerAccounts,
                payables,
                receivables,
                summary: {
                    payable_count: payables.filter((item) => item.pending_payment > 0).length,
                    refund_count: payables.filter((item) => item.pending_refund > 0).length,
                    receivable_count: receivables.length,
                    payable_amount: payables.reduce((sum, item) => sum + item.pending_payment, 0),
                    refund_amount: payables.reduce((sum, item) => sum + item.pending_refund, 0),
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
