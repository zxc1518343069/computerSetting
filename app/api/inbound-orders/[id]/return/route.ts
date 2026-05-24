import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const recalculateProductStock = (db: ReturnType<typeof getDb>, productId: number) => {
    const row = db
        .prepare(
            "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
        )
        .get(productId) as { count: number };

    db.prepare(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(row.count, productId);
};

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const inboundOrderId = Number(idParam);
        const db = getDb();

        const returnInboundOrder = db.transaction(() => {
            const order = db
                .prepare('SELECT * FROM inbound_orders WHERE id = ?')
                .get(inboundOrderId) as Record<string, unknown> | undefined;
            if (!order) throw new Error('ORDER_NOT_FOUND');

            const inventoryRows = db
                .prepare(
                    `
                    SELECT id, product_id
                    FROM inventory_items
                    WHERE inbound_order_id = ? AND status = 'in_stock'
                `
                )
                .all(inboundOrderId) as Array<{ id: number; product_id: number }>;

            if (inventoryRows.length === 0) throw new Error('NO_AVAILABLE_INVENTORY');

            const updateInventory = db.prepare(
                "UPDATE inventory_items SET status = 'returned', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            );
            const affectedProductIds = new Set<number>();

            inventoryRows.forEach((row) => {
                updateInventory.run(row.id);
                affectedProductIds.add(row.product_id);
            });

            affectedProductIds.forEach((productId) => recalculateProductStock(db, productId));

            return inventoryRows.length;
        });

        try {
            const count = returnInboundOrder();
            return success({ returned_count: count }, '采购退货成功');
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'ORDER_NOT_FOUND') return error(404, '入库单不存在');
            if (message === 'NO_AVAILABLE_INVENTORY') return error(400, '该入库单没有可退货库存');
            throw e;
        }
    } catch (e) {
        console.error('Return inbound order error:', e);
        return error(500, '采购退货失败');
    }
}
