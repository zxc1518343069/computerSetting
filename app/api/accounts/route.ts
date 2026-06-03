import { getDb } from '@/lib/db';
import { listPurchaseOrders } from '@/lib/db/purchaseOrders';
import { toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';

export async function GET() {
    try {
        const db = getDb();
        const purchaseOrders = listPurchaseOrders(db, { status: 'all' });

        const receivableRows = db
            .prepare(
                `
                SELECT so.id,
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
            .map((order) => ({
                id: order.id,
                supplier_id: order.supplier_id,
                supplier_name: order.supplier?.name || '未命名商家',
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
            }));

        const receivables = receivableRows.map((row) => ({
            id: row.id,
            order_no: row.order_no,
            customer_name: row.customer_name,
            customer_phone: row.customer_phone,
            line_count: Number(row.line_count || 0),
            total_quantity: Number(row.total_quantity || 0),
            amount: toYuan(row.final_amount_cents as number),
            status: row.status,
            created_at: row.created_at,
        }));

        return success(
            {
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
