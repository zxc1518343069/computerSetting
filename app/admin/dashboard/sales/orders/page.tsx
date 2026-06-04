'use client';

import { InventoryItem, OrderSettlementItem, SalesOrder } from '@/const/types';
import { categoryNameMap } from '@/const';
import { formatDate, formatPrice } from '@/utils';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    Checkbox,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Segmented,
    Select,
    Switch,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import {
    fetchCustomers,
    fetchInventoryItems,
    fetchOrders,
    settleOrder,
    updateOrder,
} from '../../services';
import { ConfigAdjustmentModal } from './components/ConfigAdjustmentModal';

const getSettlementItemKey = (item: OrderSettlementItem) =>
    `${item.source_type || 'order_item'}_${item.id}`;

export default function OrdersPage() {
    const [query, setQuery] = useState({ search: '', status: undefined as string | undefined });
    const [editVisible, setEditVisible] = useState(false);
    const [adjustVisible, setAdjustVisible] = useState(false);
    const [settleVisible, setSettleVisible] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<SalesOrder | null>(null);
    const [inventoryOptions, setInventoryOptions] = useState<Record<string, InventoryItem[]>>({});
    const [editForm] = Form.useForm();
    const [settleForm] = Form.useForm();
    const editCustomerSource = Form.useWatch('customer_source', editForm) || 'new';
    const shouldSaveCustomer = Form.useWatch('save_customer', editForm);

    const {
        data: orders = [],
        loading,
        refresh,
    } = useRequest(() => fetchOrders(query), {
        refreshDeps: [query],
        debounceWait: 300,
    });
    const { data: customers = [] } = useRequest(fetchCustomers);
    const customerOptions = useMemo(
        () =>
            customers.map((customer) => ({
                label: `${customer.name} / ${customer.phone}`,
                value: customer.id,
            })),
        [customers]
    );

    const { runAsync: submitEdit, loading: editSaving } = useRequest(
        async () => {
            if (!currentOrder) return;
            const values = await editForm.validateFields();
            await updateOrder(currentOrder.id, {
                customer_id:
                    values.customer_source === 'existing' ? values.customer_id || null : null,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                save_customer:
                    values.customer_source === 'new' ? Boolean(values.save_customer) : false,
                final_amount: values.final_amount,
                is_paid: values.is_paid,
                note: values.note,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('订单已更新');
                setEditVisible(false);
                setCurrentOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitSettle, loading: settling } = useRequest(
        async () => {
            if (!currentOrder) return;
            const values = await settleForm.validateFields();
            const bindings = (currentOrder.items || []).map((item) => ({
                ...(item.source_type === 'adjustment_item'
                    ? { adjustment_item_id: item.id }
                    : { order_item_id: item.id }),
                inventory_item_ids: values[`item_${getSettlementItemKey(item)}`] || [],
            }));
            await settleOrder(currentOrder.id, { bindings });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('订单已结算');
                setSettleVisible(false);
                setCurrentOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openEdit = (order: SalesOrder) => {
        setCurrentOrder(order);
        editForm.resetFields();
        editForm.setFieldsValue({
            customer_source: order.customer_id ? 'existing' : 'new',
            customer_id: order.customer_id || undefined,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            save_customer: false,
            final_amount: Number(order.final_amount),
            is_paid: Boolean(order.is_paid),
            note: order.note,
        });
        setEditVisible(true);
    };

    const openAdjust = (order: SalesOrder) => {
        setCurrentOrder(order);
        setAdjustVisible(true);
    };

    const openSettle = async (order: SalesOrder) => {
        setCurrentOrder(order);
        settleForm.resetFields();
        const optionEntries = await Promise.all(
            (order.items || []).map(async (item) => {
                const list = await fetchInventoryItems({
                    product_id: item.product_id,
                    status: 'in_stock',
                });
                return [getSettlementItemKey(item), list] as const;
            })
        );
        setInventoryOptions(Object.fromEntries(optionEntries));
        setSettleVisible(true);
    };

    const columns: ColumnsType<SalesOrder> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            width: 180,
            render: (text, record) => (
                <div className="space-y-1">
                    <span className="font-mono text-gray-500">{text}</span>
                    {record.latest_adjustment && (
                        <div>
                            <Tag color="blue">已调整配置</Tag>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: '客户',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.customer_name}
                    </div>
                    <div className="text-xs text-gray-400">
                        {record.customer_phone || '未留手机号'}
                    </div>
                    {record.customer_id && (
                        <Tag className="mt-1" color="blue">
                            已关联客户
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: '库存状态',
            width: 120,
            render: (_, record) => <InventoryStatus order={record} />,
        },
        {
            title: '成交金额',
            dataIndex: 'final_amount',
            align: 'right',
            width: 140,
            render: (amount) => (
                <span className="font-mono font-bold">{formatPrice(Number(amount))}</span>
            ),
        },
        {
            title: '收款',
            dataIndex: 'is_paid',
            width: 100,
            render: (paid) => (
                <Tag color={paid ? 'green' : 'orange'}>{paid ? '已收款' : '未收款'}</Tag>
            ),
        },
        {
            title: '成本/利润',
            width: 170,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    <div>成本 {formatPrice(Number(record.cost_amount || 0))}</div>
                    <div className="text-emerald-500">
                        利润 {formatPrice(Number(record.profit_amount || 0))}
                    </div>
                </div>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (status) => {
                const map = {
                    pending: { label: '待结算', color: 'orange' },
                    completed: { label: '已结算', color: 'green' },
                    cancelled: { label: '已取消', color: 'default' },
                } as const;
                const config = map[status as keyof typeof map] || map.pending;
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: '保存人',
            dataIndex: 'created_by_username',
            width: 120,
            render: (username) => username || '-',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 250,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip
                        title={record.status === 'pending' ? '编辑订单' : '已结算订单不可编辑'}
                    >
                        <Button
                            type="text"
                            disabled={record.status !== 'pending'}
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip
                        title={
                            record.status === 'pending' ? '调整装机配置' : '已结算订单不可调整配置'
                        }
                    >
                        <Button
                            type="text"
                            disabled={record.status !== 'pending'}
                            icon={<SwapOutlined />}
                            onClick={() => openAdjust(record)}
                        />
                    </Tooltip>
                    <Button
                        type="link"
                        disabled={record.status !== 'pending'}
                        onClick={() => openSettle(record)}
                    >
                        结算
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
                            <ShoppingCartOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Sales
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            订单列表
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            前台保存订单后进入待结算，后台结算时绑定具体库存并扣减库存。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-wrap items-center gap-3">
                    <Input.Search
                        allowClear
                        placeholder="搜索订单号、客户名称、手机号..."
                        value={query.search}
                        onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
                        className="max-w-md"
                    />
                    <Select
                        allowClear
                        placeholder="订单状态"
                        value={query.status}
                        onChange={(status) => setQuery((prev) => ({ ...prev, status }))}
                        className="w-40"
                        options={[
                            { value: 'pending', label: '待结算' },
                            { value: 'completed', label: '已结算' },
                            { value: 'cancelled', label: '已取消' },
                        ]}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={orders}
                        expandable={{
                            expandedRowRender: (record) => <OrderDetails order={record} />,
                        }}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </div>

            <Modal
                title="编辑待结算订单"
                open={editVisible}
                onCancel={() => setEditVisible(false)}
                onOk={submitEdit}
                confirmLoading={editSaving}
                destroyOnHidden
                width={680}
            >
                <Form form={editForm} layout="vertical" className="pt-4">
                    <Form.Item name="customer_source" label="客户来源">
                        <Segmented
                            options={[
                                { label: '已有客户', value: 'existing' },
                                { label: '新客户', value: 'new' },
                            ]}
                        />
                    </Form.Item>
                    {editCustomerSource === 'existing' ? (
                        <Form.Item
                            name="customer_id"
                            label="选择客户"
                            rules={[{ required: true, message: '请选择客户' }]}
                        >
                            <Select
                                showSearch
                                placeholder="请选择已有客户"
                                optionFilterProp="label"
                                options={customerOptions}
                                onChange={(id) => {
                                    const customer = customers.find((item) => item.id === id);
                                    editForm.setFieldsValue({
                                        customer_name: customer?.name,
                                        customer_phone: customer?.phone,
                                    });
                                }}
                            />
                        </Form.Item>
                    ) : (
                        <>
                            <Form.Item
                                name="customer_name"
                                label="客户名称"
                                rules={[{ required: true, message: '请输入客户名称' }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="customer_phone"
                                label="手机号"
                                rules={[
                                    {
                                        required: Boolean(shouldSaveCustomer),
                                        message: '保存客户信息时请输入手机号',
                                    },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item name="save_customer" valuePropName="checked">
                                <Checkbox>是否保存客户信息</Checkbox>
                            </Form.Item>
                        </>
                    )}
                    <Form.Item
                        name="final_amount"
                        label="最终成交金额"
                        rules={[{ required: true, message: '请输入最终成交金额' }]}
                    >
                        <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                    </Form.Item>
                    <Form.Item name="is_paid" label="是否已收款" valuePropName="checked">
                        <Switch checkedChildren="已收款" unCheckedChildren="未收款" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <ConfigAdjustmentModal
                open={adjustVisible}
                order={currentOrder}
                onCancel={() => setAdjustVisible(false)}
                onSuccess={() => {
                    setAdjustVisible(false);
                    setCurrentOrder(null);
                    refresh();
                }}
            />

            <Modal
                title="订单结算"
                open={settleVisible}
                onCancel={() => setSettleVisible(false)}
                onOk={submitSettle}
                confirmLoading={settling}
                destroyOnHidden
                width={820}
            >
                <Form form={settleForm} layout="vertical" className="pt-4">
                    {(currentOrder?.items || []).map((item) => {
                        const itemKey = getSettlementItemKey(item);
                        const options = inventoryOptions[itemKey] || [];
                        return (
                            <Form.Item
                                key={itemKey}
                                name={`item_${itemKey}`}
                                label={`${item.product_name} × ${item.quantity}`}
                                rules={[
                                    {
                                        validator: (_, value) => {
                                            if (!value || value.length !== item.quantity) {
                                                return Promise.reject(
                                                    new Error(`请选择 ${item.quantity} 件库存`)
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    },
                                ]}
                            >
                                <Select
                                    mode="multiple"
                                    maxCount={item.quantity}
                                    placeholder={
                                        options.length ? '请选择具体库存物品' : '暂无可用库存'
                                    }
                                    options={options.map((inventory) => ({
                                        value: inventory.id,
                                        label: `#${inventory.id} / ${inventory.serial_number || '-'} / ${formatPrice(Number(inventory.cost_price))}`,
                                    }))}
                                />
                            </Form.Item>
                        );
                    })}
                    <div className="text-xs text-gray-400">
                        结算后将绑定所选库存物品并扣减库存。销售退货流程已列入 TODO。
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function OrderDetails({ order }: { order: SalesOrder }) {
    const originalItems = order.original_items || order.items || [];
    const actualItems = order.latest_adjustment ? order.items || [] : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrderItemsBlock title="原始下单配置" items={originalItems} />
            <div className="space-y-3">
                <OrderItemsBlock
                    title="当前实际装机配置"
                    items={actualItems.length ? actualItems : originalItems}
                    emptyText="未调整，按原始配置装机"
                />
                {order.latest_adjustment && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
                        <div className="font-bold mb-1">最近调整</div>
                        <div>
                            {formatDate(order.latest_adjustment.created_at)} /{' '}
                            {order.latest_adjustment.created_by_username || '未知操作人'}
                        </div>
                        <div className="mt-1">{order.latest_adjustment.adjustment_note}</div>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <span>
                                调整后报价{' '}
                                {formatPrice(Number(order.latest_adjustment.adjusted_amount || 0))}
                            </span>
                            <span>
                                配置差价{' '}
                                {formatSignedPrice(
                                    Number(order.latest_adjustment.adjusted_amount || 0) -
                                        Number(order.original_amount || 0)
                                )}
                            </span>
                            <span>
                                最终成交{' '}
                                {formatPrice(Number(order.latest_adjustment.final_amount || 0))}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function OrderItemsBlock({
    title,
    items,
    emptyText,
}: {
    title: string;
    items: OrderSettlementItem[];
    emptyText?: string;
}) {
    return (
        <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#141414]">
            <div className="font-bold text-sm mb-3 text-gray-900 dark:text-gray-100">{title}</div>
            {items.length === 0 ? (
                <div className="text-sm text-gray-400">{emptyText || '暂无明细'}</div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={`${item.source_type || 'order_item'}_${item.id}`}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <div className="min-w-0">
                                <Tag>
                                    {categoryNameMap[item.product_category] ||
                                        item.product_category}
                                </Tag>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {item.product_name}
                                </span>
                            </div>
                            <span className="shrink-0 font-mono text-gray-500">
                                × {item.quantity} / {formatPrice(Number(item.sale_price || 0))}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatSignedPrice(value: number) {
    if (value > 0) return `+${formatPrice(value)}`;
    if (value < 0) return `-${formatPrice(Math.abs(value))}`;
    return formatPrice(0);
}

function InventoryStatus({ order }: { order: SalesOrder }) {
    const isEnough = (order.items || []).every((item) => {
        const stock = item.product?.stock_quantity || 0;
        return stock >= item.quantity;
    });

    if (isEnough) {
        return (
            <Tag icon={<CheckCircleOutlined />} color="green">
                库存满足
            </Tag>
        );
    }

    return (
        <Tooltip title="允许保存待结算订单，但库存不足时不能结算">
            <Tag icon={<CloseCircleOutlined />} color="red">
                库存不足
            </Tag>
        </Tooltip>
    );
}
