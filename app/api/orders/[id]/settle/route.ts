import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface BindingInput {
    order_item_id: number;
    inventory_item_ids: number[];
}

const recalculateProductStock = (db: ReturnType<typeof getDb>, productId: number) => {
    const row = db
        .prepare(
            "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
        )
        .get(productId) as { count: number };

    db.prepare(
        'UPDATE products SET stock_quantity = @stock_quantity, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
    ).run({ id: productId, stock_quantity: row.count });
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const orderId = parseInt(idParam);
        const db = getDb();
        const { bindings } = await request.json();

        if (!Array.isArray(bindings) || bindings.length === 0) {
            return error(400, '请选择要结算的库存物品');
        }

        const settle = db.transaction(() => {
            const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('ORDER_NOT_FOUND');
            if (order.status !== 'pending') throw new Error('ORDER_NOT_PENDING');

            const orderItems = db
                .prepare('SELECT * FROM sales_order_items WHERE order_id = ?')
                .all(orderId) as Record<string, unknown>[];

            const allInventoryIds = (bindings as BindingInput[]).flatMap(
                (binding) => binding.inventory_item_ids
            );
            if (new Set(allInventoryIds).size !== allInventoryIds.length) {
                throw new Error('DUPLICATE_INVENTORY');
            }

            const inventoryStmt = db.prepare('SELECT * FROM inventory_items WHERE id = ?');
            const bindingRows: Array<{
                order_id: number;
                order_item_id: number;
                inventory_item_id: number;
                cost_price_cents: number;
            }> = [];
            const affectedProductIds = new Set<number>();

            for (const binding of bindings as BindingInput[]) {
                const orderItem = orderItems.find((item) => item.id === binding.order_item_id);
                if (!orderItem) throw new Error('ORDER_ITEM_NOT_FOUND');
                if (binding.inventory_item_ids.length !== orderItem.quantity) {
                    throw new Error(`NEED_${orderItem.quantity}_${orderItem.product_name}`);
                }

                for (const inventoryId of binding.inventory_item_ids) {
                    const inventoryItem = inventoryStmt.get(inventoryId) as
                        | Record<string, unknown>
                        | undefined;
                    if (!inventoryItem) throw new Error('INVENTORY_NOT_FOUND');
                    if (inventoryItem.product_id !== orderItem.product_id) {
                        throw new Error('INVENTORY_PRODUCT_MISMATCH');
                    }
                    if (inventoryItem.status !== 'in_stock')
                        throw new Error('INVENTORY_NOT_AVAILABLE');

                    bindingRows.push({
                        order_id: orderId,
                        order_item_id: binding.order_item_id,
                        inventory_item_id: inventoryId,
                        cost_price_cents: inventoryItem.cost_price_cents as number,
                    });
                    affectedProductIds.add(inventoryItem.product_id as number);
                }
            }

            const insertBinding = db.prepare(
                `
                INSERT INTO order_inventory_items (
                    order_id, order_item_id, inventory_item_id, cost_price_cents
                )
                VALUES (@order_id, @order_item_id, @inventory_item_id, @cost_price_cents)
            `
            );
            const updateInventory = db.prepare(
                "UPDATE inventory_items SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            );

            for (const row of bindingRows) {
                insertBinding.run(row);
                updateInventory.run(row.inventory_item_id);
            }

            const costAmountCents = bindingRows.reduce((sum, row) => sum + row.cost_price_cents, 0);
            const finalAmountCents = order.final_amount_cents as number;

            db.prepare(
                `
                UPDATE sales_orders
                SET status = 'completed',
                    cost_amount_cents = @cost_amount_cents,
                    profit_amount_cents = @profit_amount_cents,
                    sold_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({
                id: orderId,
                cost_amount_cents: costAmountCents,
                profit_amount_cents: finalAmountCents - costAmountCents,
            });

            affectedProductIds.forEach((productId) => recalculateProductStock(db, productId));
        });

        try {
            settle();
        } catch (e) {
            const message = e instanceof Error ? e.message : '';
            if (message === 'ORDER_NOT_FOUND') return error(404, '订单不存在');
            if (message === 'ORDER_NOT_PENDING') return error(400, '只有待结算订单可以结算');
            if (message === 'DUPLICATE_INVENTORY') return error(400, '同一库存物品不能重复绑定');
            if (message === 'ORDER_ITEM_NOT_FOUND') return error(400, '订单明细不存在');
            if (message === 'INVENTORY_NOT_FOUND') return error(400, '库存物品不存在');
            if (message === 'INVENTORY_PRODUCT_MISMATCH')
                return error(400, '库存物品与订单产品不匹配');
            if (message === 'INVENTORY_NOT_AVAILABLE') return error(400, '存在不可售库存物品');
            if (message.startsWith('NEED_')) {
                const [, quantity, productName] = message.split('_');
                return error(400, `「${productName}」需要选择 ${quantity} 件库存`);
            }
            throw e;
        }

        return success(null, '订单结算成功');
    } catch (e) {
        console.error('Settle order error:', e);
        return error(500, '订单结算失败');
    }
}
