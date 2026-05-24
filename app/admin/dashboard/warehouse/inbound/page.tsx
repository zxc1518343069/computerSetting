'use client';

import { InboundOrder, Product, Supplier } from '@/const/types';
import { categoryNameMap } from '@/const/categories';
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
    Popconfirm,
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
    fetchSuppliers,
    returnInboundOrder,
    saveInboundOrder,
    updateInboundOrder,
} from '../../services';

interface InboundFormItem {
    product_id: number;
    quantity: number;
    purchase_price: number;
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

export default function InboundPage() {
    const [visible, setVisible] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState<InboundOrder | null>(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const { data: inboundOrders = [], loading, refresh } = useRequest(fetchInboundOrders);
    const { data: suppliers = [] } = useRequest(fetchSuppliers);
    const { data: products = [] } = useRequest(fetchDashboardProducts);
    const watchedItems = Form.useWatch('items', form) as InboundFormItem[] | undefined;
    const watchedShippingFee = Form.useWatch('shipping_fee', form);
    const watchedMiscFee = Form.useWatch('misc_fee', form);

    const inboundSummary = useMemo(() => {
        const itemList = watchedItems || [];
        const goodsAmount = itemList.reduce(
            (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.purchase_price || 0),
            0
        );
        const totalQuantity = itemList.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
        const shippingFee = Number(watchedShippingFee || 0);
        const miscFee = Number(watchedMiscFee || 0);

        return {
            lineCount: itemList.length,
            totalQuantity,
            goodsAmount,
            shippingFee,
            miscFee,
            totalAmount: goodsAmount + shippingFee + miscFee,
        };
    }, [watchedItems, watchedShippingFee, watchedMiscFee]);

    const supplierOptions = useMemo(
        () => suppliers.map((supplier: Supplier) => ({ label: supplier.name, value: supplier.id })),
        [suppliers]
    );

    const productOptions = useMemo(
        () =>
            (products as Product[]).map((product) => ({
                label: `${categoryNameMap[product.category] || product.category} / ${product.name}`,
                value: product.id,
            })),
        [products]
    );

    const { runAsync: submitInboundOrder, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            const payload = {
                ...values,
                inbound_at: values.inbound_at?.toISOString(),
                items: values.items.map((item: InboundFormItem) => ({
                    ...item,
                    warranty_until: item.warranty_until?.toISOString() || null,
                    serial_numbers: (item.serial_numbers || [])
                        .map((sn) => sn?.trim())
                        .filter(Boolean),
                })),
            };
            await saveInboundOrder(payload);
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
            await updateInboundOrder(editingOrder.id, values);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('入库单已更新');
                setEditVisible(false);
                setEditingOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitReturn, loading: returning } = useRequest(returnInboundOrder, {
        manual: true,
        onSuccess: () => {
            message.success('采购退货已处理');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({
            inbound_at: dayjs(),
            shipping_fee: 0,
            misc_fee: 0,
            is_paid: false,
            items: [{ quantity: 1, warranty_enabled: false }],
        });
        setVisible(true);
    };

    const openEdit = (order: InboundOrder) => {
        setEditingOrder(order);
        editForm.setFieldsValue({
            is_paid: order.is_paid,
            shipping_fee: order.shipping_fee,
            misc_fee: order.misc_fee,
            note: order.note,
        });
        setEditVisible(true);
    };

    const columns: ColumnsType<InboundOrder> = [
        {
            title: '入库单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">#{id}</span>,
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
            title: '费用',
            width: 160,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>运费 {formatPrice(Number(record.shipping_fee || 0))}</div>
                    <div>杂费 {formatPrice(Number(record.misc_fee || 0))}</div>
                </div>
            ),
        },
        {
            title: '付款',
            dataIndex: 'is_paid',
            width: 100,
            render: (paid) => (
                <Tag color={paid ? 'green' : 'orange'}>{paid ? '已付款' : '未付款'}</Tag>
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
                        编辑
                    </Button>
                    <Popconfirm
                        title="确认采购退货？"
                        description="仅退还该入库单中仍在库的库存件，已售出库存不会被处理。"
                        okText="退货"
                        cancelText="取消"
                        okButtonProps={{ danger: true, loading: returning }}
                        onConfirm={() => submitReturn(record.id)}
                    >
                        <Button danger type="link" icon={<RollbackOutlined />}>
                            退货
                        </Button>
                    </Popconfirm>
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
                            物品入库
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            提交入库单后生成独立库存，每件库存保留自己的成本价与序列号。
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
                    />
                </div>
            </div>

            <Modal
                title="新增入库单"
                open={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                destroyOnHidden
                width={1200}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Form.Item
                            name="supplier_id"
                            label="进货商家"
                            rules={[{ required: true, message: '请选择进货商家' }]}
                        >
                            <Select showSearch options={supplierOptions} optionFilterProp="label" />
                        </Form.Item>
                        <Form.Item
                            name="inbound_at"
                            label="入库时间"
                            rules={[{ required: true, message: '请选择入库时间' }]}
                        >
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                        <Form.Item name="shipping_fee" label="运费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                        <Form.Item name="misc_fee" label="杂费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                    </div>
                    <Form.Item name="is_paid" label="是否付款" valuePropName="checked">
                        <Switch checkedChildren="已付款" unCheckedChildren="未付款" />
                    </Form.Item>
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
                                    <Button
                                        onClick={() =>
                                            add({ quantity: 1, warranty_enabled: false })
                                        }
                                        icon={<PlusOutlined />}
                                    >
                                        添加明细
                                    </Button>
                                </div>
                                {fields.map((field, index) => (
                                    <InboundItemForm
                                        key={field.key}
                                        fieldName={field.name}
                                        displayIndex={index}
                                        productOptions={productOptions}
                                        products={products as Product[]}
                                        form={form}
                                        onRemove={() => remove(field.name)}
                                        canRemove={fields.length > 1}
                                    />
                                ))}
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
                title="编辑入库单"
                open={editVisible}
                onCancel={() => setEditVisible(false)}
                onOk={submitEdit}
                confirmLoading={editSaving}
                destroyOnHidden
                width={1000}
            >
                <Form form={editForm} layout="vertical" className="pt-4">
                    {editingOrder && <InboundOrderReadonlyDetails order={editingOrder} />}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Form.Item name="shipping_fee" label="运费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                        <Form.Item name="misc_fee" label="杂费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                        <Form.Item name="is_paid" label="是否付款" valuePropName="checked">
                            <Switch checkedChildren="已付款" unCheckedChildren="未付款" />
                        </Form.Item>
                    </div>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <div className="text-xs text-gray-400">
                        已提交入库单暂不允许修改物品明细、数量和成本价；费用、付款状态和备注可调整。
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function InboundItemForm({
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
                <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        入库明细 {displayIndex + 1}
                    </div>
                    <div className="text-xs text-gray-400">成本价会写入每一件库存的独立成本</div>
                </div>
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
                    <InputNumber min={1} precision={0} className="w-full" />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'purchase_price']}
                    label="单件成本"
                    rules={[{ required: true, message: '请输入成本价' }]}
                >
                    <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'warranty_enabled']}
                    label="是否质保"
                    valuePropName="checked"
                >
                    <Switch checkedChildren="质保" unCheckedChildren="无" />
                </Form.Item>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item name={[fieldName, 'warranty_until']} label="质保到期">
                    <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item name={[fieldName, 'serial_numbers']} label="序列号">
                    <Select
                        mode="tags"
                        tokenSeparators={[',', '，', '\n']}
                        placeholder="按回车添加，可不填"
                    />
                </Form.Item>
                <Form.Item name={[fieldName, 'note']} label="备注">
                    <Input />
                </Form.Item>
            </div>
        </div>
    );
}

function InboundOrderReadonlyDetails({ order }: { order: InboundOrder }) {
    const goodsAmount = (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.purchase_price || 0),
        0
    );
    const totalQuantity = (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                <ReadonlyCell label="入库单" value={`#${order.id}`} />
                <ReadonlyCell label="进货商家" value={order.supplier?.name || '-'} />
                <ReadonlyCell label="入库时间" value={formatDate(order.inbound_at)} />
                <ReadonlyCell label="货款小计" value={formatPrice(goodsAmount)} strong />
                <ReadonlyCell label="明细数" value={`${order.items?.length || 0} 条`} />
                <ReadonlyCell label="库存件数" value={`${totalQuantity} 件`} />
                <ReadonlyCell label="当前运费" value={formatPrice(order.shipping_fee || 0)} />
                <ReadonlyCell label="当前杂费" value={formatPrice(order.misc_fee || 0)} />
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
                            </div>
                            <div className="text-right text-sm">
                                <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                                    {formatPrice(item.purchase_price)}
                                </div>
                                <div className="text-xs text-gray-400">单件成本</div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
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
        shippingFee: number;
        miscFee: number;
        totalAmount: number;
    };
}) {
    return (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="mb-3 flex items-center justify-between">
                <div className="font-bold text-gray-900 dark:text-gray-100">本次入库汇总</div>
                <div className="text-xs text-gray-400">提交前核对数量和总金额</div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <SummaryCell label="明细数" value={`${summary.lineCount} 条`} />
                <SummaryCell label="入库数量" value={`${summary.totalQuantity} 件`} />
                <SummaryCell label="货款小计" value={formatPrice(summary.goodsAmount)} />
                <SummaryCell label="运费" value={formatPrice(summary.shippingFee)} />
                <SummaryCell label="杂费" value={formatPrice(summary.miscFee)} />
                <SummaryCell label="应付合计" value={formatPrice(summary.totalAmount)} strong />
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
