'use client';

import { AfterSalesService, InventoryItem, OrderSettlementItem, SalesOrder } from '@/const/types';
import { categoryNameMap } from '@/const';
import { formatDate, formatPrice } from '@/utils';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DollarCircleOutlined,
    EditOutlined,
    InfoCircleOutlined,
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
    Popconfirm,
    Segmented,
    Select,
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
    completeAfterSalesOrder,
    cancelOrder,
    markOrderRefunded,
    updateAccountPayment,
    settleOrder,
    updateOrder,
    updateAfterSalesOrderAdjustment,
} from '../../services';
import { fetchAdminAfterSalesServices } from '@/app/services/afterSales';
import { ConfigAdjustmentModal } from './components/ConfigAdjustmentModal';

const getSettlementItemKey = (item: OrderSettlementItem) =>
    `${item.source_type || 'order_item'}_${item.id}`;

const tableScrollX = 1880;

const sourceTypeOptions = [
    { value: 'diy', label: 'DIY整机' },
    { value: 'retail', label: '零售' },
    { value: 'after_sales', label: '售后服务' },
    { value: 'manual', label: '手动/其他' },
] as const;

export default function OrdersPage() {
    const [query, setQuery] = useState({
        search: '',
        payment_status: undefined as string | undefined,
        delivery_status: undefined as string | undefined,
        source_type: undefined as SalesOrder['source_type'] | undefined,
        scope: 'todo' as 'todo' | 'all',
    });
    const [editVisible, setEditVisible] = useState(false);
    const [adjustVisible, setAdjustVisible] = useState(false);
    const [afterSalesAdjustVisible, setAfterSalesAdjustVisible] = useState(false);
    const [settleVisible, setSettleVisible] = useState(false);
    const [cancelVisible, setCancelVisible] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<SalesOrder | null>(null);
    const [inventoryOptions, setInventoryOptions] = useState<Record<string, InventoryItem[]>>({});
    const [editForm] = Form.useForm();
    const [settleForm] = Form.useForm();
    const [cancelForm] = Form.useForm();
    const [afterSalesAdjustForm] = Form.useForm();
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
    const { data: afterSalesServices = [] } = useRequest(() =>
        fetchAdminAfterSalesServices({ status: 'active' })
    );
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
                payment_status: values.payment_status,
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
                message.success('订单已交付');
                setSettleVisible(false);
                setCurrentOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitCompleteAfterSales, loading: completingAfterSales } = useRequest(
        async (order: SalesOrder) => {
            await completeAfterSalesOrder(order.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('售后服务已完成');
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitAfterSalesAdjustment, loading: savingAfterSalesAdjustment } =
        useRequest(
            async () => {
                if (!currentOrder) return;
                const values = await afterSalesAdjustForm.validateFields();
                await updateAfterSalesOrderAdjustment(currentOrder.id, {
                    services: (values.services || []).map((item: Record<string, unknown>) => ({
                        source_service_item_id: item.source_service_item_id || null,
                        service_id: item.service_id,
                        quantity: item.quantity,
                        sale_price: item.sale_price,
                        note: item.note,
                    })),
                    final_amount: values.final_amount,
                    adjustment_note: values.adjustment_note,
                });
            },
            {
                manual: true,
                onSuccess: () => {
                    message.success('售后服务订单已调整');
                    setAfterSalesAdjustVisible(false);
                    setCurrentOrder(null);
                    afterSalesAdjustForm.resetFields();
                    refresh();
                },
                onError: (e) => message.error(e.message),
            }
        );

    const { runAsync: submitCancel, loading: cancelling } = useRequest(
        async () => {
            if (!currentOrder) return;
            const values = await cancelForm.validateFields();
            await cancelOrder(currentOrder.id, {
                refund_confirmed: Boolean(values.refund_confirmed),
                cancel_reason: values.cancel_reason,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('订单已取消');
                setCancelVisible(false);
                setCurrentOrder(null);
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitMarkRefunded, loading: markingRefunded } = useRequest(
        async (order: SalesOrder) => {
            await markOrderRefunded(order.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('已标记退款');
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitMarkPaid, loading: markingPaid } = useRequest(
        async (order: SalesOrder) => {
            await updateAccountPayment('receivable', order.id, true);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('已确认收款');
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
            payment_status: order.payment_status || (order.is_paid ? 'paid' : 'unpaid'),
            note: order.note,
        });
        setEditVisible(true);
    };

    const openAdjust = (order: SalesOrder) => {
        if (order.source_type === 'after_sales') {
            setCurrentOrder(order);
            afterSalesAdjustForm.resetFields();
            afterSalesAdjustForm.setFieldsValue({
                services: (order.after_sales_items || []).map((item) => ({
                    source_service_item_id: item.id,
                    service_id: item.service_id,
                    quantity: item.quantity,
                    sale_price: item.sale_price,
                    note: item.note,
                })),
                final_amount: Number(order.final_amount || 0),
                adjustment_note: '',
            });
            setAfterSalesAdjustVisible(true);
            return;
        }
        if (order.source_type !== 'diy') {
            message.info('当前来源暂不支持配置调整');
            return;
        }
        setCurrentOrder(order);
        setAdjustVisible(true);
    };

    const openSettle = async (order: SalesOrder) => {
        if (order.source_type === 'after_sales') {
            message.warning('售后服务订单请使用确认完成');
            return;
        }
        if (!isInventoryEnough(order)) {
            message.warning('库存不足，无法确认交付');
            return;
        }
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

    const openCancel = (order: SalesOrder) => {
        setCurrentOrder(order);
        cancelForm.resetFields();
        cancelForm.setFieldsValue({ refund_confirmed: false, cancel_reason: '' });
        setCancelVisible(true);
    };

    const columns: ColumnsType<SalesOrder> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            width: 190,
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
            title: '来源',
            dataIndex: 'source_type',
            width: 120,
            render: (sourceType) => <SourceTypeTag sourceType={sourceType} />,
        },
        {
            title: '客户',
            width: 220,
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
            title: (
                <StatusColumnTitle
                    label="库存状态"
                    tooltip={
                        <StatusDefinitionList
                            items={[
                                '库存满足：未交付订单所需商品当前库存充足，可确认交付。',
                                '库存不足：未交付订单所需商品库存不足，暂不能确认交付。',
                                '已出库：订单已确认交付，库存件已绑定并扣减。',
                            ]}
                        />
                    }
                />
            ),
            width: 130,
            render: (_, record) => <InventoryStatus order={record} />,
        },
        {
            title: '成交金额',
            dataIndex: 'final_amount',
            align: 'right',
            width: 150,
            render: (amount) => (
                <span className="font-mono font-bold">{formatPrice(Number(amount))}</span>
            ),
        },
        {
            title: (
                <StatusColumnTitle
                    label="收款状态"
                    tooltip={
                        <StatusDefinitionList
                            items={[
                                '未收款：尚未收到客户款项，未交付订单仍可编辑，已交付订单进入应收款。',
                                '已收款：已收到客户款项。',
                                '待退款：已收款订单取消后，款项尚未退还客户。',
                                '已退款：取消订单的已收款项已退还客户。',
                            ]}
                        />
                    }
                />
            ),
            dataIndex: 'payment_status',
            width: 130,
            render: (status) => <PaymentStatusTag status={status} />,
        },
        {
            title: '成本/利润',
            width: 170,
            render: (_, record) => {
                if (record.source_type === 'after_sales') {
                    return (
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                            <div>成本 暂未核算</div>
                            <div className="text-emerald-500">
                                收入 {formatPrice(Number(record.final_amount || 0))}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        <div>成本 {formatPrice(Number(record.cost_amount || 0))}</div>
                        <div className="text-emerald-500">
                            利润 {formatPrice(Number(record.profit_amount || 0))}
                        </div>
                    </div>
                );
            },
        },
        {
            title: (
                <StatusColumnTitle
                    label="交付状态"
                    tooltip={
                        <StatusDefinitionList
                            items={[
                                '未交付：尚未把整机或配件交给客户，可编辑、调整配置、确认交付或取消。',
                                '已交付：已绑定库存件并扣减库存，后续资金状态通过收款状态跟进。',
                                '已取消：订单不再交付，已收款订单需继续跟进退款状态。',
                            ]}
                        />
                    }
                />
            ),
            dataIndex: 'delivery_status',
            width: 130,
            render: (_, record) => (
                <DeliveryStatusTag
                    status={record.delivery_status}
                    sourceType={record.source_type}
                />
            ),
        },
        {
            title: '经手人',
            dataIndex: 'created_by_username',
            width: 130,
            render: (username) => username || '-',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 190,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 320,
            fixed: 'right',
            align: 'center',
            render: (_, record) => {
                const deliveryStatus = record.delivery_status || 'undelivered';
                const isAfterSales = record.source_type === 'after_sales';
                const isDiy = record.source_type === 'diy';
                const inventoryEnough = isInventoryEnough(record);

                if (deliveryStatus === 'cancelled' && record.payment_status === 'refund_pending') {
                    return (
                        <Popconfirm
                            title="确认已完成退款？"
                            okText="确认"
                            cancelText="取消"
                            onConfirm={() => submitMarkRefunded(record)}
                        >
                            <Button
                                type="text"
                                size="small"
                                loading={markingRefunded}
                                icon={<DollarCircleOutlined />}
                            >
                                标记已退款
                            </Button>
                        </Popconfirm>
                    );
                }

                if (deliveryStatus === 'delivered' && record.payment_status === 'unpaid') {
                    return (
                        <Popconfirm
                            title="确认客户已付款？"
                            okText="确认"
                            cancelText="取消"
                            onConfirm={() => submitMarkPaid(record)}
                        >
                            <Button
                                type="text"
                                size="small"
                                loading={markingPaid}
                                icon={<DollarCircleOutlined />}
                            >
                                确认收款
                            </Button>
                        </Popconfirm>
                    );
                }

                if (deliveryStatus !== 'undelivered') {
                    return <span className="text-gray-400">-</span>;
                }

                return (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        >
                            编辑
                        </Button>
                        {(isDiy || isAfterSales) && (
                            <Button
                                type="text"
                                size="small"
                                icon={<SwapOutlined />}
                                onClick={() => openAdjust(record)}
                            >
                                {isAfterSales ? '调整' : '调整配置'}
                            </Button>
                        )}
                        {isAfterSales ? (
                            <Popconfirm
                                title="确认售后服务已完成？"
                                description="确认后只更新服务完成状态，不绑定库存、不扣减库存。"
                                okText="确认"
                                cancelText="取消"
                                onConfirm={() => submitCompleteAfterSales(record)}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    loading={completingAfterSales}
                                    icon={<CheckCircleOutlined />}
                                >
                                    确认完成
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Tooltip
                                title={
                                    inventoryEnough
                                        ? record.payment_status === 'unpaid'
                                            ? '该订单尚未收款，交付后将进入应收款'
                                            : '绑定库存并确认交付'
                                        : '库存不足，无法交付'
                                }
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    disabled={!inventoryEnough}
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => openSettle(record)}
                                >
                                    确认交付
                                </Button>
                            </Tooltip>
                        )}
                        <Button
                            type="text"
                            danger
                            size="small"
                            icon={<CloseCircleOutlined />}
                            onClick={() => openCancel(record)}
                        >
                            取消
                        </Button>
                    </div>
                );
            },
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
                            前台保存订单后进入未交付，后台确认交付时绑定具体库存并扣减库存。
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
                        placeholder="订单范围"
                        value={query.scope}
                        onChange={(scope) => setQuery((prev) => ({ ...prev, scope }))}
                        className="w-36"
                        options={[
                            { value: 'todo', label: '待办订单' },
                            { value: 'all', label: '全部订单' },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder="收款状态"
                        value={query.payment_status}
                        onChange={(payment_status) =>
                            setQuery((prev) => ({ ...prev, payment_status }))
                        }
                        className="w-40"
                        options={[
                            { value: 'unpaid', label: '未收款' },
                            { value: 'paid', label: '已收款' },
                            { value: 'refund_pending', label: '待退款' },
                            { value: 'refunded', label: '已退款' },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder="交付状态"
                        value={query.delivery_status}
                        onChange={(delivery_status) =>
                            setQuery((prev) => ({ ...prev, delivery_status }))
                        }
                        className="w-40"
                        options={[
                            { value: 'undelivered', label: '未交付' },
                            { value: 'delivered', label: '已交付' },
                            { value: 'cancelled', label: '已取消' },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder="订单来源"
                        value={query.source_type}
                        onChange={(source_type) =>
                            setQuery((prev) => ({ ...prev, source_type }))
                        }
                        className="w-40"
                        options={sourceTypeOptions.map((item) => ({
                            value: item.value,
                            label: item.label,
                        }))}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={orders}
                        scroll={{ x: tableScrollX }}
                        expandable={{
                            expandedRowRender: (record) => <OrderDetails order={record} />,
                        }}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </div>

            <Modal
                title="编辑未交付订单"
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
                    <Form.Item name="payment_status" label="收款状态">
                        <Select
                            options={[
                                { value: 'unpaid', label: '未收款' },
                                { value: 'paid', label: '已收款' },
                            ]}
                        />
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

            <AfterSalesAdjustmentModal
                open={afterSalesAdjustVisible}
                form={afterSalesAdjustForm}
                services={afterSalesServices}
                submitting={savingAfterSalesAdjustment}
                onCancel={() => setAfterSalesAdjustVisible(false)}
                onSubmit={() => submitAfterSalesAdjustment()}
            />

            <Modal
                title="确认交付"
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
                    {currentOrder?.payment_status === 'unpaid' && (
                        <div className="mb-3 rounded-lg border border-orange-100 bg-orange-50 p-3 text-xs text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
                            该订单尚未收款，交付后将进入应收款。
                        </div>
                    )}
                    <div className="text-xs text-gray-400">
                        确认交付后将绑定所选库存物品并扣减库存。销售退货流程已列入 TODO。
                    </div>
                </Form>
            </Modal>

            <Modal
                title="取消订单"
                open={cancelVisible}
                onCancel={() => setCancelVisible(false)}
                onOk={submitCancel}
                confirmLoading={cancelling}
                destroyOnHidden
                width={620}
            >
                <Form form={cancelForm} layout="vertical" className="pt-4">
                    {currentOrder?.payment_status === 'paid' && (
                        <div className="mb-4 rounded-lg border border-orange-100 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
                            该订单已收款。取消前请确认是否已经将款项退还给客户。
                        </div>
                    )}
                    <Form.Item name="cancel_reason" label="取消原因">
                        <Input.TextArea rows={3} placeholder="可填写取消原因，便于后续追溯" />
                    </Form.Item>
                    {currentOrder?.payment_status === 'paid' && (
                        <Form.Item name="refund_confirmed" valuePropName="checked">
                            <Checkbox>已将款项退还给客户</Checkbox>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}

function StatusColumnTitle({ label, tooltip }: { label: string; tooltip: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1">
            {label}
            <Tooltip title={tooltip}>
                <InfoCircleOutlined className="text-xs text-gray-400 cursor-help" />
            </Tooltip>
        </span>
    );
}

function StatusDefinitionList({ items }: { items: string[] }) {
    return (
        <div className="max-w-xs space-y-1 text-xs leading-5">
            {items.map((item) => (
                <div key={item}>{item}</div>
            ))}
        </div>
    );
}

function OrderDetails({ order }: { order: SalesOrder }) {
    if (order.source_type === 'after_sales') {
        return <AfterSalesOrderDetails order={order} />;
    }

    const originalItems = order.original_items || order.items || [];
    const actualItems = order.items || [];
    const shouldShowActual =
        Boolean(order.latest_adjustment) || order.delivery_status === 'delivered';
    const actualTitle = order.delivery_status === 'delivered' ? '实际交付配置' : '当前实际装机配置';

    if (!shouldShowActual) {
        return <OrderItemsBlock title="原始下单配置" items={originalItems} />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrderItemsBlock title="原始下单配置" items={originalItems} />
            <div className="space-y-3">
                <OrderItemsBlock
                    title={actualTitle}
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

function AfterSalesOrderDetails({ order }: { order: SalesOrder }) {
    const detail = order.after_sales_detail;
    const items = order.after_sales_items || [];

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#141414]">
                <div className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                    原始下单服务
                </div>
                {items.length === 0 ? (
                    <div className="text-sm text-gray-400">暂无服务明细</div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 text-sm"
                            >
                                <div className="min-w-0">
                                    <Tag color="cyan">
                                        {item.service_category_name || item.price_type}
                                    </Tag>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {item.service_name}
                                    </span>
                                    {item.note && (
                                        <div className="mt-1 text-xs text-gray-400">
                                            {item.note}
                                        </div>
                                    )}
                                </div>
                                <span className="shrink-0 font-mono text-gray-500">
                                    × {item.quantity} / {formatPrice(Number(item.sale_price || 0))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-3 text-sm dark:border-gray-800 dark:bg-[#141414]">
                <div className="mb-3 font-bold text-gray-900 dark:text-gray-100">服务信息</div>
                <InfoLine label="设备型号" value={detail?.device_model} />
                <InfoLine label="故障描述" value={detail?.fault_description} />
                <InfoLine label="服务备注" value={detail?.service_note} />
                <InfoLine label="完成备注" value={detail?.completed_note} />
            </div>
        </div>
    );
}

function InfoLine({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="mb-2 flex gap-3 last:mb-0">
            <span className="w-16 shrink-0 text-gray-400">{label}</span>
            <span className="min-w-0 flex-1 break-words text-gray-700 dark:text-gray-300">
                {value || '-'}
            </span>
        </div>
    );
}

function AfterSalesAdjustmentModal({
    open,
    form,
    services,
    submitting,
    onCancel,
    onSubmit,
}: {
    open: boolean;
    form: ReturnType<typeof Form.useForm>[0];
    services: AfterSalesService[];
    submitting: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    const serviceOptions = services.map((service) => ({
        value: service.id,
        label: `${service.category_name || '售后服务'} / ${service.name}`,
    }));

    const applyServiceDefaults = (fieldName: number, serviceId: number) => {
        const service = services.find((item) => item.id === serviceId);
        const currentServices = form.getFieldValue('services') || [];
        currentServices[fieldName] = {
            ...currentServices[fieldName],
            service_id: serviceId,
            sale_price: service?.price_type === 'fixed' ? service.price || 0 : currentServices[fieldName]?.sale_price,
        };
        form.setFieldValue('services', currentServices);
    };

    return (
        <Modal
            title="调整售后服务"
            open={open}
            onCancel={onCancel}
            onOk={onSubmit}
            confirmLoading={submitting}
            destroyOnHidden
            width={860}
        >
            <Form form={form} layout="vertical" className="pt-4">
                <Form.List name="services">
                    {(fields, { add, remove }) => (
                        <div className="space-y-3">
                            {fields.map((field) => (
                                <div
                                    key={field.key}
                                    className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-black/20"
                                >
                                    <Form.Item name={[field.name, 'source_service_item_id']} hidden>
                                        <Input />
                                    </Form.Item>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_110px_130px_80px]">
                                        <Form.Item
                                            name={[field.name, 'service_id']}
                                            label="服务项目"
                                            rules={[{ required: true, message: '请选择服务项目' }]}
                                        >
                                            <Select
                                                showSearch
                                                optionFilterProp="label"
                                                options={serviceOptions}
                                                onChange={(serviceId) =>
                                                    applyServiceDefaults(field.name, serviceId)
                                                }
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name={[field.name, 'quantity']}
                                            label="数量"
                                            rules={[{ required: true, message: '请输入数量' }]}
                                        >
                                            <InputNumber min={1} precision={0} className="w-full" />
                                        </Form.Item>
                                        <Form.Item
                                            name={[field.name, 'sale_price']}
                                            label="成交单价"
                                            rules={[{ required: true, message: '请输入成交单价' }]}
                                        >
                                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                                        </Form.Item>
                                        <div className="flex items-end pb-6">
                                            <Button danger onClick={() => remove(field.name)}>
                                                删除
                                            </Button>
                                        </div>
                                    </div>
                                    <Form.Item name={[field.name, 'note']} label="明细备注">
                                        <Input />
                                    </Form.Item>
                                </div>
                            ))}
                            <Button
                                type="dashed"
                                block
                                onClick={() => add({ quantity: 1, sale_price: 0 })}
                            >
                                添加服务项目
                            </Button>
                        </div>
                    )}
                </Form.List>
                <Form.Item
                    name="final_amount"
                    label="最终成交金额"
                    rules={[{ required: true, message: '请输入最终成交金额' }]}
                    className="mt-4"
                >
                    <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                </Form.Item>
                <Form.Item
                    name="adjustment_note"
                    label="调整说明"
                    rules={[{ required: true, message: '请填写调整说明' }]}
                >
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
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

function isInventoryEnough(order: SalesOrder) {
    return (order.items || []).every((item) => {
        const stock = item.product?.stock_quantity || 0;
        return stock >= item.quantity;
    });
}

function PaymentStatusTag({ status }: { status: SalesOrder['payment_status'] }) {
    const map = {
        unpaid: { label: '未收款', color: 'orange' },
        paid: { label: '已收款', color: 'green' },
        refund_pending: { label: '待退款', color: 'red' },
        refunded: { label: '已退款', color: 'default' },
    } as const;
    const config = map[status] || map.unpaid;
    return <Tag color={config.color}>{config.label}</Tag>;
}

function SourceTypeTag({ sourceType }: { sourceType: SalesOrder['source_type'] }) {
    const map = {
        diy: { label: 'DIY整机', color: 'blue' },
        retail: { label: '零售', color: 'green' },
        after_sales: { label: '售后服务', color: 'cyan' },
        manual: { label: '手动/其他', color: 'default' },
    } as const;
    const config = map[sourceType] || map.manual;
    return <Tag color={config.color}>{config.label}</Tag>;
}

function DeliveryStatusTag({
    status,
    sourceType,
}: {
    status: SalesOrder['delivery_status'];
    sourceType?: SalesOrder['source_type'];
}) {
    const map =
        sourceType === 'after_sales'
            ? {
                  undelivered: { label: '未完成', color: 'orange' },
                  delivered: { label: '已完成', color: 'green' },
                  cancelled: { label: '已取消', color: 'default' },
              }
            : {
                  undelivered: { label: '未交付', color: 'orange' },
                  delivered: { label: '已交付', color: 'green' },
                  cancelled: { label: '已取消', color: 'default' },
              };
    const config = map[status] || map.undelivered;
    return <Tag color={config.color}>{config.label}</Tag>;
}

function InventoryStatus({ order }: { order: SalesOrder }) {
    if (order.source_type === 'after_sales') {
        return <span className="text-gray-400">不涉及库存</span>;
    }

    if (order.delivery_status === 'delivered') {
        return (
            <Tag icon={<CheckCircleOutlined />} color="green">
                已出库
            </Tag>
        );
    }

    if (order.delivery_status === 'cancelled') {
        return <span className="text-gray-400">-</span>;
    }

    const isEnough = isInventoryEnough(order);

    if (isEnough) {
        return (
            <Tag icon={<CheckCircleOutlined />} color="green">
                库存满足
            </Tag>
        );
    }

    return (
        <Tooltip title="允许保存未交付订单，但库存不足时不能确认交付">
            <Tag icon={<CloseCircleOutlined />} color="red">
                库存不足
            </Tag>
        </Tooltip>
    );
}
