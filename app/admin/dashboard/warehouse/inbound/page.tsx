'use client';

import { categoryNameMap } from '@/const/categories';
import { InboundOrder, Product, PurchaseOrder, PurchaseOrderItem, Supplier } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    DeleteOutlined,
    InboxOutlined,
    PlusOutlined,
    ReloadOutlined,
    RollbackOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Radio,
    Select,
    Switch,
    Table,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import {
    fetchDashboardProducts,
    fetchInboundOrders,
    fetchPurchaseOrders,
    fetchSuppliers,
    receivePurchaseOrder,
    returnInboundOrder,
    saveInboundOrder,
    updateInboundOrder,
} from '../../services';

type InboundSourceType = 'purchase_order' | 'opening_stock';

interface InboundFormItem {
    purchase_order_item_id?: number;
    product_id?: number;
    quantity: number;
    purchase_price?: number;
    serial_tracking_enabled?: boolean;
    serial_numbers?: string[];
    warranty_enabled?: boolean;
    warranty_until?: dayjs.Dayjs;
    note?: string;
}

type InboundOrderItemWithProduct = NonNullable<InboundOrder['items']>[number];

const inventoryStatusMap = {
    in_stock: { label: '在库', color: 'green' },
    sold: { label: '已售', color: 'blue' },
    returned: { label: '已退货', color: 'red' },
} as const;

const normalizeSerialNumbers = (serialNumbers?: string[]) =>
    (serialNumbers || []).map((serialNumber) => serialNumber?.trim()).filter(Boolean);

const calculateOrderGoodsAmount = (order: InboundOrder) =>
    (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.purchase_price || 0),
        0
    );

export default function InboundPage() {
    const [visible, setVisible] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [returnVisible, setReturnVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState<InboundOrder | null>(null);
    const [returningOrder, setReturningOrder] = useState<InboundOrder | null>(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [returnForm] = Form.useForm();

    const { data: inboundOrders = [], loading, refresh } = useRequest(fetchInboundOrders);
    const { data: suppliers = [] } = useRequest(fetchSuppliers);
    const { data: products = [] } = useRequest(fetchDashboardProducts);
    const { data: purchaseOrders = [] } = useRequest(() => fetchPurchaseOrders({ status: 'all' }));

    const watchedSourceType = Form.useWatch('source_type', form) as InboundSourceType | undefined;
    const watchedPurchaseOrderId = Form.useWatch('purchase_order_id', form) as number | undefined;
    const watchedItems = Form.useWatch('items', form) as InboundFormItem[] | undefined;

    const receivablePurchaseOrders = useMemo(
        () =>
            (purchaseOrders as PurchaseOrder[]).filter(
                (order) =>
                    order.status !== 'cancelled' && order.summary.total_remaining_quantity > 0
            ),
        [purchaseOrders]
    );

    const selectedPurchaseOrder = useMemo(
        () =>
            receivablePurchaseOrders.find(
                (order) => Number(order.id) === Number(watchedPurchaseOrderId)
            ),
        [receivablePurchaseOrders, watchedPurchaseOrderId]
    );

    const inboundSummary = useMemo(() => {
        const itemList = watchedItems || [];
        const goodsAmount = itemList.reduce(
            (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.purchase_price || 0),
            0
        );
        const totalQuantity = itemList.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);

        return {
            lineCount: itemList.length,
            totalQuantity,
            goodsAmount,
        };
    }, [watchedItems]);

    const supplierOptions = useMemo(
        () => suppliers.map((supplier: Supplier) => ({ label: supplier.name, value: supplier.id })),
        [suppliers]
    );

    const productOptions = useMemo(
        () =>
            (products as Product[]).map((product) => ({
                label: [
                    categoryNameMap[product.category] || product.category,
                    product.name,
                    product.barcode,
                ]
                    .filter(Boolean)
                    .join(' / '),
                value: product.id,
            })),
        [products]
    );

    const purchaseOrderOptions = useMemo(
        () =>
            receivablePurchaseOrders.map((order) => ({
                label: [
                    `JH-${order.id}`,
                    order.supplier?.name,
                    `未入库 ${order.summary.total_remaining_quantity} 件`,
                    `待付 ${formatPrice(order.summary.pending_payment)}`,
                ]
                    .filter(Boolean)
                    .join(' / '),
                value: order.id,
            })),
        [receivablePurchaseOrders]
    );

    const { runAsync: submitInboundOrder, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            const sourceType = values.source_type as InboundSourceType;
            const items = (values.items || []).map((item: InboundFormItem) => ({
                ...item,
                warranty_until: item.warranty_until?.toISOString() || null,
                serial_numbers: normalizeSerialNumbers(item.serial_numbers),
            }));

            if (sourceType === 'purchase_order') {
                if (!values.purchase_order_id) throw new Error('请选择进货单');
                await receivePurchaseOrder(values.purchase_order_id, {
                    inbound_at: values.inbound_at?.toISOString(),
                    note: values.note || null,
                    items: items.map((item: InboundFormItem) => ({
                        purchase_order_item_id: item.purchase_order_item_id,
                        quantity: item.quantity,
                        serial_tracking_enabled: Boolean(item.serial_tracking_enabled),
                        serial_numbers: item.serial_numbers,
                        warranty_enabled: Boolean(item.warranty_enabled),
                        warranty_until: item.warranty_until || null,
                        note: item.note || null,
                    })),
                });
                return;
            }

            await saveInboundOrder({
                source_type: 'opening_stock',
                supplier_id: values.supplier_id,
                inbound_at: values.inbound_at?.toISOString(),
                note: values.note || null,
                items: items.map((item: InboundFormItem) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    purchase_price: item.purchase_price,
                    serial_tracking_enabled: Boolean(item.serial_tracking_enabled),
                    serial_numbers: item.serial_numbers,
                    warranty_enabled: Boolean(item.warranty_enabled),
                    warranty_until: item.warranty_until || null,
                    note: item.note || null,
                })),
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('入库单已提交');
                setVisible(false);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitEdit, loading: editSaving } = useRequest(
        async () => {
            if (!editingOrder) return;
            const values = await editForm.validateFields();
            await updateInboundOrder(editingOrder.id, { note: values.note || null });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('入库单备注已更新');
                setEditVisible(false);
                setEditingOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitReturn, loading: returning } = useRequest(
        async () => {
            if (!returningOrder) return;
            const values = await returnForm.validateFields();
            await returnInboundOrder(returningOrder.id, {
                reason: values.reason,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('采购退货已处理');
                setReturnVisible(false);
                setReturningOrder(null);
                returnForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({
            source_type: 'purchase_order',
            inbound_at: dayjs(),
            items: [],
        });
        setVisible(true);
    };

    const openEdit = (order: InboundOrder) => {
        setEditingOrder(order);
        editForm.setFieldsValue({
            note: order.note,
        });
        setEditVisible(true);
    };

    const openReturn = (order: InboundOrder) => {
        setReturningOrder(order);
        returnForm.resetFields();
        setReturnVisible(true);
    };

    const handleSourceChange = (sourceType: InboundSourceType) => {
        form.setFieldsValue({
            source_type: sourceType,
            purchase_order_id: undefined,
            supplier_id: undefined,
            items:
                sourceType === 'opening_stock'
                    ? [{ quantity: 1, serial_tracking_enabled: false, warranty_enabled: false }]
                    : [],
        });
    };

    const handlePurchaseOrderChange = (purchaseOrderId: number) => {
        const order = receivablePurchaseOrders.find((item) => item.id === purchaseOrderId);
        form.setFieldsValue({
            supplier_id: order?.supplier_id,
            items:
                order?.items
                    .filter((item) => item.remaining_quantity > 0)
                    .map((item) => ({
                        purchase_order_item_id: item.id,
                        product_id: item.product_id,
                        quantity: item.remaining_quantity,
                        purchase_price: item.purchase_price,
                        serial_tracking_enabled: false,
                        warranty_enabled: false,
                    })) || [],
        });
    };

    const columns: ColumnsType<InboundOrder> = [
        {
            title: '入库单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">RK-{id}</span>,
        },
        {
            title: '来源',
            width: 130,
            render: (_, record) =>
                record.source_type === 'purchase_order' ? (
                    <Tag color="blue">JH-{record.purchase_order_id}</Tag>
                ) : (
                    <Tag color="default">历史库存</Tag>
                ),
        },
        {
            title: '商家',
            dataIndex: ['supplier', 'name'],
            render: (text) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">{text || '-'}</span>
            ),
        },
        {
            title: '明细',
            dataIndex: 'items',
            render: (items: InboundOrderItemWithProduct[] = []) => (
                <div className="space-y-1">
                    {items.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-xs text-gray-500 dark:text-gray-400">
                            {item.product?.name || '未知物品'} × {item.quantity}
                            <span className="ml-2 font-mono">
                                {formatPrice(Number(item.purchase_price || 0))}
                            </span>
                        </div>
                    ))}
                    {items.length > 3 && <div className="text-xs text-gray-300">...</div>}
                </div>
            ),
        },
        {
            title: '入库成本',
            width: 140,
            align: 'right',
            render: (_, record) => (
                <span className="font-mono font-black text-gray-900 dark:text-gray-100">
                    {formatPrice(calculateOrderGoodsAmount(record))}
                </span>
            ),
        },
        {
            title: '入库时间',
            dataIndex: 'inbound_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 180,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button type="link" onClick={() => openEdit(record)}>
                        详情
                    </Button>
                    <Button
                        danger
                        type="link"
                        icon={<RollbackOutlined />}
                        onClick={() => openReturn(record)}
                    >
                        退货
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <InboxOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Warehouse
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            入库单
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            确认实际到货并生成库存单件，付款与费用统一在进货单维护。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button icon={<ReloadOutlined />} onClick={refresh} />
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={openCreate}
                            className="h-12 px-6 rounded-xl bg-blue-600 border-none shadow-lg shadow-blue-600/20"
                        >
                            新增入库单
                        </Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={inboundOrders}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1100 }}
                    />
                </div>
            </div>

            <Modal
                title="新增入库单"
                open={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                destroyOnHidden
                width={1240}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <Form.Item name="source_type" label="入库来源">
                        <Radio.Group
                            optionType="button"
                            buttonStyle="solid"
                            onChange={(event) =>
                                handleSourceChange(event.target.value as InboundSourceType)
                            }
                            options={[
                                { label: '从进货单导入', value: 'purchase_order' },
                                { label: '历史库存', value: 'opening_stock' },
                            ]}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {watchedSourceType === 'purchase_order' && (
                            <Form.Item
                                name="purchase_order_id"
                                label="进货单"
                                rules={[{ required: true, message: '请选择进货单' }]}
                            >
                                <Select
                                    showSearch
                                    options={purchaseOrderOptions}
                                    optionFilterProp="label"
                                    onChange={handlePurchaseOrderChange}
                                    placeholder="选择有剩余未入库数量的进货单"
                                />
                            </Form.Item>
                        )}
                        <Form.Item
                            name="supplier_id"
                            label="进货商家"
                            rules={[{ required: true, message: '请选择进货商家' }]}
                        >
                            <Select
                                showSearch
                                options={supplierOptions}
                                optionFilterProp="label"
                                disabled={watchedSourceType === 'purchase_order'}
                            />
                        </Form.Item>
                        <Form.Item
                            name="inbound_at"
                            label="入库时间"
                            rules={[{ required: true, message: '请选择入库时间' }]}
                        >
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                    </div>

                    {selectedPurchaseOrder && (
                        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                                <ReadonlyCell
                                    label="进货单"
                                    value={`JH-${selectedPurchaseOrder.id}`}
                                />
                                <ReadonlyCell
                                    label="商家"
                                    value={selectedPurchaseOrder.supplier?.name || '-'}
                                />
                                <ReadonlyCell
                                    label="剩余未入库"
                                    value={`${selectedPurchaseOrder.summary.total_remaining_quantity} 件`}
                                    strong
                                />
                                <ReadonlyCell
                                    label="已入库"
                                    value={`${selectedPurchaseOrder.summary.total_received_quantity} 件`}
                                />
                                <ReadonlyCell
                                    label="应付款"
                                    value={formatPrice(
                                        selectedPurchaseOrder.summary.payable_amount
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                        入库明细
                                    </h3>
                                    {watchedSourceType === 'opening_stock' && (
                                        <Button
                                            onClick={() =>
                                                add({
                                                    quantity: 1,
                                                    serial_tracking_enabled: false,
                                                    warranty_enabled: false,
                                                })
                                            }
                                            icon={<PlusOutlined />}
                                        >
                                            添加明细
                                        </Button>
                                    )}
                                </div>
                                {fields.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-black/20">
                                        {watchedSourceType === 'purchase_order'
                                            ? '请选择进货单后自动生成可入库明细'
                                            : '请添加历史库存明细'}
                                    </div>
                                )}
                                {fields.map((field, index) =>
                                    watchedSourceType === 'purchase_order' ? (
                                        <PurchaseInboundItemForm
                                            key={field.key}
                                            fieldName={field.name}
                                            displayIndex={index}
                                            form={form}
                                            sourceItem={
                                                selectedPurchaseOrder?.items.filter(
                                                    (item) => item.remaining_quantity > 0
                                                )[index]
                                            }
                                        />
                                    ) : (
                                        <OpeningStockItemForm
                                            key={field.key}
                                            fieldName={field.name}
                                            displayIndex={index}
                                            productOptions={productOptions}
                                            products={products as Product[]}
                                            form={form}
                                            onRemove={() => remove(field.name)}
                                            canRemove={fields.length > 1}
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </Form.List>

                    <InboundSummary summary={inboundSummary} />

                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={() => setVisible(false)}>取消</Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={submitInboundOrder}
                        >
                            提交入库
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="入库单详情"
                open={editVisible}
                onCancel={() => setEditVisible(false)}
                onOk={submitEdit}
                confirmLoading={editSaving}
                destroyOnHidden
                width={1000}
            >
                <Form form={editForm} layout="vertical" className="pt-4">
                    {editingOrder && <InboundOrderReadonlyDetails order={editingOrder} />}
                    <Form.Item name="note" label="备注" className="mt-6">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <div className="text-xs text-gray-400">
                        已提交入库单不允许修改物品、数量、成本价和序列号；这里只能补充备注。
                    </div>
                </Form>
            </Modal>

            <Modal
                title={returningOrder ? `采购退货 RK-${returningOrder.id}` : '采购退货'}
                open={returnVisible}
                onCancel={() => setReturnVisible(false)}
                onOk={submitReturn}
                confirmLoading={returning}
                okButtonProps={{ danger: true }}
                okText="确认退货"
                cancelText="取消"
                destroyOnHidden
                width={620}
            >
                <Form form={returnForm} layout="vertical" className="pt-4">
                    <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10">
                        仅退还该入库单中仍在库的库存件，已售出或已退货库存不会被处理。
                    </div>
                    <Form.Item
                        name="reason"
                        label="退货原因"
                        rules={[{ required: true, message: '请填写退货原因' }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function PurchaseInboundItemForm({
    fieldName,
    displayIndex,
    form,
    sourceItem,
}: {
    fieldName: number;
    displayIndex: number;
    form: ReturnType<typeof Form.useForm>[0];
    sourceItem?: PurchaseOrderItem;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-black/20 p-4">
            <InboundItemHeader
                title={`入库明细 ${displayIndex + 1}`}
                subtitle="商品、采购单价来自进货单，本次入库数量不能超过剩余未入库数量"
            />
            <Form.Item name={[fieldName, 'purchase_order_item_id']} hidden>
                <Input />
            </Form.Item>
            <Form.Item name={[fieldName, 'product_id']} hidden>
                <Input />
            </Form.Item>
            <Form.Item name={[fieldName, 'purchase_price']} hidden>
                <Input />
            </Form.Item>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ReadonlyField
                    label="物品"
                    value={sourceItem?.product?.name || '未知物品'}
                    subValue={`条形码 ${sourceItem?.product?.barcode || '-'}`}
                />
                <Form.Item
                    name={[fieldName, 'quantity']}
                    label="本次入库数量"
                    rules={[{ required: true, message: '请输入本次入库数量' }]}
                >
                    <InputNumber
                        min={1}
                        max={sourceItem?.remaining_quantity}
                        precision={0}
                        className="w-full"
                    />
                </Form.Item>
                <ReadonlyField
                    label="采购单价"
                    value={formatPrice(sourceItem?.purchase_price || 0)}
                    subValue={`剩余 ${sourceItem?.remaining_quantity || 0} 件`}
                />
                <SerialTrackingSwitch fieldName={fieldName} form={form} />
            </div>
            <InboundItemExtraFields fieldName={fieldName} form={form} sourceType="purchase_order" />
        </div>
    );
}

function OpeningStockItemForm({
    fieldName,
    displayIndex,
    productOptions,
    products,
    form,
    onRemove,
    canRemove,
}: {
    fieldName: number;
    displayIndex: number;
    productOptions: { label: string; value: number }[];
    products: Product[];
    form: ReturnType<typeof Form.useForm>[0];
    onRemove: () => void;
    canRemove: boolean;
}) {
    const serialTrackingEnabled = Boolean(
        Form.useWatch(['items', fieldName, 'serial_tracking_enabled'], form)
    );

    const handleProductChange = (productId: number) => {
        const product = products.find((item) => item.id === productId);
        const items = form.getFieldValue('items') || [];
        items[fieldName] = {
            ...items[fieldName],
            product_id: productId,
            purchase_price: items[fieldName]?.purchase_price ?? product?.price ?? 0,
        };
        form.setFieldsValue({ items });
    };

    return (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-black/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <InboundItemHeader
                    title={`入库明细 ${displayIndex + 1}`}
                    subtitle="历史库存不会产生应付款，如需供应商账款请先创建进货单"
                />
                {canRemove && (
                    <Button
                        danger
                        type="text"
                        htmlType="button"
                        icon={<DeleteOutlined />}
                        onClick={(event) => {
                            event.preventDefault();
                            onRemove();
                        }}
                    >
                        删除明细
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Form.Item
                    name={[fieldName, 'product_id']}
                    label="物品"
                    rules={[{ required: true, message: '请选择物品' }]}
                >
                    <Select
                        showSearch
                        options={productOptions}
                        optionFilterProp="label"
                        onChange={handleProductChange}
                    />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'quantity']}
                    label="数量"
                    rules={[{ required: true, message: '请输入数量' }]}
                >
                    <InputNumber
                        min={serialTrackingEnabled ? 0 : 1}
                        precision={0}
                        className="w-full"
                        disabled={serialTrackingEnabled}
                    />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'purchase_price']}
                    label="单件成本"
                    rules={[{ required: true, message: '请输入成本价' }]}
                >
                    <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                </Form.Item>
                <SerialTrackingSwitch
                    fieldName={fieldName}
                    form={form}
                    sourceType="opening_stock"
                />
            </div>
            <InboundItemExtraFields fieldName={fieldName} form={form} sourceType="opening_stock" />
        </div>
    );
}

function SerialTrackingSwitch({
    fieldName,
    form,
    sourceType,
}: {
    fieldName: number;
    form: ReturnType<typeof Form.useForm>[0];
    sourceType?: InboundSourceType;
}) {
    const handleChange = (checked: boolean) => {
        if (sourceType !== 'opening_stock') return;

        const items = form.getFieldValue('items') || [];
        const serialNumbers = normalizeSerialNumbers(items[fieldName]?.serial_numbers);
        items[fieldName] = {
            ...items[fieldName],
            serial_tracking_enabled: checked,
            quantity: checked ? serialNumbers.length : items[fieldName]?.quantity || 1,
        };
        form.setFieldsValue({ items });
    };

    return (
        <Form.Item
            name={[fieldName, 'serial_tracking_enabled']}
            label="序列号管理"
            valuePropName="checked"
        >
            <Switch checkedChildren="启用" unCheckedChildren="关闭" onChange={handleChange} />
        </Form.Item>
    );
}

function InboundItemExtraFields({
    fieldName,
    form,
    sourceType,
}: {
    fieldName: number;
    form: ReturnType<typeof Form.useForm>[0];
    sourceType: InboundSourceType;
}) {
    const handleSerialChange = (serialNumbers: string[]) => {
        if (sourceType !== 'opening_stock') return;

        const items = form.getFieldValue('items') || [];
        if (!items[fieldName]?.serial_tracking_enabled) return;

        items[fieldName] = {
            ...items[fieldName],
            serial_numbers: serialNumbers,
            quantity: normalizeSerialNumbers(serialNumbers).length,
        };
        form.setFieldsValue({ items });
    };

    const validateSerialNumbers = () => {
        const items = form.getFieldValue('items') || [];
        const item = items[fieldName] || {};
        const serialNumbers = normalizeSerialNumbers(item.serial_numbers);
        const quantity = Number(item.quantity || 0);

        if (item.serial_tracking_enabled && serialNumbers.length !== quantity) {
            return Promise.reject(new Error('启用序列号管理时，序列号数量必须等于入库数量'));
        }

        if (!item.serial_tracking_enabled && serialNumbers.length > quantity) {
            return Promise.reject(new Error('序列号数量不能超过入库数量'));
        }

        return Promise.resolve();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
                name={[fieldName, 'warranty_enabled']}
                label="是否质保"
                valuePropName="checked"
            >
                <Switch checkedChildren="质保" unCheckedChildren="无" />
            </Form.Item>
            <Form.Item name={[fieldName, 'warranty_until']} label="质保到期">
                <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item
                name={[fieldName, 'serial_numbers']}
                label="序列号"
                rules={[{ validator: validateSerialNumbers }]}
            >
                <Select
                    mode="tags"
                    tokenSeparators={[',', '，', '\n']}
                    placeholder="按回车添加"
                    onChange={handleSerialChange}
                />
            </Form.Item>
            <Form.Item name={[fieldName, 'note']} label="备注">
                <Input />
            </Form.Item>
        </div>
    );
}

function InboundItemHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</div>
            <div className="text-xs text-gray-400">{subtitle}</div>
        </div>
    );
}

function ReadonlyField({
    label,
    value,
    subValue,
}: {
    label: string;
    value: string;
    subValue?: string;
}) {
    return (
        <div>
            <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">{label}</div>
            <div className="min-h-8 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900 dark:bg-black/20 dark:text-gray-100">
                {value}
            </div>
            {subValue && <div className="mt-1 text-xs text-gray-400">{subValue}</div>}
        </div>
    );
}

function InboundOrderReadonlyDetails({ order }: { order: InboundOrder }) {
    const goodsAmount = calculateOrderGoodsAmount(order);
    const totalQuantity = (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                <ReadonlyCell label="入库单" value={`RK-${order.id}`} />
                <ReadonlyCell
                    label="来源"
                    value={
                        order.source_type === 'purchase_order'
                            ? `JH-${order.purchase_order_id}`
                            : '历史库存'
                    }
                />
                <ReadonlyCell label="进货商家" value={order.supplier?.name || '-'} />
                <ReadonlyCell label="入库时间" value={formatDate(order.inbound_at)} />
                <ReadonlyCell label="明细数" value={`${order.items?.length || 0} 条`} />
                <ReadonlyCell label="库存件数" value={`${totalQuantity} 件`} />
                <ReadonlyCell label="入库成本" value={formatPrice(goodsAmount)} strong />
            </div>

            <div className="space-y-3">
                <div className="font-bold text-gray-900 dark:text-gray-100">入库明细</div>
                {(order.items || []).map((item) => (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]"
                    >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                    {item.product?.name || '未知物品'}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    {categoryNameMap[item.product?.category || ''] ||
                                        item.product?.category ||
                                        '-'}{' '}
                                    / 数量 {item.quantity}
                                </div>
                                <div className="mt-1 font-mono text-xs text-gray-400">
                                    条形码 {item.product?.barcode || '-'}
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                                    {formatPrice(item.purchase_price)}
                                </div>
                                <div className="text-xs text-gray-400">单件成本</div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Tag color={item.serial_tracking_enabled ? 'blue' : 'default'}>
                                {item.serial_tracking_enabled ? '序列号管理' : '未启用序列号管理'}
                            </Tag>
                            <Tag color={item.warranty_enabled ? 'green' : 'default'}>
                                {item.warranty_enabled
                                    ? `质保至 ${item.warranty_until ? formatDate(item.warranty_until) : '-'}`
                                    : '无质保'}
                            </Tag>
                            {item.note && <Tag>{item.note}</Tag>}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                            {(item.inventory_items || []).map((inventory) => {
                                const status =
                                    inventoryStatusMap[inventory.status] ||
                                    inventoryStatusMap.in_stock;
                                return (
                                    <div
                                        key={inventory.id}
                                        className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs dark:bg-black/30"
                                    >
                                        <span className="font-mono text-gray-500">
                                            #{inventory.id} / {inventory.serial_number || '-'}
                                        </span>
                                        <Tag color={status.color}>{status.label}</Tag>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ReadonlyCell({
    label,
    value,
    strong,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div>
            <div className="text-xs text-gray-400">{label}</div>
            <div
                className={`mt-1 truncate font-medium ${
                    strong
                        ? 'font-mono text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
            </div>
        </div>
    );
}

function InboundSummary({
    summary,
}: {
    summary: {
        lineCount: number;
        totalQuantity: number;
        goodsAmount: number;
    };
}) {
    return (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="mb-3 flex items-center justify-between">
                <div className="font-bold text-gray-900 dark:text-gray-100">本次入库汇总</div>
                <div className="text-xs text-gray-400">提交前核对数量、成本和序列号</div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <SummaryCell label="明细数" value={`${summary.lineCount} 条`} />
                <SummaryCell label="入库数量" value={`${summary.totalQuantity} 件`} />
                <SummaryCell label="入库成本" value={formatPrice(summary.goodsAmount)} strong />
            </div>
        </div>
    );
}

function SummaryCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="rounded-xl bg-white/80 p-3 dark:bg-black/20">
            <div className="text-xs text-gray-400">{label}</div>
            <div
                className={`mt-1 font-mono text-base font-black ${
                    strong ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
            </div>
        </div>
    );
}
