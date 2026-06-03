'use client';

import {
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchasePayment,
    PurchaseRefund,
    PurchaseReturn,
    Supplier,
} from '@/const/types';
import { categoryNameMap } from '@/const/categories';
import { formatDate, formatPrice } from '@/utils';
import {
    AuditOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    FileDoneOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SearchOutlined,
    WalletOutlined,
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
    cancelPurchaseOrder,
    createPurchasePayment,
    createPurchaseRefund,
    fetchDashboardProducts,
    fetchPurchaseOrders,
    fetchSuppliers,
    receivePurchaseOrder,
    savePurchaseOrder,
    voidPurchasePayment,
    voidPurchaseRefund,
} from '../../services';

interface PurchaseFormItem {
    id?: number;
    product_id: number;
    ordered_quantity: number;
    received_quantity?: number;
    purchase_price: number;
    note?: string;
}

interface ReceiveFormItem {
    purchase_order_item_id: number;
    quantity: number;
    serial_tracking_enabled?: boolean;
    serial_numbers?: string[];
    warranty_enabled?: boolean;
    warranty_until?: dayjs.Dayjs;
    note?: string;
}

const purchaseStatusMap: Record<PurchaseOrder['status'], { label: string; color: string }> = {
    draft: { label: '草稿', color: 'default' },
    ordered: { label: '已下单', color: 'blue' },
    partial_inbound: { label: '部分入库', color: 'orange' },
    completed: { label: '已完成', color: 'green' },
    cancelled: { label: '已取消', color: 'red' },
};

const paymentStatusMap: Record<
    PurchaseOrder['summary']['payment_status'],
    { label: string; color: string }
> = {
    unpaid: { label: '未付款', color: 'orange' },
    partial_paid: { label: '部分付款', color: 'blue' },
    settled: { label: '已结清', color: 'green' },
    refund_due: { label: '待退款', color: 'red' },
};

export default function PurchaseOrdersPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [formVisible, setFormVisible] = useState(false);
    const [receiveVisible, setReceiveVisible] = useState(false);
    const [paymentVisible, setPaymentVisible] = useState(false);
    const [refundVisible, setRefundVisible] = useState(false);
    const [voidVisible, setVoidVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<PurchaseOrder | null>(null);
    const [refundOrder, setRefundOrder] = useState<PurchaseOrder | null>(null);
    const [voidTarget, setVoidTarget] = useState<
        | {
              type: 'payment';
              order: PurchaseOrder;
              payment: PurchasePayment;
          }
        | {
              type: 'refund';
              order: PurchaseOrder;
              refund: PurchaseRefund;
          }
        | null
    >(null);
    const [form] = Form.useForm();
    const [receiveForm] = Form.useForm();
    const [paymentForm] = Form.useForm();
    const [refundForm] = Form.useForm();
    const [voidForm] = Form.useForm();

    const {
        data: purchaseOrders = [],
        loading,
        refresh,
    } = useRequest(() => fetchPurchaseOrders({ search, status }), {
        refreshDeps: [search, status],
        debounceWait: 300,
    });
    const { data: suppliers = [] } = useRequest(fetchSuppliers);
    const { data: products = [] } = useRequest(fetchDashboardProducts);

    const watchedItems = Form.useWatch('items', form) as PurchaseFormItem[] | undefined;
    const watchedShippingFee = Form.useWatch('shipping_fee', form);
    const watchedMiscFee = Form.useWatch('misc_fee', form);
    const watchedReceiveItems = Form.useWatch('items', receiveForm) as
        | ReceiveFormItem[]
        | undefined;

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

    const formSummary = useMemo(() => {
        const itemList = watchedItems || [];
        const goodsAmount = itemList.reduce(
            (sum, item) =>
                sum + Number(item?.ordered_quantity || 0) * Number(item?.purchase_price || 0),
            0
        );
        const totalQuantity = itemList.reduce(
            (sum, item) => sum + Number(item?.ordered_quantity || 0),
            0
        );
        const shippingFee = Number(watchedShippingFee || 0);
        const miscFee = Number(watchedMiscFee || 0);

        return {
            lineCount: itemList.length,
            totalQuantity,
            goodsAmount,
            shippingFee,
            miscFee,
            payableAmount: goodsAmount + shippingFee + miscFee,
        };
    }, [watchedItems, watchedShippingFee, watchedMiscFee]);

    const pageSummary = useMemo(
        () => ({
            total: purchaseOrders.length,
            orderedQuantity: purchaseOrders.reduce(
                (sum, order) => sum + order.summary.total_ordered_quantity,
                0
            ),
            remainingQuantity: purchaseOrders.reduce(
                (sum, order) => sum + order.summary.total_remaining_quantity,
                0
            ),
            pendingPayment: purchaseOrders.reduce(
                (sum, order) => sum + order.summary.pending_payment,
                0
            ),
            pendingRefund: purchaseOrders.reduce(
                (sum, order) => sum + order.summary.pending_refund,
                0
            ),
        }),
        [purchaseOrders]
    );

    const receiveSummary = useMemo(() => {
        const itemList = watchedReceiveItems || [];
        return {
            lineCount: itemList.length,
            totalQuantity: itemList.reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
        };
    }, [watchedReceiveItems]);

    const { runAsync: submitPurchaseOrder, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            const isCompletedEdit = editingOrder?.status === 'completed';
            const payload = {
                supplier_id: values.supplier_id,
                status: values.status,
                ordered_at: values.ordered_at?.toISOString(),
                expected_inbound_at: values.expected_inbound_at?.toISOString() || null,
                shipping_fee: values.shipping_fee || 0,
                misc_fee: values.misc_fee || 0,
                note: values.note || null,
                ...(isCompletedEdit
                    ? {}
                    : {
                          items: values.items.map((item: PurchaseFormItem) => ({
                              id: item.id,
                              product_id: item.product_id,
                              ordered_quantity: item.ordered_quantity,
                              purchase_price: item.purchase_price,
                              note: item.note || null,
                          })),
                      }),
                ...(editingOrder
                    ? {}
                    : {
                          initial_payment_amount: values.initial_payment_amount || 0,
                          initial_payment_account: values.initial_payment_account || null,
                          initial_paid_at: values.initial_paid_at?.toISOString(),
                          initial_payment_note: values.initial_payment_note || null,
                      }),
            };
            await savePurchaseOrder(payload, editingOrder?.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingOrder ? '进货单已更新' : '进货单已创建');
                setFormVisible(false);
                setEditingOrder(null);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitReceive, loading: receiving } = useRequest(
        async () => {
            if (!receivingOrder) return;
            const values = await receiveForm.validateFields();
            await receivePurchaseOrder(receivingOrder.id, {
                inbound_at: values.inbound_at?.toISOString(),
                note: values.note || null,
                items: values.items.map((item: ReceiveFormItem) => ({
                    ...item,
                    warranty_until: item.warranty_until?.toISOString() || null,
                    serial_numbers: (item.serial_numbers || [])
                        .map((serialNumber) => serialNumber?.trim())
                        .filter(Boolean),
                })),
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('进货单已生成入库单');
                setReceiveVisible(false);
                setReceivingOrder(null);
                receiveForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitPayment, loading: paying } = useRequest(
        async () => {
            if (!paymentOrder) return;
            const values = await paymentForm.validateFields();
            await createPurchasePayment(paymentOrder.id, {
                amount: values.amount,
                payment_account: values.payment_account || null,
                paid_at: values.paid_at?.toISOString(),
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('付款记录已添加');
                setPaymentVisible(false);
                setPaymentOrder(null);
                paymentForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitVoidPayment, loading: voiding } = useRequest(
        async () => {
            if (!voidTarget) return;
            const values = await voidForm.validateFields();
            if (voidTarget.type === 'payment') {
                await voidPurchasePayment(
                    voidTarget.order.id,
                    voidTarget.payment.id,
                    values.void_reason
                );
                return;
            }
            await voidPurchaseRefund(voidTarget.order.id, voidTarget.refund.id, values.void_reason);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('付款记录已作废');
                setVoidVisible(false);
                setVoidTarget(null);
                voidForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitRefund, loading: refunding } = useRequest(
        async () => {
            if (!refundOrder) return;
            const values = await refundForm.validateFields();
            await createPurchaseRefund(refundOrder.id, {
                amount: values.amount,
                refund_account: values.refund_account || null,
                refunded_at: values.refunded_at?.toISOString(),
                purchase_return_id: values.purchase_return_id || null,
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('退款记录已添加');
                setRefundVisible(false);
                setRefundOrder(null);
                refundForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitCancel, loading: cancelling } = useRequest(cancelPurchaseOrder, {
        manual: true,
        onSuccess: () => {
            message.success('进货单已取消');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const openCreate = () => {
        setEditingOrder(null);
        form.resetFields();
        form.setFieldsValue({
            status: 'ordered',
            ordered_at: dayjs(),
            shipping_fee: 0,
            misc_fee: 0,
            initial_payment_amount: 0,
            initial_paid_at: dayjs(),
            items: [{ ordered_quantity: 1, purchase_price: 0 }],
        });
        setFormVisible(true);
    };

    const openEdit = (order: PurchaseOrder) => {
        setEditingOrder(order);
        form.resetFields();
        form.setFieldsValue({
            supplier_id: order.supplier_id,
            status: order.status === 'draft' ? 'draft' : 'ordered',
            ordered_at: order.ordered_at ? dayjs(order.ordered_at) : dayjs(),
            expected_inbound_at: order.expected_inbound_at
                ? dayjs(order.expected_inbound_at)
                : undefined,
            shipping_fee: order.shipping_fee,
            misc_fee: order.misc_fee,
            note: order.note,
            items: order.items.map((item) => ({
                id: item.id,
                product_id: item.product_id,
                ordered_quantity: item.ordered_quantity,
                received_quantity: item.received_quantity,
                purchase_price: item.purchase_price,
                note: item.note || undefined,
            })),
        });
        setFormVisible(true);
    };

    const openReceive = (order: PurchaseOrder) => {
        setReceivingOrder(order);
        receiveForm.resetFields();
        receiveForm.setFieldsValue({
            inbound_at: dayjs(),
            items: order.items
                .filter((item) => item.remaining_quantity > 0)
                .map((item) => ({
                    purchase_order_item_id: item.id,
                    quantity: item.remaining_quantity,
                    serial_tracking_enabled: false,
                    warranty_enabled: false,
                })),
        });
        setReceiveVisible(true);
    };

    const openPayment = (order: PurchaseOrder) => {
        setPaymentOrder(order);
        paymentForm.resetFields();
        paymentForm.setFieldsValue({
            amount: order.summary.pending_payment,
            paid_at: dayjs(),
        });
        setPaymentVisible(true);
    };

    const openVoidPayment = (order: PurchaseOrder, payment: PurchasePayment) => {
        setVoidTarget({ type: 'payment', order, payment });
        voidForm.resetFields();
        setVoidVisible(true);
    };

    const openRefund = (order: PurchaseOrder) => {
        setRefundOrder(order);
        refundForm.resetFields();
        refundForm.setFieldsValue({
            amount: order.summary.pending_refund,
            refunded_at: dayjs(),
        });
        setRefundVisible(true);
    };

    const openVoidRefund = (order: PurchaseOrder, refund: PurchaseRefund) => {
        setVoidTarget({ type: 'refund', order, refund });
        voidForm.resetFields();
        setVoidVisible(true);
    };

    const columns: ColumnsType<PurchaseOrder> = [
        {
            title: '进货单',
            dataIndex: 'id',
            width: 110,
            render: (id) => <span className="font-mono text-gray-400">JH-{id}</span>,
        },
        {
            title: '商家',
            dataIndex: ['supplier', 'name'],
            render: (text) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">{text || '-'}</span>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value: PurchaseOrder['status']) => {
                const statusItem = purchaseStatusMap[value] || purchaseStatusMap.ordered;
                return <Tag color={statusItem.color}>{statusItem.label}</Tag>;
            },
        },
        {
            title: '商品汇总',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>
                        {record.summary.line_count} 条 / 订购{' '}
                        {record.summary.total_ordered_quantity} 件
                    </div>
                    <div>
                        已入库 {record.summary.total_received_quantity} / 未入库{' '}
                        {record.summary.total_remaining_quantity}
                    </div>
                </div>
            ),
        },
        {
            title: '资金汇总',
            width: 220,
            render: (_, record) => {
                const paymentStatus =
                    paymentStatusMap[record.summary.payment_status] || paymentStatusMap.unpaid;
                return (
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div>应付 {formatPrice(record.summary.payable_amount)}</div>
                        <div>已付 {formatPrice(record.summary.paid_amount)}</div>
                        <Tag color={paymentStatus.color}>{paymentStatus.label}</Tag>
                    </div>
                );
            },
        },
        {
            title: '下单时间',
            dataIndex: 'ordered_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 260,
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="link" onClick={() => openEdit(record)}>
                        编辑
                    </Button>
                    {record.summary.total_remaining_quantity > 0 &&
                        record.status !== 'cancelled' && (
                            <Button type="link" onClick={() => openReceive(record)}>
                                入库
                            </Button>
                        )}
                    {record.summary.pending_payment > 0 && record.status !== 'cancelled' && (
                        <Button type="link" onClick={() => openPayment(record)}>
                            付款
                        </Button>
                    )}
                    {record.summary.pending_refund > 0 && record.status !== 'cancelled' && (
                        <Button type="link" onClick={() => openRefund(record)}>
                            退款
                        </Button>
                    )}
                    {record.status !== 'cancelled' &&
                        record.summary.total_received_quantity === 0 &&
                        record.summary.net_paid === 0 && (
                            <Popconfirm
                                title="确认取消该进货单？"
                                okText="取消进货单"
                                cancelText="保留"
                                okButtonProps={{ danger: true, loading: cancelling }}
                                onConfirm={() => submitCancel(record.id)}
                            >
                                <Button danger type="link">
                                    取消
                                </Button>
                            </Popconfirm>
                        )}
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
                            <AuditOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Warehouse
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            进货单
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            记录采购订单、付款流水和实际入库进度。
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
                            新增进货单
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <SummaryCard label="进货单数" value={`${pageSummary.total} 张`} />
                    <SummaryCard label="采购数量" value={`${pageSummary.orderedQuantity} 件`} />
                    <SummaryCard label="未入库" value={`${pageSummary.remainingQuantity} 件`} />
                    <SummaryCard
                        label="待付款"
                        value={formatPrice(pageSummary.pendingPayment)}
                        tone="red"
                    />
                    <SummaryCard
                        label="待退款"
                        value={formatPrice(pageSummary.pendingRefund)}
                        tone="red"
                    />
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索单号、商家、商品名称或条形码..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-lg h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                    />
                    <Select
                        value={status}
                        onChange={setStatus}
                        className="w-full md:w-48"
                        options={[
                            { label: '全部状态', value: 'all' },
                            { label: '草稿', value: 'draft' },
                            { label: '已下单', value: 'ordered' },
                            { label: '部分入库', value: 'partial_inbound' },
                            { label: '已完成', value: 'completed' },
                            { label: '已取消', value: 'cancelled' },
                        ]}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={purchaseOrders}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1200 }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <PurchaseOrderDetails
                                    order={record}
                                    onPayment={() => openPayment(record)}
                                    onRefund={() => openRefund(record)}
                                    onVoidPayment={(payment) => openVoidPayment(record, payment)}
                                    onVoidRefund={(refund) => openVoidRefund(record, refund)}
                                />
                            ),
                        }}
                    />
                </div>
            </div>

            <Modal
                title={editingOrder ? '编辑进货单' : '新增进货单'}
                open={formVisible}
                onCancel={() => setFormVisible(false)}
                footer={null}
                destroyOnHidden
                width={1280}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Form.Item
                            name="supplier_id"
                            label="进货商家"
                            rules={[{ required: true, message: '请选择进货商家' }]}
                        >
                            <Select
                                showSearch
                                options={supplierOptions}
                                optionFilterProp="label"
                                disabled={Boolean(
                                    editingOrder && editingOrder.summary.total_received_quantity > 0
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            name="status"
                            label="进货状态"
                            rules={[{ required: true, message: '请选择进货状态' }]}
                        >
                            <Select
                                disabled={Boolean(
                                    editingOrder && editingOrder.summary.total_received_quantity > 0
                                )}
                                options={[
                                    { label: '草稿', value: 'draft' },
                                    { label: '已下单', value: 'ordered' },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            name="ordered_at"
                            label="下单时间"
                            rules={[{ required: true, message: '请选择下单时间' }]}
                        >
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                        <Form.Item name="expected_inbound_at" label="预计到货">
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Form.Item name="shipping_fee" label="运费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                        <Form.Item name="misc_fee" label="杂费">
                            <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                        </Form.Item>
                    </div>
                    {!editingOrder && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <Form.Item name="initial_payment_amount" label="初始付款金额">
                                <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                            </Form.Item>
                            <Form.Item name="initial_payment_account" label="初始付款账号">
                                <Input />
                            </Form.Item>
                            <Form.Item name="initial_paid_at" label="初始付款时间">
                                <DatePicker showTime className="w-full" />
                            </Form.Item>
                            <Form.Item name="initial_payment_note" label="初始付款备注">
                                <Input />
                            </Form.Item>
                        </div>
                    )}
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    {editingOrder?.status === 'completed' ? (
                        <ReadonlyItems items={editingOrder.items} />
                    ) : (
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                            进货明细
                                        </h3>
                                        <Button
                                            onClick={() =>
                                                add({
                                                    ordered_quantity: 1,
                                                    purchase_price: 0,
                                                })
                                            }
                                            icon={<PlusOutlined />}
                                        >
                                            添加明细
                                        </Button>
                                    </div>
                                    {fields.map((field, index) => (
                                        <PurchaseItemForm
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
                    )}

                    <PurchaseFormSummary summary={formSummary} />

                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={() => setFormVisible(false)}>取消</Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={submitPurchaseOrder}
                        >
                            保存进货单
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={receivingOrder ? `从 JH-${receivingOrder.id} 入库` : '从进货单入库'}
                open={receiveVisible}
                onCancel={() => setReceiveVisible(false)}
                footer={null}
                destroyOnHidden
                width={1180}
            >
                <Form form={receiveForm} layout="vertical" className="pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Form.Item
                            name="inbound_at"
                            label="入库时间"
                            rules={[{ required: true, message: '请选择入库时间' }]}
                        >
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                        <Form.Item name="note" label="入库备注" className="md:col-span-2">
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.List name="items">
                        {(fields) => (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <ReceiveItemForm
                                        key={field.key}
                                        fieldName={field.name}
                                        displayIndex={index}
                                        sourceItem={
                                            receivingOrder?.items.filter(
                                                (item) => item.remaining_quantity > 0
                                            )[index]
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </Form.List>
                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <SummaryCell
                                label="入库明细"
                                value={`${receiveSummary.lineCount} 条`}
                            />
                            <SummaryCell
                                label="入库数量"
                                value={`${receiveSummary.totalQuantity} 件`}
                                strong
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={() => setReceiveVisible(false)}>取消</Button>
                        <Button
                            type="primary"
                            icon={<FileDoneOutlined />}
                            loading={receiving}
                            onClick={submitReceive}
                        >
                            确认入库
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={paymentOrder ? `登记 JH-${paymentOrder.id} 付款` : '登记付款'}
                open={paymentVisible}
                onCancel={() => setPaymentVisible(false)}
                onOk={submitPayment}
                confirmLoading={paying}
                destroyOnHidden
                width={620}
            >
                <Form form={paymentForm} layout="vertical" className="pt-4">
                    {paymentOrder && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="应付款"
                                    value={formatPrice(paymentOrder.summary.payable_amount)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="待付款"
                                    value={formatPrice(paymentOrder.summary.pending_payment)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="amount"
                        label="本次付款金额"
                        rules={[{ required: true, message: '请输入本次付款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={paymentOrder?.summary.pending_payment}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="payment_account" label="付款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="paid_at"
                        label="付款时间"
                        rules={[{ required: true, message: '请选择付款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={refundOrder ? `登记 JH-${refundOrder.id} 退款` : '登记退款'}
                open={refundVisible}
                onCancel={() => setRefundVisible(false)}
                onOk={submitRefund}
                confirmLoading={refunding}
                destroyOnHidden
                width={620}
            >
                <Form form={refundForm} layout="vertical" className="pt-4">
                    {refundOrder && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="净付款"
                                    value={formatPrice(refundOrder.summary.net_paid)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="待退款"
                                    value={formatPrice(refundOrder.summary.pending_refund)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="amount"
                        label="本次退款金额"
                        rules={[{ required: true, message: '请输入本次退款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={refundOrder?.summary.pending_refund}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="refund_account" label="退款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="refunded_at"
                        label="退款时间"
                        rules={[{ required: true, message: '请选择退款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="purchase_return_id" label="关联退货记录">
                        <Select
                            allowClear
                            options={(refundOrder?.returns || []).map((item) => ({
                                label: `TH-${item.id} / ${formatPrice(item.amount)} / ${item.reason}`,
                                value: item.id,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={voidTarget?.type === 'refund' ? '作废退款记录' : '作废付款记录'}
                open={voidVisible}
                onCancel={() => setVoidVisible(false)}
                onOk={submitVoidPayment}
                confirmLoading={voiding}
                destroyOnHidden
                width={560}
            >
                <Form form={voidForm} layout="vertical" className="pt-4">
                    <Form.Item
                        name="void_reason"
                        label="作废原因"
                        rules={[{ required: true, message: '请填写作废原因' }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function PurchaseItemForm({
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
    const receivedQuantity = Number(
        form.getFieldValue(['items', fieldName, 'received_quantity']) || 0
    );
    const itemLocked = receivedQuantity > 0;

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
                        进货明细 {displayIndex + 1}
                    </div>
                    <div className="text-xs text-gray-400">已入库 {receivedQuantity} 件</div>
                </div>
                {canRemove && !itemLocked && (
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={onRemove}>
                        删除明细
                    </Button>
                )}
            </div>
            <Form.Item name={[fieldName, 'id']} hidden>
                <Input />
            </Form.Item>
            <Form.Item name={[fieldName, 'received_quantity']} hidden>
                <Input />
            </Form.Item>
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
                        disabled={itemLocked}
                    />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'ordered_quantity']}
                    label="采购数量"
                    rules={[{ required: true, message: '请输入采购数量' }]}
                >
                    <InputNumber
                        min={Math.max(1, receivedQuantity)}
                        precision={0}
                        className="w-full"
                    />
                </Form.Item>
                <Form.Item
                    name={[fieldName, 'purchase_price']}
                    label="采购单价"
                    rules={[{ required: true, message: '请输入采购单价' }]}
                >
                    <InputNumber
                        min={0}
                        precision={2}
                        prefix="¥"
                        className="w-full"
                        disabled={itemLocked}
                    />
                </Form.Item>
                <Form.Item name={[fieldName, 'note']} label="备注">
                    <Input />
                </Form.Item>
            </div>
        </div>
    );
}

function ReceiveItemForm({
    fieldName,
    displayIndex,
    sourceItem,
}: {
    fieldName: number;
    displayIndex: number;
    sourceItem?: PurchaseOrderItem;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-black/20 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        入库明细 {displayIndex + 1}
                    </div>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                        {sourceItem?.product?.name || '未知物品'}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                        {categoryNameMap[sourceItem?.product?.category || ''] ||
                            sourceItem?.product?.category ||
                            '-'}{' '}
                        / 条形码 {sourceItem?.product?.barcode || '-'}
                    </div>
                </div>
                <div className="text-left text-sm md:text-right">
                    <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                        {formatPrice(sourceItem?.purchase_price || 0)}
                    </div>
                    <div className="text-xs text-gray-400">
                        剩余可入库 {sourceItem?.remaining_quantity || 0} 件
                    </div>
                </div>
            </div>
            <Form.Item name={[fieldName, 'purchase_order_item_id']} hidden>
                <Input />
            </Form.Item>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <Form.Item
                    name={[fieldName, 'serial_tracking_enabled']}
                    label="序列号管理"
                    valuePropName="checked"
                >
                    <Switch checkedChildren="启用" unCheckedChildren="关闭" />
                </Form.Item>
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
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Item name={[fieldName, 'serial_numbers']} label="序列号">
                    <Select
                        mode="tags"
                        tokenSeparators={[',', '，', '\n']}
                        placeholder="按回车添加"
                    />
                </Form.Item>
                <Form.Item name={[fieldName, 'note']} label="备注">
                    <Input />
                </Form.Item>
            </div>
        </div>
    );
}

function PurchaseOrderDetails({
    order,
    onPayment,
    onRefund,
    onVoidPayment,
    onVoidRefund,
}: {
    order: PurchaseOrder;
    onPayment: () => void;
    onRefund: () => void;
    onVoidPayment: (payment: PurchasePayment) => void;
    onVoidRefund: (refund: PurchaseRefund) => void;
}) {
    return (
        <div className="space-y-5 bg-gray-50/70 p-4 dark:bg-black/20">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
                <ReadonlyCell label="商品小计" value={formatPrice(order.summary.goods_amount)} />
                <ReadonlyCell label="退货扣减" value={formatPrice(order.summary.return_amount)} />
                <ReadonlyCell label="运费" value={formatPrice(order.shipping_fee)} />
                <ReadonlyCell label="杂费" value={formatPrice(order.misc_fee)} />
                <ReadonlyCell
                    label="应付款"
                    value={formatPrice(order.summary.payable_amount)}
                    strong
                />
                <ReadonlyCell label="已付款" value={formatPrice(order.summary.paid_amount)} />
                <ReadonlyCell label="已退款" value={formatPrice(order.summary.refunded_amount)} />
                <ReadonlyCell
                    label={order.summary.pending_refund > 0 ? '待退款' : '待付款'}
                    value={formatPrice(
                        order.summary.pending_refund > 0
                            ? order.summary.pending_refund
                            : order.summary.pending_payment
                    )}
                    strong
                />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">进货明细</div>
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
                                        / 条形码 {item.product?.barcode || '-'}
                                    </div>
                                </div>
                                <div className="text-sm md:text-right">
                                    <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                                        {formatPrice(item.purchase_price)}
                                    </div>
                                    <div className="text-xs text-gray-400">采购单价</div>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag color="blue">订购 {item.ordered_quantity}</Tag>
                                <Tag color={item.received_quantity > 0 ? 'green' : 'default'}>
                                    已入库 {item.received_quantity}
                                </Tag>
                                <Tag color={item.remaining_quantity > 0 ? 'orange' : 'green'}>
                                    未入库 {item.remaining_quantity}
                                </Tag>
                                {item.note && <Tag>{item.note}</Tag>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 dark:text-gray-100">付款记录</div>
                        {order.summary.pending_payment > 0 && order.status !== 'cancelled' && (
                            <Button size="small" icon={<WalletOutlined />} onClick={onPayment}>
                                登记付款
                            </Button>
                        )}
                    </div>
                    {(order.payments || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-[#141414]">
                            暂无付款记录
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(order.payments || []).map((payment) => (
                                <div
                                    key={payment.id}
                                    className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="font-mono text-lg font-black text-gray-900 dark:text-gray-100">
                                                {formatPrice(payment.amount)}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-400">
                                                {payment.payment_account || '未填写账号'} /{' '}
                                                {formatDate(payment.paid_at)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Tag
                                                color={
                                                    payment.status === 'active' ? 'green' : 'red'
                                                }
                                            >
                                                {payment.status === 'active' ? '有效' : '已作废'}
                                            </Tag>
                                            {payment.status === 'active' && (
                                                <Button
                                                    danger
                                                    size="small"
                                                    icon={<CloseCircleOutlined />}
                                                    onClick={() => onVoidPayment(payment)}
                                                >
                                                    作废
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {payment.note && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            {payment.note}
                                        </div>
                                    )}
                                    {payment.void_reason && (
                                        <div className="mt-2 text-xs text-red-500">
                                            作废原因：{payment.void_reason}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3">
                        <div className="font-bold text-gray-900 dark:text-gray-100">退货记录</div>
                        <Tag color={order.summary.return_amount > 0 ? 'red' : 'default'}>
                            {formatPrice(order.summary.return_amount)}
                        </Tag>
                    </div>
                    {(order.returns || []).length === 0 ? (
                        <EmptyRecord text="暂无退货记录" />
                    ) : (
                        <div className="space-y-3">
                            {(order.returns || []).map((item) => (
                                <ReturnRecord key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3">
                        <div className="font-bold text-gray-900 dark:text-gray-100">退款记录</div>
                        {order.summary.pending_refund > 0 && order.status !== 'cancelled' && (
                            <Button size="small" icon={<WalletOutlined />} onClick={onRefund}>
                                登记退款
                            </Button>
                        )}
                    </div>
                    {(order.refunds || []).length === 0 ? (
                        <EmptyRecord text="暂无退款记录" />
                    ) : (
                        <div className="space-y-3">
                            {(order.refunds || []).map((refund) => (
                                <RefundRecord
                                    key={refund.id}
                                    refund={refund}
                                    onVoid={() => onVoidRefund(refund)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyRecord({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-[#141414]">
            {text}
        </div>
    );
}

function ReturnRecord({ item }: { item: PurchaseReturn }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="font-mono text-lg font-black text-red-500">
                        {formatPrice(item.amount)}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                        TH-{item.id} / RK-{item.inbound_order_id} / {formatDate(item.created_at)}
                    </div>
                </div>
                <Tag color="red">已完成</Tag>
            </div>
            <div className="mt-2 text-xs text-gray-500">原因：{item.reason}</div>
            <div className="mt-2 flex flex-wrap gap-2">
                {(item.items || []).slice(0, 4).map((returnItem) => (
                    <Tag key={returnItem.id}>
                        {returnItem.product?.name || `物品 ${returnItem.product_id}`}
                    </Tag>
                ))}
                {(item.items || []).length > 4 && <Tag>+{(item.items || []).length - 4}</Tag>}
            </div>
        </div>
    );
}

function RefundRecord({ refund, onVoid }: { refund: PurchaseRefund; onVoid: () => void }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="font-mono text-lg font-black text-gray-900 dark:text-gray-100">
                        {formatPrice(refund.amount)}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                        {refund.refund_account || '未填写账号'} / {formatDate(refund.refunded_at)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Tag color={refund.status === 'active' ? 'green' : 'red'}>
                        {refund.status === 'active' ? '有效' : '已作废'}
                    </Tag>
                    {refund.status === 'active' && (
                        <Button danger size="small" icon={<CloseCircleOutlined />} onClick={onVoid}>
                            作废
                        </Button>
                    )}
                </div>
            </div>
            {refund.note && <div className="mt-2 text-xs text-gray-500">{refund.note}</div>}
            {refund.void_reason && (
                <div className="mt-2 text-xs text-red-500">作废原因：{refund.void_reason}</div>
            )}
        </div>
    );
}

function ReadonlyItems({ items }: { items: PurchaseOrderItem[] }) {
    return (
        <div className="space-y-3">
            <div className="font-bold text-gray-900 dark:text-gray-100">进货明细</div>
            {items.map((item) => (
                <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                                {item.product?.name || '未知物品'}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                                订购 {item.ordered_quantity} / 已入库 {item.received_quantity}
                            </div>
                        </div>
                        <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                            {formatPrice(item.purchase_price)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PurchaseFormSummary({
    summary,
}: {
    summary: {
        lineCount: number;
        totalQuantity: number;
        goodsAmount: number;
        shippingFee: number;
        miscFee: number;
        payableAmount: number;
    };
}) {
    return (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <SummaryCell label="明细数" value={`${summary.lineCount} 条`} />
                <SummaryCell label="采购数量" value={`${summary.totalQuantity} 件`} />
                <SummaryCell label="商品小计" value={formatPrice(summary.goodsAmount)} />
                <SummaryCell label="运费" value={formatPrice(summary.shippingFee)} />
                <SummaryCell label="杂费" value={formatPrice(summary.miscFee)} />
                <SummaryCell label="应付款" value={formatPrice(summary.payableAmount)} strong />
            </div>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    tone = 'blue',
}: {
    label: string;
    value: string;
    tone?: 'blue' | 'red';
}) {
    const colorClass = tone === 'red' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400';

    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`mt-2 font-mono text-2xl font-black ${colorClass}`}>{value}</div>
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
                className={`mt-1 font-mono font-black ${
                    strong ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
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
