import { getDb } from '@/lib/db';
import { toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = Number(idParam);
        if (!id) return error(400, '客户不存在');

        const db = getDb();
        const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
        if (!customer) return error(404, '客户不存在');

        const rows = db
            .prepare(
                `
                SELECT so.id,
                       so.order_no,
                       so.customer_name,
                       so.customer_phone,
                       so.final_amount_cents,
                       so.cost_amount_cents,
                       so.profit_amount_cents,
                       so.status,
                       so.payment_status,
                       so.delivery_status,
                       so.is_paid,
                       so.created_at,
                       so.sold_at,
                       so.delivered_at,
                       COUNT(soi.id) AS line_count,
                       COALESCE(SUM(soi.quantity), 0) AS total_quantity
                FROM sales_orders so
                LEFT JOIN sales_order_items soi ON soi.order_id = so.id
                WHERE so.customer_id = ?
                GROUP BY so.id
                ORDER BY so.created_at DESC
            `
            )
            .all(id) as Array<Record<string, unknown>>;

        return success(
            rows.map((row) => ({
                id: row.id,
                order_no: row.order_no,
                customer_name: row.customer_name,
                customer_phone: row.customer_phone,
                final_amount: toYuan(row.final_amount_cents as number),
                cost_amount: toYuan(row.cost_amount_cents as number),
                profit_amount: toYuan(row.profit_amount_cents as number),
                status: row.status,
                payment_status: row.payment_status,
                delivery_status: row.delivery_status,
                is_paid: Boolean(row.is_paid),
                line_count: Number(row.line_count || 0),
                total_quantity: Number(row.total_quantity || 0),
                created_at: row.created_at,
                sold_at: row.sold_at,
                delivered_at: row.delivered_at,
            })),
            '获取客户订单成功'
        );
    } catch (e) {
        console.error('Get customer orders error:', e);
        return error(500, '获取客户订单失败');
    }
}
