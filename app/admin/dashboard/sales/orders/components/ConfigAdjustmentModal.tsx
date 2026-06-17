'use client';

import { SalesProduct, fetchSalesProducts, updateOrderConfigAdjustment } from '../services';
import { categoryNameMap, categoryOptions } from '@/const';
import { OrderSettlementItem, SalesOrder } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import { DeleteOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Spin,
    Tag,
    message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

interface EditableConfigItem {
    uid: string;
    source_order_item_id?: number | null;
    product_category: string;
    product_id: number;
    quantity: number;
}

interface ConfigAdjustmentModalProps {
    open: boolean;
    order: SalesOrder | null;
    onCancel: () => void;
    onSuccess: () => void;
}

const getUnitPrice = (product?: SalesProduct) => {
    if (!product) return 0;
    return Number(
        product.suggested_price ??
            product.selling_price ??
            product.quote_base_price ??
            product.price ??
            0
    );
};

const getItemSubtotal = (item: EditableConfigItem, productMap: Map<number, SalesProduct>) => {
    return getUnitPrice(productMap.get(item.product_id)) * Number(item.quantity || 0);
};

const toEditableItem = (item: OrderSettlementItem, index: number): EditableConfigItem => ({
    uid: `${item.source_type || 'order_item'}_${item.id}_${index}`,
    source_order_item_id:
        item.source_type === 'adjustment_item' ? item.source_order_item_id : item.id,
    product_category: item.product_category,
    product_id: item.product_id,
    quantity: item.quantity,
});

export function ConfigAdjustmentModal({
    open,
    order,
    onCancel,
    onSuccess,
}: ConfigAdjustmentModalProps) {
    const [form] = Form.useForm();
    const finalAmount = Form.useWatch('final_amount', form);
    const [items, setItems] = useState<EditableConfigItem[]>([]);

    const { data: products = [], loading: productsLoading } = useRequest(fetchSalesProducts, {
        ready: open,
        refreshDeps: [open],
    });

    const productMap = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products]
    );

    const originalItems = useMemo(() => order?.original_items || order?.items || [], [order]);
    const currentItems = useMemo(() => {
        if (order?.latest_adjustment_items?.length) return order.latest_adjustment_items;
        return originalItems;
    }, [order, originalItems]);

    const adjustedAmount = useMemo(
        () => items.reduce((sum, item) => sum + getItemSubtotal(item, productMap), 0),
        [items, productMap]
    );
    const previousAdjustedAmount = Number(
        order?.latest_adjustment?.adjusted_amount ?? order?.original_amount ?? 0
    );
    const originalAmount = Number(order?.original_amount || 0);
    const currentFinalAmount = Number(finalAmount ?? order?.final_amount ?? 0);

    useEffect(() => {
        if (!open || !order) return;
        setItems(currentItems.map(toEditableItem));
        form.setFieldsValue({
            final_amount: Number(order.final_amount || 0),
            adjustment_note: '',
        });
    }, [currentItems, form, open, order]);

    const updateItem = (uid: string, patch: Partial<EditableConfigItem>) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.uid !== uid) return item;
                const next = { ...item, ...patch };
                if (patch.product_category && patch.product_category !== item.product_category) {
                    next.product_id = 0;
                }
                return next;
            })
        );
    };

    const addItem = () => {
        const category = categoryOptions[0]?.value || 'cpu';
        setItems((prev) => [
            ...prev,
            {
                uid: `new_${Date.now()}_${prev.length}`,
                source_order_item_id: null,
                product_category: category,
                product_id: 0,
                quantity: 1,
            },
        ]);
    };

    const removeItem = (uid: string) => {
        setItems((prev) => prev.filter((item) => item.uid !== uid));
    };

    const { runAsync: submitAdjustment, loading: saving } = useRequest(
        async () => {
            if (!order) return;
            const values = await form.validateFields();
            const validItems = items.filter((item) => item.product_id && item.quantity > 0);
            if (validItems.length === 0) {
                message.warning('调整后的装机配置不能为空');
                return;
            }

            await updateOrderConfigAdjustment(order.id, {
                items: validItems.map((item) => ({
                    source_order_item_id: item.source_order_item_id || null,
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
                adjusted_amount: adjustedAmount,
                final_amount: values.final_amount,
                adjustment_note: values.adjustment_note,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('装机配置已调整');
                onSuccess();
            },
            onError: (e) => message.error(e.message || '调整装机配置失败'),
        }
    );

    return (
        <Modal
            title="调整装机配置"
            open={open}
            onCancel={onCancel}
            onOk={submitAdjustment}
            confirmLoading={saving}
            destroyOnHidden
            width={980}
        >
            {!order ? null : (
                <Spin spinning={productsLoading}>
                    <div className="pt-4 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <InfoCell label="订单号" value={order.order_no} />
                            <InfoCell label="客户" value={order.customer_name} />
                            <InfoCell
                                label="当前状态"
                                value={order.latest_adjustment ? '已调整配置' : '未调整配置'}
                            />
                        </div>

                        {order.latest_adjustment && (
                            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700">
                                上次调整：{formatDate(order.latest_adjustment.created_at)} /{' '}
                                {order.latest_adjustment.created_by_username || '未知操作人'} /{' '}
                                {order.latest_adjustment.adjustment_note}
                            </div>
                        )}

                        <section>
                            <SectionTitle title="原始下单配置" />
                            <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                                {originalItems.map((item) => (
                                    <ReadonlyItemRow key={`origin_${item.id}`} item={item} />
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <SectionTitle title="调整后装机配置" />
                                <Button icon={<PlusOutlined />} onClick={addItem}>
                                    添加配件
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {items.map((item) => {
                                    const productOptions = products
                                        .filter(
                                            (product) => product.category === item.product_category
                                        )
                                        .map((product) => ({
                                            value: product.id,
                                            label: `${product.name} / ${formatPrice(getUnitPrice(product))}`,
                                        }));
                                    const product = productMap.get(item.product_id);
                                    return (
                                        <div
                                            key={item.uid}
                                            className="grid grid-cols-1 md:grid-cols-[140px_1fr_100px_120px_40px] gap-3 items-center rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                                        >
                                            <Select
                                                value={item.product_category}
                                                disabled={Boolean(item.source_order_item_id)}
                                                options={categoryOptions}
                                                onChange={(product_category) =>
                                                    updateItem(item.uid, { product_category })
                                                }
                                            />
                                            <Select
                                                showSearch
                                                value={item.product_id || undefined}
                                                placeholder="选择商品"
                                                optionFilterProp="label"
                                                options={productOptions}
                                                onChange={(product_id) =>
                                                    updateItem(item.uid, { product_id })
                                                }
                                            />
                                            <InputNumber
                                                min={1}
                                                precision={0}
                                                value={item.quantity}
                                                className="w-full"
                                                onChange={(quantity) =>
                                                    updateItem(item.uid, {
                                                        quantity: Number(quantity || 1),
                                                    })
                                                }
                                            />
                                            <div className="text-right font-mono font-bold">
                                                {formatPrice(
                                                    getUnitPrice(product) *
                                                        Number(item.quantity || 0)
                                                )}
                                            </div>
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => removeItem(item.uid)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <Divider className="my-2" />

                        <section>
                            <SectionTitle title="价格变化" />
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <PriceCell label="原始报价" value={originalAmount} />
                                <PriceCell label="上次配置报价" value={previousAdjustedAmount} />
                                <PriceCell label="调整后报价" value={adjustedAmount} emphasize />
                                <PriceCell
                                    label="相对上次差价"
                                    value={adjustedAmount - previousAdjustedAmount}
                                    signed
                                />
                                <PriceCell
                                    label="成交价变化"
                                    value={currentFinalAmount - Number(order.final_amount || 0)}
                                    signed
                                />
                            </div>
                            <Form form={form} layout="vertical" className="mt-4">
                                <Form.Item
                                    name="final_amount"
                                    label="最终成交价"
                                    rules={[{ required: true, message: '请输入最终成交价' }]}
                                >
                                    <Space.Compact className="w-full">
                                        <InputNumber
                                            min={0}
                                            precision={2}
                                            prefix="¥"
                                            className="w-full"
                                        />
                                        <Button
                                            icon={<SyncOutlined />}
                                            onClick={() =>
                                                form.setFieldsValue({
                                                    final_amount: Number(adjustedAmount.toFixed(2)),
                                                })
                                            }
                                        >
                                            同步报价
                                        </Button>
                                    </Space.Compact>
                                </Form.Item>
                                <Form.Item
                                    name="adjustment_note"
                                    label="调整说明"
                                    rules={[{ required: true, message: '请填写调整说明' }]}
                                >
                                    <Input.TextArea
                                        rows={3}
                                        placeholder="例如：客户升级显卡，补差 500 元"
                                    />
                                </Form.Item>
                            </Form>
                        </section>
                    </div>
                </Spin>
            )}
        </Modal>
    );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{value}</div>
        </div>
    );
}

function SectionTitle({ title }: { title: string }) {
    return <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 m-0">{title}</h3>;
}

function ReadonlyItemRow({ item }: { item: OrderSettlementItem }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800 px-3 py-2 text-sm">
            <div className="min-w-0">
                <Tag>{categoryNameMap[item.product_category] || item.product_category}</Tag>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.product_name}
                </span>
            </div>
            <div className="shrink-0 font-mono text-gray-500">
                × {item.quantity} / {formatPrice(Number(item.sale_price || 0))}
            </div>
        </div>
    );
}

function PriceCell({
    label,
    value,
    signed,
    emphasize,
}: {
    label: string;
    value: number;
    signed?: boolean;
    emphasize?: boolean;
}) {
    const displayValue = signed && value > 0 ? `+${formatPrice(value)}` : formatPrice(value);
    return (
        <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div
                className={`font-mono font-black ${
                    emphasize
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {displayValue}
            </div>
        </div>
    );
}
