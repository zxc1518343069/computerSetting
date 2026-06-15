import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { getPricingConfig } from '@/lib/db/pricing';
import {
    inferSalesOrderSourceType,
    normalizeSalesOrderSourceType,
    resolveSalesOrderStatuses,
} from '@/lib/db/salesOrders';
import { ProductRow, serializeProduct, toCents, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { PricingCalculator } from '@/utils/pricing';
import { Product } from '@/const/types';
import { NextRequest } from 'next/server';

interface AdjustmentItemInput {
    source_order_item_id?: number | null;
    product_id: number;
    quantity: number;
}

const getQuoteProduct = (
    product: ProductRow,
    maxCostRow: { max_cost_cents: number | null } | undefined
): Product => {
    const serialized = serializeProduct(product);
    return {
        ...serialized,
        price:
            maxCostRow?.max_cost_cents === null || maxCostRow?.max_cost_cents === undefined
                ? serialized.price
                : toYuan(maxCostRow.max_cost_cents),
    };
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await requireAdminUser();
        const { id: idParam } = await params;
        const orderId = parseInt(idParam);
        const db = getDb();
        const { items, final_amount, adjustment_note } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return error(400, '调整后的装机配置不能为空');
        }
        if (!adjustment_note || !String(adjustment_note).trim()) {
            return error(400, '请填写调整说明');
        }
        if (final_amount === undefined || Number(final_amount) < 0) {
            return error(400, '最终成交价不能为空且不能小于 0');
        }

        const saveAdjustment = db.transaction(() => {
            const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as
                | Record<string, unknown>
                | undefined;
            if (!order) throw new Error('ORDER_NOT_FOUND');
            const sourceType = normalizeSalesOrderSourceType(
                order.source_type,
                inferSalesOrderSourceType(order.source)
            );
            if (sourceType !== 'diy') throw new Error('ORDER_SOURCE_NOT_DIY');
            if (resolveSalesOrderStatuses(order).deliveryStatus !== 'undelivered') {
                throw new Error('ORDER_NOT_PENDING');
            }

            const originalItems = db
                .prepare('SELECT * FROM sales_order_items WHERE order_id = ?')
                .all(orderId) as Array<Record<string, unknown>>;
            const originalItemMap = new Map(originalItems.map((item) => [Number(item.id), item]));

            const latestAdjustment = order.latest_adjustment_id
                ? (db
                      .prepare('SELECT * FROM sales_order_adjustments WHERE id = ?')
                      .get(order.latest_adjustment_id) as Record<string, unknown> | undefined)
                : undefined;

            const productStmt = db.prepare('SELECT * FROM products WHERE id = ?');
            const maxCostStmt = db.prepare(
                `
                SELECT MAX(cost_price_cents) AS max_cost_cents
                FROM inventory_items
                WHERE product_id = ? AND status = 'in_stock'
            `
            );
            const calculator = new PricingCalculator(getPricingConfig(db));

            const normalizedItems = (items as AdjustmentItemInput[]).map((item) => {
                const productId = Number(item.product_id);
                const quantity = Number(item.quantity || 0);
                if (!productId) throw new Error('PRODUCT_REQUIRED');
                if (!Number.isFinite(quantity) || quantity <= 0) {
                    throw new Error('INVALID_QUANTITY');
                }

                const product = productStmt.get(productId) as ProductRow | undefined;
                if (!product) throw new Error('PRODUCT_NOT_FOUND');

                const sourceOrderItemId = item.source_order_item_id
                    ? Number(item.source_order_item_id)
                    : null;
                const sourceOrderItem = sourceOrderItemId
                    ? originalItemMap.get(sourceOrderItemId)
                    : undefined;

                if (sourceOrderItemId && !sourceOrderItem) {
                    throw new Error('SOURCE_ORDER_ITEM_NOT_FOUND');
                }
                if (
                    sourceOrderItem &&
                    String(sourceOrderItem.product_category) !== String(product.category)
                ) {
                    throw new Error('CATEGORY_MISMATCH');
                }

                const quoteProduct = getQuoteProduct(
                    product,
                    maxCostStmt.get(product.id) as { max_cost_cents: number | null } | undefined
                );
                const unitSalePriceCents = toCents(calculator.getProductPrice(quoteProduct));

                return {
                    source_order_item_id: sourceOrderItemId,
                    product_id: product.id,
                    product_name: product.name,
                    product_category: product.category,
                    quantity,
                    sale_price_cents: unitSalePriceCents,
                };
            });

            const adjustedAmountCents = normalizedItems.reduce(
                (sum, item) => sum + item.sale_price_cents * item.quantity,
                0
            );
            const finalAmountCents = toCents(final_amount);
            const originalAmountCents = Number(order.original_amount_cents || 0);
            const previousAdjustedAmountCents = latestAdjustment
                ? Number(latestAdjustment.adjusted_amount_cents || 0)
                : originalAmountCents;
            const previousFinalAmountCents = Number(order.final_amount_cents || 0);
            const costAmountCents = Number(order.cost_amount_cents || 0);

            const adjustmentResult = db
                .prepare(
                    `
                    INSERT INTO sales_order_adjustments (
                        order_id, previous_adjustment_id, original_amount_cents,
                        previous_adjusted_amount_cents, adjusted_amount_cents,
                        previous_final_amount_cents, final_amount_cents,
                        adjustment_note, created_by_user_id, created_by_username
                    )
                    VALUES (
                        @order_id, @previous_adjustment_id, @original_amount_cents,
                        @previous_adjusted_amount_cents, @adjusted_amount_cents,
                        @previous_final_amount_cents, @final_amount_cents,
                        @adjustment_note, @created_by_user_id, @created_by_username
                    )
                `
                )
                .run({
                    order_id: orderId,
                    previous_adjustment_id: latestAdjustment?.id || null,
                    original_amount_cents: originalAmountCents,
                    previous_adjusted_amount_cents: previousAdjustedAmountCents,
                    adjusted_amount_cents: adjustedAmountCents,
                    previous_final_amount_cents: previousFinalAmountCents,
                    final_amount_cents: finalAmountCents,
                    adjustment_note: String(adjustment_note).trim(),
                    created_by_user_id: currentUser.id,
                    created_by_username: currentUser.username,
                });

            const adjustmentId = Number(adjustmentResult.lastInsertRowid);
            const insertAdjustmentItem = db.prepare(
                `
                INSERT INTO sales_order_adjustment_items (
                    adjustment_id, source_order_item_id, product_id, product_name,
                    product_category, quantity, sale_price_cents
                )
                VALUES (
                    @adjustment_id, @source_order_item_id, @product_id, @product_name,
                    @product_category, @quantity, @sale_price_cents
                )
            `
            );

            normalizedItems.forEach((item) => {
                insertAdjustmentItem.run({
                    adjustment_id: adjustmentId,
                    ...item,
                });
            });

            db.prepare(
                `
                UPDATE sales_orders
                SET latest_adjustment_id = @latest_adjustment_id,
                    final_amount_cents = @final_amount_cents,
                    discount_amount_cents = @discount_amount_cents,
                    profit_amount_cents = @profit_amount_cents,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({
                id: orderId,
                latest_adjustment_id: adjustmentId,
                final_amount_cents: finalAmountCents,
                discount_amount_cents: originalAmountCents - finalAmountCents,
                profit_amount_cents: finalAmountCents - costAmountCents,
            });

            return adjustmentId;
        });

        const adjustmentId = saveAdjustment();
        return success({ id: adjustmentId }, '装机配置已调整');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);

        const message = e instanceof Error ? e.message : '';
        if (message === 'ORDER_NOT_FOUND') return error(404, '订单不存在');
        if (message === 'ORDER_SOURCE_NOT_DIY') return error(400, '只有 DIY 整机订单可以调整配置');
        if (message === 'ORDER_NOT_PENDING') return error(400, '只有未交付订单可以调整配置');
        if (message === 'PRODUCT_REQUIRED') return error(400, '请选择商品');
        if (message === 'INVALID_QUANTITY') return error(400, '商品数量必须大于 0');
        if (message === 'PRODUCT_NOT_FOUND') return error(400, '商品不存在');
        if (message === 'SOURCE_ORDER_ITEM_NOT_FOUND') return error(400, '原始订单明细不存在');
        if (message === 'CATEGORY_MISMATCH')
            return error(400, '替换商品必须和原订单明细保持同一分类');

        console.error('Adjust order config error:', e);
        return error(500, '调整装机配置失败');
    }
}
