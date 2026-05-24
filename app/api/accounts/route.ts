import { getDb } from '@/lib/db';
import { toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';

export async function GET() {
    try {
        const db = getDb();
        const payableRows = db
            .prepare(
                `
                SELECT io.id,
                       io.supplier_id,
                       io.shipping_fee_cents,
                       io.misc_fee_cents,
                       io.inbound_at,
                       io.note,
                       io.created_at,
                       s.name AS supplier_name,
                       COUNT(ioi.id) AS line_count,
                       COALESCE(SUM(ioi.quantity), 0) AS total_quantity,
                       COALESCE(SUM(ioi.quantity * ioi.purchase_price_cents), 0) AS goods_amount_cents
                FROM inbound_orders io
                LEFT JOIN suppliers s ON s.id = io.supplier_id
                LEFT JOIN inbound_order_items ioi ON ioi.inbound_order_id = io.id
                WHERE io.is_paid = 0
                GROUP BY io.id
                ORDER BY io.inbound_at DESC, io.created_at DESC
            `
            )
            .all() as Array<Record<string, unknown>>;

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

        const payables = payableRows.map((row) => {
            const goodsAmountCents = Number(row.goods_amount_cents || 0);
            const shippingFeeCents = Number(row.shipping_fee_cents || 0);
            const miscFeeCents = Number(row.misc_fee_cents || 0);

            return {
                id: row.id,
                supplier_id: row.supplier_id,
                supplier_name: row.supplier_name || '未命名商家',
                line_count: Number(row.line_count || 0),
                total_quantity: Number(row.total_quantity || 0),
                goods_amount: toYuan(goodsAmountCents),
                shipping_fee: toYuan(shippingFeeCents),
                misc_fee: toYuan(miscFeeCents),
                amount: toYuan(goodsAmountCents + shippingFeeCents + miscFeeCents),
                inbound_at: row.inbound_at,
                note: row.note,
                created_at: row.created_at,
            };
        });

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
                    payable_count: payables.length,
                    receivable_count: receivables.length,
                    payable_amount: payables.reduce((sum, item) => sum + item.amount, 0),
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
