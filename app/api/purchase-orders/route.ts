import { getDb } from '@/lib/db';
import {
    getPurchaseOrderById,
    isPurchaseOrderStatus,
    listPurchaseOrders,
    normalizePurchaseOrderStatus,
} from '@/lib/db/purchaseOrders';
import { syncLogisticsRecordForRelated } from '@/lib/db/logistics';
import { toCents } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

interface PurchaseOrderItemInput {
    product_id: number;
    ordered_quantity: number;
    purchase_price: number;
    note?: string | null;
}

const normalizeDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

const normalizeOptionalDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : null;

const validateItems = (items: PurchaseOrderItemInput[]) => {
    if (!Array.isArray(items) || items.length === 0) {
        return '请至少添加一条进货明细';
    }

    for (const item of items) {
        if (
            !item.product_id ||
            !Number.isInteger(Number(item.ordered_quantity)) ||
            Number(item.ordered_quantity) < 1 ||
            item.purchase_price === undefined ||
            Number(item.purchase_price) < 0
        ) {
            return '进货明细中的物品、数量和采购单价不能为空';
        }
    }

    return null;
};

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const goodsStatus = searchParams.get('goods_status');
        const paymentStatus = searchParams.get('payment_status');
        const statusFilter = goodsStatus || status;

        if (statusFilter && statusFilter !== 'all' && !normalizePurchaseOrderStatus(statusFilter)) {
            return error(400, '进货单状态不正确');
        }

        if (
            paymentStatus &&
            paymentStatus !== 'all' &&
            !['unpaid', 'partial_paid', 'settled'].includes(paymentStatus)
        ) {
            return error(400, '进货单资金状态不正确');
        }

        return success(
            listPurchaseOrders(db, { search, status, goodsStatus, paymentStatus }),
            '获取进货单成功'
        );
    } catch (e) {
        console.error('Get purchase orders error:', e);
        return error(500, '获取进货单失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const {
            supplier_id,
            status = 'draft',
            ordered_at,
            expected_inbound_at,
            shipping_fee = 0,
            misc_fee = 0,
            logistics_company_id,
            tracking_no,
            note,
            items,
        } = await request.json();

        if (!supplier_id) return error(400, '请选择进货商家');
        if (
            !isPurchaseOrderStatus(status) ||
            status === 'partial_inbound' ||
            status === 'inbound' ||
            status === 'cancelled'
        ) {
            return error(400, '进货单初始状态不正确');
        }

        const itemError = validateItems(items);
        if (itemError) return error(400, itemError);

        const supplier = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(supplier_id);
        if (!supplier) return error(400, '进货商家不存在');
        const logisticsCompanyId = Number(logistics_company_id || 0) || null;
        if (
            logisticsCompanyId &&
            !db.prepare('SELECT id FROM logistics_companies WHERE id = ?').get(logisticsCompanyId)
        ) {
            return error(400, '物流公司不存在');
        }

        const productIds = Array.from(
            new Set((items as PurchaseOrderItemInput[]).map((item) => Number(item.product_id)))
        );
        const existingProductCount = db
            .prepare(
                `SELECT COUNT(*) AS count FROM products WHERE id IN (${productIds
                    .map(() => '?')
                    .join(',')})`
            )
            .get(...productIds) as { count: number };
        if (existingProductCount.count !== productIds.length)
            return error(400, '进货明细存在无效物品');

        const createPurchaseOrder = db.transaction(() => {
            const shippingFeeCents = toCents(Number(shipping_fee || 0));
            const miscFeeCents = toCents(Number(misc_fee || 0));

            const orderResult = db
                .prepare(
                    `
                    INSERT INTO purchase_orders (
                        supplier_id, status, ordered_at, expected_inbound_at,
                        shipping_fee_cents, misc_fee_cents, note, updated_at
                    )
                    VALUES (
                        @supplier_id, @status, @ordered_at, @expected_inbound_at,
                        @shipping_fee_cents, @misc_fee_cents, @note, CURRENT_TIMESTAMP
                    )
                `
                )
                .run({
                    supplier_id,
                    status,
                    ordered_at: normalizeDate(ordered_at),
                    expected_inbound_at: normalizeOptionalDate(expected_inbound_at),
                    shipping_fee_cents: shippingFeeCents,
                    misc_fee_cents: miscFeeCents,
                    note: note || null,
                });

            const purchaseOrderId = Number(orderResult.lastInsertRowid);
            const insertItem = db.prepare(
                `
                INSERT INTO purchase_order_items (
                    purchase_order_id, product_id, ordered_quantity, received_quantity,
                    purchase_price_cents, note, updated_at
                )
                VALUES (
                    @purchase_order_id, @product_id, @ordered_quantity, 0,
                    @purchase_price_cents, @note, CURRENT_TIMESTAMP
                )
            `
            );

            for (const item of items as PurchaseOrderItemInput[]) {
                const quantity = Number(item.ordered_quantity);
                const purchasePriceCents = toCents(Number(item.purchase_price || 0));
                insertItem.run({
                    purchase_order_id: purchaseOrderId,
                    product_id: item.product_id,
                    ordered_quantity: quantity,
                    purchase_price_cents: purchasePriceCents,
                    note: item.note || null,
                });
            }

            syncLogisticsRecordForRelated(db, {
                type: 'purchase',
                related_type: 'purchase_order',
                related_id: purchaseOrderId,
                company_id: logisticsCompanyId,
                tracking_no: tracking_no || null,
                shipping_fee: Number(shipping_fee || 0),
                self_amount: Number(shipping_fee || 0),
                occurred_at: ordered_at,
                shipping_fee_bearer: 'self',
                note: '进货单物流',
            });

            return purchaseOrderId;
        });

        const purchaseOrderId = createPurchaseOrder();
        return success(getPurchaseOrderById(db, purchaseOrderId), '进货单创建成功');
    } catch (e) {
        console.error('Create purchase order error:', e);
        return error(500, '创建进货单失败');
    }
}
