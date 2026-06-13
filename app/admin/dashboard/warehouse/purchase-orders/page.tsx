'use client';

import { categoryNameMap } from '@/const/categories';
import {
    InboundOrder,
    LogisticsCompany,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchasePayment,
    PurchaseReturn,
    Supplier,
} from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    AuditOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    ReloadOutlined,
    RollbackOutlined,
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
    Table,
    Tabs,
    Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import {
    cancelPurchaseOrder,
    cancelPurchaseReturn,
    confirmPurchaseOrder,
    createPurchasePayment,
    createPurchaseReturn,
    createPurchaseReturnRefund,
    fetchDashboardProducts,
    fetchInboundOrderReturnableItems,
    fetchInboundOrders,
    fetchLogisticsCompanies,
    fetchPurchaseOrders,
    fetchPurchaseReturns,
    fetchSuppliers,
    receivePurchaseReturnByMerchant,
    savePurchaseOrder,
    shipPurchaseReturn,
    updatePurchaseReturn,
    voidPurchasePayment,
} from '../../services';

interface PurchaseFormItem {
    id?: number;
    product_id: number;
    ordered_quantity: number;
    received_quantity?: number;
    purchase_price: number;
    note?: string;
}

interface ReturnableGroup {
    product_id: number;
    product: Product;
    inbound_order_item_id: number;
    purchase_order_item_id: number;
    serial_tracking_enabled: boolean;
    purchase_price: number;
    inbound_quantity: number;
    sold_quantity: number;
    returned_quantity: number;
    returnable_quantity: number;
    inventory_items: Array<{ id: number; serial_number?: string | null; status: 'in_stock' }>;
}

interface ReturnableData {
    inbound_order: InboundOrder;
    purchase_order?: PurchaseOrder;
    supplier?: Supplier;
    groups: ReturnableGroup[];
}

type TabKey = 'purchase' | 'returns';

const purchaseStatusMap: Record<PurchaseOrder['status'], { label: string; color: string }> = {
    draft: { label: '预下单', color: 'default' },
    ordered: { label: '已下单', color: 'blue' },
    partial_inbound: { label: '部分入库', color: 'orange' },
    inbound: { label: '已入库', color: 'green' },
    cancelled: { label: '已取消', color: 'red' },
};

const paymentStatusMap: Record<
    PurchaseOrder['summary']['payment_status'],
    { label: string; color: string }
> = {
    unpaid: { label: '未付款', color: 'orange' },
    partial_paid: { label: '部分付款', color: 'blue' },
    settled: { label: '已结清', color: 'green' },
};

const returnGoodsStatusMap: Record<
    PurchaseReturn['goods_status'],
    { label: string; color: string }
> = {
    pending_shipment: { label: '待寄回', color: 'orange' },
    shipped: { label: '已寄回', color: 'blue' },
    merchant_received: { label: '商家已收货', color: 'green' },
    cancelled: { label: '已取消', color: 'red' },
};

const returnRefundStatusMap: Record<
    PurchaseReturn['refund_status'],
    { label: string; color: string }
> = {
    unrefunded: { label: '未退款', color: 'orange' },
    partial_refunded: { label: '部分退款', color: 'blue' },
    refunded: { label: '已退款', color: 'green' },
};

const shippingBearerMap: Record<PurchaseReturn['shipping_fee_bearer'], string> = {
    self: '我方',
    merchant: '商家',
    shared: '平摊',
};

type FormInstance = ReturnType<typeof Form.useForm>[0];

const syncReturnShippingSplit = (
    form: FormInstance,
    bearer?: PurchaseReturn['shipping_fee_bearer'],
    shippingFeeValue?: number | string | null
) => {
    const rawShippingFee =
        shippingFeeValue === undefined ? form.getFieldValue('shipping_fee') : shippingFeeValue;
    const parsedShippingFee = Number(rawShippingFee || 0);
    const shippingFee = Number.isFinite(parsedShippingFee) ? parsedShippingFee : 0;
    const nextBearer =
        bearer ||
        (form.getFieldValue('shipping_fee_bearer') as PurchaseReturn['shipping_fee_bearer']) ||
        'self';

    if (nextBearer === 'self') {
        form.setFieldsValue({ self_shipping_fee: shippingFee, merchant_shipping_fee: 0 });
    }
    if (nextBearer === 'merchant') {
        form.setFieldsValue({ self_shipping_fee: 0, merchant_shipping_fee: shippingFee });
    }
};

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabKey>(
        searchParams.get('tab') === 'returns' ? 'returns' : 'purchase'
    );
    const [search, setSearch] = useState('');
    const [goodsStatus, setGoodsStatus] = useState('all');
    const [paymentStatus, setPaymentStatus] = useState('all');
    const [returnsSearch, setReturnsSearch] = useState('');
    const [returnGoodsStatus, setReturnGoodsStatus] = useState('all');
    const [returnRefundStatus, setReturnRefundStatus] = useState('all');
    const [returnInboundOrderId, setReturnInboundOrderId] = useState<number | undefined>(
        Number(searchParams.get('inboundOrderId') || 0) || undefined
    );
    const [formVisible, setFormVisible] = useState(false);
    const [paymentVisible, setPaymentVisible] = useState(false);
    const [voidVisible, setVoidVisible] = useState(false);
    const [returnVisible, setReturnVisible] = useState(false);
    const [editReturnVisible, setEditReturnVisible] = useState(false);
    const [shipVisible, setShipVisible] = useState(false);
    const [returnRefundVisible, setReturnRefundVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<PurchaseOrder | null>(null);
    const [voidTarget, setVoidTarget] = useState<{
        order: PurchaseOrder;
        payment: PurchasePayment;
    } | null>(null);
    const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
    const [shippingReturn, setShippingReturn] = useState<PurchaseReturn | null>(null);
    const [refundReturn, setRefundReturn] = useState<PurchaseReturn | null>(null);
    const [returnableData, setReturnableData] = useState<ReturnableData | null>(null);
    const [form] = Form.useForm();
    const [paymentForm] = Form.useForm();
    const [voidForm] = Form.useForm();
    const [returnForm] = Form.useForm();
    const [editReturnForm] = Form.useForm();
    const [shipForm] = Form.useForm();
    const [returnRefundForm] = Form.useForm();

    const {
        data: purchaseOrders = [],
        loading,
        refresh: refreshPurchaseOrders,
    } = useRequest(
        () =>
            fetchPurchaseOrders({
                search,
                goods_status: goodsStatus,
                payment_status: paymentStatus,
            }),
        {
            refreshDeps: [search, goodsStatus, paymentStatus],
            debounceWait: 300,
        }
    );
    const {
        data: purchaseReturns = [],
        loading: returnsLoading,
        refresh: refreshPurchaseReturns,
    } = useRequest(
        () =>
            fetchPurchaseReturns({
                search: returnsSearch,
                inbound_order_id: returnInboundOrderId,
                goods_status: returnGoodsStatus,
                refund_status: returnRefundStatus,
            }),
        {
            refreshDeps: [
                returnsSearch,
                returnInboundOrderId,
                returnGoodsStatus,
                returnRefundStatus,
            ],
            debounceWait: 300,
        }
    );
    const { data: suppliers = [] } = useRequest(fetchSuppliers);
    const { data: products = [] } = useRequest(fetchDashboardProducts);
    const { data: logisticsCompanies = [] } = useRequest(() =>
        fetchLogisticsCompanies({ status: 'active' })
    );
    const { data: inboundOrders = [], refresh: refreshInboundOrders } = useRequest(() =>
        fetchInboundOrders({ source_type: 'purchase_order' })
    );
    const { runAsync: loadReturnableItems, loading: returnableLoading } = useRequest(
        fetchInboundOrderReturnableItems,
        { manual: true }
    );

    const watchedItems = Form.useWatch('items', form) as PurchaseFormItem[] | undefined;
    const watchedShippingFee = Form.useWatch('shipping_fee', form);
    const watchedMiscFee = Form.useWatch('misc_fee', form);
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

    const logisticsCompanyOptions = useMemo(
        () =>
            (logisticsCompanies as LogisticsCompany[]).map((company) => ({
                label: company.name,
                value: company.id,
            })),
        [logisticsCompanies]
    );

    const returnableInboundOptions = useMemo(
        () =>
            (inboundOrders as InboundOrder[])
                .filter((order) => Number(order.summary?.returnable_quantity || 0) > 0)
                .map((order) => ({
                    label: [
                        `RK-${order.id}`,
                        order.purchase_order_id ? `JH-${order.purchase_order_id}` : null,
                        order.supplier?.name,
                        `可退 ${order.summary.returnable_quantity} 件`,
                    ]
                        .filter(Boolean)
                        .join(' / '),
                    value: order.id,
                })),
        [inboundOrders]
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
            payableAmount: goodsAmount + miscFee,
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
        }),
        [purchaseOrders]
    );

    const refreshAll = () => {
        refreshPurchaseOrders();
        refreshPurchaseReturns();
        refreshInboundOrders();
    };

    const replacePurchaseOrderUrl = (params: URLSearchParams) => {
        const query = params.toString();
        router.replace(`/admin/dashboard/warehouse/purchase-orders${query ? `?${query}` : ''}`);
    };

    const clearReturnCreateAction = () => {
        if (searchParams.get('action') !== 'create') return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete('action');
        replacePurchaseOrderUrl(params);
    };

    const closeReturnModal = () => {
        setReturnVisible(false);
        setReturnableData(null);
        returnForm.resetFields();
        clearReturnCreateAction();
    };

    const setReturnFormDefaults = () => {
        returnForm.setFieldsValue({
            shipping_fee: 0,
            shipping_fee_bearer: 'self',
            self_shipping_fee: 0,
            merchant_shipping_fee: 0,
            logistics_company_id: undefined,
            tracking_no: undefined,
        });
    };

    const updateReturnInboundFilter = (inboundOrderId?: number) => {
        setReturnInboundOrderId(inboundOrderId);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'returns');
        params.delete('action');
        if (inboundOrderId) {
            params.set('inboundOrderId', String(inboundOrderId));
        } else {
            params.delete('inboundOrderId');
        }
        replacePurchaseOrderUrl(params);
    };

    const updateTab = (tab: TabKey) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        params.delete('action');
        if (tab === 'purchase') params.delete('inboundOrderId');
        replacePurchaseOrderUrl(params);
    };

    const handleLoadReturnableItems = async (inboundOrderId: number) => {
        setReturnableData(null);
        returnForm.setFieldsValue({ inbound_order_id: inboundOrderId, items: [] });
        const data = (await loadReturnableItems(inboundOrderId)) as ReturnableData;
        setReturnableData(data);
        returnForm.setFieldsValue({
            inbound_order_id: inboundOrderId,
            items: data.groups.map((group) => ({
                inbound_order_item_id: group.inbound_order_item_id,
                product_id: group.product_id,
                quantity: 0,
                inventory_item_ids: [],
            })),
        });
    };

    useEffect(() => {
        const tab = searchParams.get('tab') === 'returns' ? 'returns' : 'purchase';
        setActiveTab(tab);
        const inboundId = Number(searchParams.get('inboundOrderId') || 0) || undefined;
        setReturnInboundOrderId(inboundId);

        if (tab === 'returns' && searchParams.get('action') === 'create') {
            setReturnVisible(true);
            setReturnableData(null);
            returnForm.resetFields();
            setReturnFormDefaults();
            if (inboundId) {
                handleLoadReturnableItems(inboundId).catch((e) => message.error(e.message));
            }
            clearReturnCreateAction();
            return;
        }

        if (tab === 'purchase' && searchParams.get('action') === 'create') {
            openCreate();
            clearReturnCreateAction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const { runAsync: submitPurchaseOrder, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            const itemsLocked = Boolean(
                editingOrder &&
                    (editingOrder.status === 'partial_inbound' ||
                        editingOrder.status === 'inbound' ||
                        editingOrder.status === 'cancelled' ||
                        editingOrder.summary.total_received_quantity > 0)
            );
            const payload = {
                supplier_id: values.supplier_id,
                ordered_at: values.ordered_at?.toISOString(),
                expected_inbound_at: values.expected_inbound_at?.toISOString() || null,
                shipping_fee: values.shipping_fee || 0,
                misc_fee: values.misc_fee || 0,
                logistics_company_id: values.logistics_company_id || null,
                tracking_no: values.tracking_no || null,
                note: values.note || null,
                ...(itemsLocked
                    ? {}
                    : {
                          status: values.status,
                          items: values.items.map((item: PurchaseFormItem) => ({
                              id: item.id,
                              product_id: item.product_id,
                              ordered_quantity: item.ordered_quantity,
                              purchase_price: item.purchase_price,
                              note: item.note || null,
                          })),
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
                refreshPurchaseOrders();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitConfirm, loading: confirming } = useRequest(confirmPurchaseOrder, {
        manual: true,
        onSuccess: () => {
            message.success('进货单已确认下单');
            refreshPurchaseOrders();
        },
        onError: (e) => message.error(e.message),
    });

    const { runAsync: submitCancel, loading: cancelling } = useRequest(cancelPurchaseOrder, {
        manual: true,
        onSuccess: () => {
            message.success('进货单已取消');
            refreshPurchaseOrders();
        },
        onError: (e) => message.error(e.message),
    });

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
                refreshPurchaseOrders();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitVoidPayment, loading: voiding } = useRequest(
        async () => {
            if (!voidTarget) return;
            const values = await voidForm.validateFields();
            await voidPurchasePayment(
                voidTarget.order.id,
                voidTarget.payment.id,
                values.void_reason
            );
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('付款记录已作废');
                setVoidVisible(false);
                setVoidTarget(null);
                voidForm.resetFields();
                refreshPurchaseOrders();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitCreateReturn, loading: creatingReturn } = useRequest(
        async () => {
            const values = await returnForm.validateFields();
            const groups = returnableData?.groups || [];
            const selectedItems = (values.items || [])
                .map((item: Record<string, unknown>, index: number) => {
                    const group = groups[index];
                    if (!group) return null;
                    const inventoryIds = Array.isArray(item.inventory_item_ids)
                        ? item.inventory_item_ids.map(Number).filter(Boolean)
                        : [];
                    const quantity = Number(item.quantity || 0);
                    if (group.serial_tracking_enabled) {
                        return inventoryIds.length > 0
                            ? {
                                  inbound_order_item_id: group.inbound_order_item_id,
                                  product_id: group.product_id,
                                  inventory_item_ids: inventoryIds,
                              }
                            : null;
                    }
                    return quantity > 0
                        ? {
                              inbound_order_item_id: group.inbound_order_item_id,
                              product_id: group.product_id,
                              quantity,
                          }
                        : null;
                })
                .filter(Boolean);

            if (selectedItems.length === 0) throw new Error('请选择至少一项可退库存');

            await createPurchaseReturn({
                inbound_order_id: values.inbound_order_id,
                reason: values.reason,
                note: values.note || null,
                shipping_fee: values.shipping_fee || 0,
                shipping_fee_bearer: values.shipping_fee_bearer || 'self',
                self_shipping_fee: values.self_shipping_fee || 0,
                merchant_shipping_fee: values.merchant_shipping_fee || 0,
                logistics_company_id: values.logistics_company_id || null,
                tracking_no: values.tracking_no || null,
                items: selectedItems,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('采购退货已创建');
                closeReturnModal();
                refreshAll();
                router.replace('/admin/dashboard/warehouse/purchase-orders?tab=returns');
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitEditReturn, loading: editingReturnLoading } = useRequest(
        async () => {
            if (!editingReturn) return;
            const values = await editReturnForm.validateFields();
            await updatePurchaseReturn(editingReturn.id, values);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('退货记录已更新');
                setEditReturnVisible(false);
                setEditingReturn(null);
                editReturnForm.resetFields();
                refreshPurchaseReturns();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitShipReturn, loading: shippingReturnLoading } = useRequest(
        async () => {
            if (!shippingReturn) return;
            const values = await shipForm.validateFields();
            await shipPurchaseReturn(shippingReturn.id, {
                ...values,
                shipped_at: values.shipped_at?.toISOString(),
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('已确认寄回');
                setShipVisible(false);
                setShippingReturn(null);
                shipForm.resetFields();
                refreshPurchaseReturns();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitReturnRefund, loading: returnRefunding } = useRequest(
        async () => {
            if (!refundReturn) return;
            const values = await returnRefundForm.validateFields();
            await createPurchaseReturnRefund(refundReturn.id, {
                amount: values.amount,
                refund_account: values.refund_account || null,
                refunded_at: values.refunded_at?.toISOString(),
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('退货收款已登记');
                setReturnRefundVisible(false);
                setRefundReturn(null);
                returnRefundForm.resetFields();
                refreshPurchaseReturns();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openCreate = () => {
        setEditingOrder(null);
        form.resetFields();
        form.setFieldsValue({
            status: 'draft',
            ordered_at: dayjs(),
            shipping_fee: 0,
            misc_fee: 0,
            logistics_company_id: undefined,
            tracking_no: undefined,
            items: [{ ordered_quantity: 1, purchase_price: 0 }],
        });
        setFormVisible(true);
    };

    const openEdit = (order: PurchaseOrder) => {
        setEditingOrder(order);
        form.resetFields();
        form.setFieldsValue({
            supplier_id: order.supplier_id,
            status: order.status,
            ordered_at: order.ordered_at ? dayjs(order.ordered_at) : dayjs(),
            expected_inbound_at: order.expected_inbound_at
                ? dayjs(order.expected_inbound_at)
                : undefined,
            shipping_fee: order.shipping_fee,
            misc_fee: order.misc_fee,
            logistics_company_id: order.logistics_record?.company_id || undefined,
            tracking_no: order.logistics_record?.tracking_no || undefined,
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
        setVoidTarget({ order, payment });
        voidForm.resetFields();
        setVoidVisible(true);
    };

    const openCreateReturn = async (inboundOrderId?: number) => {
        setActiveTab('returns');
        setReturnVisible(true);
        setReturnableData(null);
        returnForm.resetFields();
        setReturnFormDefaults();
        if (inboundOrderId) {
            await handleLoadReturnableItems(inboundOrderId);
        }
    };

    const openEditReturn = (record: PurchaseReturn) => {
        setEditingReturn(record);
        editReturnForm.resetFields();
        editReturnForm.setFieldsValue({
            reason: record.reason,
            note: record.note,
            shipping_fee: record.shipping_fee,
            shipping_fee_bearer: record.shipping_fee_bearer,
            self_shipping_fee: record.self_shipping_fee,
            merchant_shipping_fee: record.merchant_shipping_fee,
            logistics_company_id:
                record.logistics_company_id || record.logistics_record?.company_id || undefined,
            tracking_no: record.tracking_no,
        });
        syncReturnShippingSplit(editReturnForm);
        setEditReturnVisible(true);
    };

    const openShipReturn = (record: PurchaseReturn) => {
        setShippingReturn(record);
        shipForm.resetFields();
        shipForm.setFieldsValue({
            logistics_company_id:
                record.logistics_company_id || record.logistics_record?.company_id || undefined,
            tracking_no: record.tracking_no,
            shipped_at: dayjs(),
            shipping_fee: record.shipping_fee,
            shipping_fee_bearer: record.shipping_fee_bearer || 'self',
            self_shipping_fee: record.self_shipping_fee,
            merchant_shipping_fee: record.merchant_shipping_fee,
        });
        syncReturnShippingSplit(shipForm);
        setShipVisible(true);
    };

    const openReturnRefund = (record: PurchaseReturn) => {
        setRefundReturn(record);
        returnRefundForm.resetFields();
        returnRefundForm.setFieldsValue({
            amount: record.pending_refund,
            refunded_at: dayjs(),
        });
        setReturnRefundVisible(true);
    };

    const goInbound = (order: PurchaseOrder, create: boolean) => {
        const params = new URLSearchParams({ purchaseOrderId: String(order.id) });
        if (create) params.set('action', 'create');
        router.push(`/admin/dashboard/warehouse/inbound?${params.toString()}`);
    };

    const purchaseColumns: ColumnsType<PurchaseOrder> = [
        {
            title: '进货单号',
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
            title: '货物状态',
            dataIndex: 'status',
            width: 120,
            render: (value: PurchaseOrder['status']) => {
                const status = purchaseStatusMap[value] || purchaseStatusMap.ordered;
                return <Tag color={status.color}>{status.label}</Tag>;
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
            title: '资金状态',
            width: 220,
            render: (_, record) => {
                const status =
                    paymentStatusMap[record.summary.payment_status] || paymentStatusMap.unpaid;
                return (
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div>应付 {formatPrice(record.summary.payable_amount)}</div>
                        <div>已付 {formatPrice(record.summary.paid_amount)}</div>
                        <Tag color={status.color}>{status.label}</Tag>
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
            width: 300,
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {record.status === 'draft' && (
                        <Popconfirm
                            title="确认该进货单已正式下单？"
                            okText="确认下单"
                            cancelText="再看看"
                            okButtonProps={{ loading: confirming }}
                            onConfirm={() => submitConfirm(record.id)}
                        >
                            <Button type="link">确认下单</Button>
                        </Popconfirm>
                    )}
                    <Button type="link" onClick={() => openEdit(record)}>
                        {record.status === 'cancelled' ? '查看' : '编辑'}
                    </Button>
                    {record.summary.total_remaining_quantity > 0 &&
                        record.status !== 'draft' &&
                        record.status !== 'cancelled' && (
                            <Button type="link" onClick={() => goInbound(record, true)}>
                                {record.status === 'partial_inbound' ? '继续入库' : '入库'}
                            </Button>
                        )}
                    {record.summary.total_received_quantity > 0 && (
                        <Button type="link" onClick={() => goInbound(record, false)}>
                            查看入库记录
                        </Button>
                    )}
                    {record.summary.pending_payment > 0 &&
                        record.summary.total_received_quantity > 0 &&
                        record.status !== 'cancelled' && (
                            <Button type="link" onClick={() => openPayment(record)}>
                                付款
                            </Button>
                        )}
                    {record.status === 'draft' && (
                        <Popconfirm
                            title="确认取消该预下单？"
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

    const returnColumns: ColumnsType<PurchaseReturn> = [
        {
            title: '退货单号',
            dataIndex: 'id',
            width: 110,
            render: (id) => <span className="font-mono text-gray-400">TH-{id}</span>,
        },
        {
            title: '关联单号',
            width: 150,
            render: (_, record) => (
                <div className="space-y-1 text-xs">
                    <Tag color="blue">JH-{record.purchase_order_id}</Tag>
                    <Tag color="purple">RK-{record.inbound_order_id}</Tag>
                </div>
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
            title: '商品汇总',
            width: 220,
            render: (_, record) => (
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {(record.items || []).slice(0, 3).map((item) => (
                        <div key={item.id}>{item.product?.name || `物品 ${item.product_id}`}</div>
                    ))}
                    {(record.items || []).length > 3 && <div>...</div>}
                </div>
            ),
        },
        {
            title: '退货金额',
            width: 130,
            align: 'right',
            render: (_, record) => (
                <span className="font-mono font-black text-red-500">
                    {formatPrice(record.amount)}
                </span>
            ),
        },
        {
            title: '退货运费',
            width: 140,
            render: (_, record) => (
                <div className="space-y-1 text-xs text-gray-500">
                    <div>{formatPrice(record.shipping_fee)}</div>
                    <Tag>{shippingBearerMap[record.shipping_fee_bearer]}</Tag>
                </div>
            ),
        },
        {
            title: '货物状态',
            width: 120,
            render: (_, record) => {
                const status = returnGoodsStatusMap[record.goods_status];
                return <Tag color={status.color}>{status.label}</Tag>;
            },
        },
        {
            title: '资金状态',
            width: 130,
            render: (_, record) => {
                const status = returnRefundStatusMap[record.refund_status];
                return <Tag color={status.color}>{status.label}</Tag>;
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 170,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 270,
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="link" onClick={() => openEditReturn(record)}>
                        {record.goods_status === 'cancelled' ? '查看' : '编辑'}
                    </Button>
                    {record.goods_status === 'pending_shipment' && (
                        <Button type="link" onClick={() => openShipReturn(record)}>
                            确认发货
                        </Button>
                    )}
                    {record.goods_status === 'shipped' && (
                        <Popconfirm
                            title="确认商家已收到退货？"
                            okText="确认收货"
                            cancelText="取消"
                            onConfirm={async () => {
                                await receivePurchaseReturnByMerchant(record.id, {});
                                message.success('已确认商家收货');
                                refreshPurchaseReturns();
                            }}
                        >
                            <Button type="link">确认商家收货</Button>
                        </Popconfirm>
                    )}
                    {record.goods_status !== 'cancelled' && record.pending_refund > 0 && (
                        <Button type="link" onClick={() => openReturnRefund(record)}>
                            确认收款
                        </Button>
                    )}
                    {record.goods_status === 'pending_shipment' && (
                        <Popconfirm
                            title="确认取消该退货？库存件会恢复为在库。"
                            okText="取消退货"
                            cancelText="保留"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                                await cancelPurchaseReturn(record.id, {});
                                message.success('退货已取消');
                                refreshAll();
                            }}
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

    const itemsLocked = Boolean(
        editingOrder &&
            (editingOrder.status === 'partial_inbound' ||
                editingOrder.status === 'inbound' ||
                editingOrder.status === 'cancelled' ||
                editingOrder.summary.total_received_quantity > 0)
    );

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
                            进货/退货
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            进货单管理采购进度与付款，采购退货独立维护寄回和收款状态。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button icon={<ReloadOutlined />} onClick={refreshAll} />
                        {activeTab === 'purchase' ? (
                            <Button
                                type="primary"
                                size="large"
                                icon={<PlusOutlined />}
                                onClick={openCreate}
                                className="h-12 px-6 rounded-xl bg-blue-600 border-none shadow-lg shadow-blue-600/20"
                            >
                                新增进货单
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                size="large"
                                danger
                                icon={<RollbackOutlined />}
                                onClick={() => {
                                    const targetInboundOrderId = returnableInboundOptions.some(
                                        (option) => option.value === returnInboundOrderId
                                    )
                                        ? returnInboundOrderId
                                        : undefined;
                                    openCreateReturn(targetInboundOrderId).catch((e) =>
                                        message.error(e.message)
                                    );
                                }}
                                className="h-12 px-6 rounded-xl border-none"
                            >
                                新增退货
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => updateTab(key as TabKey)}
                    items={[
                        {
                            key: 'purchase',
                            label: '进货',
                            children: (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <SummaryCard
                                            label="进货单数"
                                            value={`${pageSummary.total} 张`}
                                        />
                                        <SummaryCard
                                            label="采购数量"
                                            value={`${pageSummary.orderedQuantity} 件`}
                                        />
                                        <SummaryCard
                                            label="未入库"
                                            value={`${pageSummary.remainingQuantity} 件`}
                                        />
                                        <SummaryCard
                                            label="待付款"
                                            value={formatPrice(pageSummary.pendingPayment)}
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
                                        <div className="flex flex-col gap-3 md:flex-row">
                                            <Select
                                                value={goodsStatus}
                                                onChange={setGoodsStatus}
                                                className="w-full md:w-48"
                                                options={[
                                                    { label: '全部货物状态', value: 'all' },
                                                    { label: '预下单', value: 'draft' },
                                                    { label: '已下单', value: 'ordered' },
                                                    {
                                                        label: '部分入库',
                                                        value: 'partial_inbound',
                                                    },
                                                    { label: '已入库', value: 'inbound' },
                                                    { label: '已取消', value: 'cancelled' },
                                                ]}
                                            />
                                            <Select
                                                value={paymentStatus}
                                                onChange={setPaymentStatus}
                                                className="w-full md:w-48"
                                                options={[
                                                    { label: '全部资金状态', value: 'all' },
                                                    { label: '未付款', value: 'unpaid' },
                                                    {
                                                        label: '部分付款',
                                                        value: 'partial_paid',
                                                    },
                                                    { label: '已结清', value: 'settled' },
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={purchaseColumns}
                                            dataSource={purchaseOrders}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1300 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <PurchaseOrderDetails
                                                        order={record}
                                                        onPayment={() => openPayment(record)}
                                                        onVoidPayment={(payment) =>
                                                            openVoidPayment(record, payment)
                                                        }
                                                        onViewInbound={() =>
                                                            goInbound(record, false)
                                                        }
                                                    />
                                                ),
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                        },
                        {
                            key: 'returns',
                            label: '退货',
                            children: (
                                <div className="space-y-6">
                                    <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <Input
                                            allowClear
                                            prefix={<SearchOutlined className="text-gray-400" />}
                                            placeholder="搜索退货单、进货单、入库单、商家或商品..."
                                            value={returnsSearch}
                                            onChange={(e) => setReturnsSearch(e.target.value)}
                                            className="max-w-lg h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                                        />
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <Select
                                                allowClear
                                                placeholder="入库单筛选"
                                                value={returnInboundOrderId}
                                                onChange={updateReturnInboundFilter}
                                                options={(inboundOrders as InboundOrder[]).map(
                                                    (order) => ({
                                                        label: `RK-${order.id} / JH-${order.purchase_order_id || '-'}`,
                                                        value: order.id,
                                                    })
                                                )}
                                            />
                                            <Select
                                                value={returnGoodsStatus}
                                                onChange={setReturnGoodsStatus}
                                                options={[
                                                    { label: '全部货物状态', value: 'all' },
                                                    {
                                                        label: '待寄回',
                                                        value: 'pending_shipment',
                                                    },
                                                    { label: '已寄回', value: 'shipped' },
                                                    {
                                                        label: '商家已收货',
                                                        value: 'merchant_received',
                                                    },
                                                    { label: '已取消', value: 'cancelled' },
                                                ]}
                                            />
                                            <Select
                                                value={returnRefundStatus}
                                                onChange={setReturnRefundStatus}
                                                options={[
                                                    { label: '全部资金状态', value: 'all' },
                                                    { label: '未退款', value: 'unrefunded' },
                                                    {
                                                        label: '部分退款',
                                                        value: 'partial_refunded',
                                                    },
                                                    { label: '已退款', value: 'refunded' },
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                                        <Table
                                            rowKey="id"
                                            loading={returnsLoading}
                                            columns={returnColumns}
                                            dataSource={purchaseReturns}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1500 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <PurchaseReturnDetails record={record} />
                                                ),
                                            }}
                                        />
                                    </div>
                                </div>
                            ),
                        },
                    ]}
                />
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
                                    editingOrder &&
                                        (editingOrder.summary.total_received_quantity > 0 ||
                                            editingOrder.status === 'cancelled')
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            name="status"
                            label="货物状态"
                            rules={[{ required: true, message: '请选择货物状态' }]}
                        >
                            <Select
                                disabled={Boolean(
                                    editingOrder &&
                                        (editingOrder.summary.total_received_quantity > 0 ||
                                            editingOrder.status === 'cancelled')
                                )}
                                options={[
                                    { label: '预下单', value: 'draft' },
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
                        <Form.Item name="logistics_company_id" label="物流公司">
                            <Select
                                allowClear
                                showSearch
                                options={logisticsCompanyOptions}
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Form.Item name="tracking_no" label="物流单号">
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    {itemsLocked ? (
                        <ReadonlyItems items={editingOrder?.items || []} />
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
                        {editingOrder?.status !== 'cancelled' && (
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={submitPurchaseOrder}
                            >
                                保存进货单
                            </Button>
                        )}
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
                                    label="商家应付款"
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
                title="作废付款记录"
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

            <Modal
                title="新增采购退货"
                open={returnVisible}
                onCancel={closeReturnModal}
                footer={null}
                destroyOnHidden
                width={980}
            >
                <Form form={returnForm} layout="vertical" className="pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Form.Item
                            name="inbound_order_id"
                            label="入库单"
                            rules={[{ required: true, message: '请选择入库单' }]}
                        >
                            <Select
                                showSearch
                                options={returnableInboundOptions}
                                optionFilterProp="label"
                                loading={returnableLoading}
                                onChange={(id) =>
                                    handleLoadReturnableItems(id).catch((e) =>
                                        message.error(e.message)
                                    )
                                }
                                placeholder="选择仍有可退库存的入库单"
                            />
                        </Form.Item>
                        <Form.Item
                            name="reason"
                            label="退货原因"
                            rules={[{ required: true, message: '请填写退货原因' }]}
                        >
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <ReturnLogisticsFields
                        form={returnForm}
                        logisticsCompanyOptions={logisticsCompanyOptions}
                    />

                    {returnableData && (
                        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/70 p-4 dark:border-red-900/40 dark:bg-red-900/10">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <ReadonlyCell
                                    label="入库单"
                                    value={`RK-${returnableData.inbound_order.id}`}
                                />
                                <ReadonlyCell
                                    label="进货单"
                                    value={`JH-${returnableData.inbound_order.purchase_order_id}`}
                                />
                                <ReadonlyCell
                                    label="商家"
                                    value={returnableData.supplier?.name || '-'}
                                />
                                <ReadonlyCell
                                    label="可退数量"
                                    value={`${returnableData.inbound_order.summary.returnable_quantity} 件`}
                                    strong
                                />
                            </div>
                        </div>
                    )}

                    <Form.List name="items">
                        {(fields) => (
                            <div className="space-y-4">
                                {fields.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-black/20">
                                        请选择入库单后再选择退货明细
                                    </div>
                                )}
                                {fields.map((field, index) => (
                                    <ReturnItemSelector
                                        key={field.key}
                                        fieldName={field.name}
                                        group={returnableData?.groups[index]}
                                    />
                                ))}
                            </div>
                        )}
                    </Form.List>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={closeReturnModal}>取消</Button>
                        <Button
                            danger
                            type="primary"
                            loading={creatingReturn}
                            onClick={submitCreateReturn}
                        >
                            创建退货
                        </Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={editingReturn ? `编辑 TH-${editingReturn.id}` : '编辑退货记录'}
                open={editReturnVisible}
                onCancel={() => setEditReturnVisible(false)}
                onOk={submitEditReturn}
                confirmLoading={editingReturnLoading}
                destroyOnHidden
                width={720}
            >
                <ReturnBaseForm
                    form={editReturnForm}
                    logisticsCompanyOptions={logisticsCompanyOptions}
                />
            </Modal>

            <Modal
                title={shippingReturn ? `确认 TH-${shippingReturn.id} 发货` : '确认发货'}
                open={shipVisible}
                onCancel={() => setShipVisible(false)}
                onOk={submitShipReturn}
                confirmLoading={shippingReturnLoading}
                destroyOnHidden
                width={720}
            >
                <Form form={shipForm} layout="vertical" className="pt-4">
                    <ReturnLogisticsFields
                        form={shipForm}
                        logisticsCompanyOptions={logisticsCompanyOptions}
                        includeShippedAt
                    />
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={refundReturn ? `登记 TH-${refundReturn.id} 收款` : '登记退货收款'}
                open={returnRefundVisible}
                onCancel={() => setReturnRefundVisible(false)}
                onOk={submitReturnRefund}
                confirmLoading={returnRefunding}
                destroyOnHidden
                width={620}
            >
                <Form form={returnRefundForm} layout="vertical" className="pt-4">
                    {refundReturn && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="应收退款"
                                    value={formatPrice(refundReturn.receivable_amount)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="待收退款"
                                    value={formatPrice(refundReturn.pending_refund)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="amount"
                        label="本次收款金额"
                        rules={[{ required: true, message: '请输入本次收款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={refundReturn?.pending_refund}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="refund_account" label="收款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="refunded_at"
                        label="收款时间"
                        rules={[{ required: true, message: '请选择收款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
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
                    <Button danger type="text" onClick={onRemove}>
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

function ReturnItemSelector({ fieldName, group }: { fieldName: number; group?: ReturnableGroup }) {
    if (!group) return null;

    return (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-black/20 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {group.product?.name || `物品 ${group.product_id}`}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                        入库 {group.inbound_quantity} / 已售 {group.sold_quantity} / 已退{' '}
                        {group.returned_quantity} / 可退 {group.returnable_quantity}
                    </div>
                </div>
                <div className="text-sm md:text-right">
                    <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                        {formatPrice(group.purchase_price)}
                    </div>
                    <div className="text-xs text-gray-400">退货商品单价</div>
                </div>
            </div>
            <Form.Item name={[fieldName, 'inbound_order_item_id']} hidden>
                <Input />
            </Form.Item>
            <Form.Item name={[fieldName, 'product_id']} hidden>
                <Input />
            </Form.Item>
            {group.serial_tracking_enabled ? (
                <Form.Item name={[fieldName, 'inventory_item_ids']} label="选择库存件">
                    <Select
                        mode="multiple"
                        options={group.inventory_items.map((item) => ({
                            label: `#${item.id} / ${item.serial_number || '-'}`,
                            value: item.id,
                        }))}
                        placeholder="序列号管理物品必须选择具体库存件"
                    />
                </Form.Item>
            ) : (
                <Form.Item name={[fieldName, 'quantity']} label="退货数量">
                    <InputNumber
                        min={0}
                        max={group.returnable_quantity}
                        precision={0}
                        className="w-full"
                    />
                </Form.Item>
            )}
        </div>
    );
}

function ReturnBaseForm({
    form,
    logisticsCompanyOptions,
}: {
    form: ReturnType<typeof Form.useForm>[0];
    logisticsCompanyOptions: { label: string; value: number }[];
}) {
    return (
        <Form form={form} layout="vertical" className="pt-4">
            <Form.Item
                name="reason"
                label="退货原因"
                rules={[{ required: true, message: '请填写退货原因' }]}
            >
                <Input />
            </Form.Item>
            <ReturnLogisticsFields form={form} logisticsCompanyOptions={logisticsCompanyOptions} />
            <Form.Item name="note" label="备注">
                <Input.TextArea rows={3} />
            </Form.Item>
        </Form>
    );
}

function ReturnLogisticsFields({
    form,
    logisticsCompanyOptions,
    includeShippedAt = false,
}: {
    form: ReturnType<typeof Form.useForm>[0];
    logisticsCompanyOptions: { label: string; value: number }[];
    includeShippedAt?: boolean;
}) {
    const shippingFeeBearer =
        (Form.useWatch('shipping_fee_bearer', form) as
            | PurchaseReturn['shipping_fee_bearer']
            | undefined) || 'self';

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item name="logistics_company_id" label="物流公司">
                <Select
                    allowClear
                    showSearch
                    options={logisticsCompanyOptions}
                    optionFilterProp="label"
                />
            </Form.Item>
            <Form.Item name="tracking_no" label="物流单号">
                <Input />
            </Form.Item>
            {includeShippedAt && (
                <Form.Item
                    name="shipped_at"
                    label="发货时间"
                    rules={[{ required: true, message: '请选择发货时间' }]}
                >
                    <DatePicker showTime className="w-full" />
                </Form.Item>
            )}
            <Form.Item name="shipping_fee" label="退货运费">
                <InputNumber
                    min={0}
                    precision={2}
                    prefix="¥"
                    className="w-full"
                    onChange={(value) => syncReturnShippingSplit(form, undefined, value)}
                />
            </Form.Item>
            <Form.Item name="shipping_fee_bearer" label="运费承担方">
                <Select
                    options={[
                        { label: '我方', value: 'self' },
                        { label: '商家', value: 'merchant' },
                        { label: '平摊', value: 'shared' },
                    ]}
                    onChange={(value) => syncReturnShippingSplit(form, value)}
                />
            </Form.Item>
            <Form.Item name="self_shipping_fee" label="我方承担">
                <InputNumber
                    min={0}
                    precision={2}
                    prefix="¥"
                    className="w-full"
                    disabled={shippingFeeBearer !== 'shared'}
                />
            </Form.Item>
            <Form.Item name="merchant_shipping_fee" label="商家承担">
                <InputNumber
                    min={0}
                    precision={2}
                    prefix="¥"
                    className="w-full"
                    disabled={shippingFeeBearer !== 'shared'}
                />
            </Form.Item>
        </div>
    );
}
function PurchaseOrderDetails({
    order,
    onPayment,
    onVoidPayment,
    onViewInbound,
}: {
    order: PurchaseOrder;
    onPayment: () => void;
    onVoidPayment: (payment: PurchasePayment) => void;
    onViewInbound: () => void;
}) {
    return (
        <div className="space-y-5 bg-gray-50/70 p-4 dark:bg-black/20">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <ReadonlyCell label="已入库商品" value={formatPrice(order.summary.goods_amount)} />
                <ReadonlyCell label="运费" value={formatPrice(order.shipping_fee)} />
                <ReadonlyCell
                    label="物流"
                    value={
                        [order.logistics_record?.company?.name, order.logistics_record?.tracking_no]
                            .filter(Boolean)
                            .join(' / ') || '-'
                    }
                />
                <ReadonlyCell label="杂费" value={formatPrice(order.misc_fee)} />
                <ReadonlyCell
                    label="商家应付款"
                    value={formatPrice(order.summary.payable_amount)}
                    strong
                />
                <ReadonlyCell label="已付款" value={formatPrice(order.summary.paid_amount)} />
                <ReadonlyCell
                    label="待付款"
                    value={formatPrice(order.summary.pending_payment)}
                    strong
                />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">进货明细</div>
                    {(order.items || []).map((item) => (
                        <PurchaseItemReadonly key={item.id} item={item} />
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 dark:text-gray-100">入库记录</div>
                        {(order.inbound_orders || []).length > 0 && (
                            <Button size="small" onClick={onViewInbound}>
                                查看全部
                            </Button>
                        )}
                    </div>
                    {(order.inbound_orders || []).length === 0 ? (
                        <EmptyRecord text="暂无入库记录" />
                    ) : (
                        <div className="space-y-3">
                            {(order.inbound_orders || []).map((inbound) => (
                                <div
                                    key={inbound.id}
                                    className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                                                RK-{inbound.id}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-400">
                                                {formatDate(inbound.inbound_at)}
                                            </div>
                                        </div>
                                        <Tag color="green">
                                            {inbound.summary.record_status === 'inbound'
                                                ? '已入库'
                                                : inbound.summary.record_status === 'returned'
                                                  ? '已退货'
                                                  : '部分退货'}
                                        </Tag>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                        <ReadonlyCell
                                            label="入库数量"
                                            value={`${inbound.summary.inbound_quantity} 件`}
                                        />
                                        <ReadonlyCell
                                            label="可退数量"
                                            value={`${inbound.summary.returnable_quantity} 件`}
                                        />
                                        <ReadonlyCell
                                            label="入库成本"
                                            value={formatPrice(inbound.summary.goods_amount)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3">
                        <div className="font-bold text-gray-900 dark:text-gray-100">付款记录</div>
                        {order.summary.pending_payment > 0 &&
                            order.summary.total_received_quantity > 0 &&
                            order.status !== 'cancelled' && (
                                <Button size="small" icon={<WalletOutlined />} onClick={onPayment}>
                                    登记付款
                                </Button>
                            )}
                    </div>
                    {(order.payments || []).length === 0 ? (
                        <EmptyRecord text="暂无付款记录" />
                    ) : (
                        <div className="space-y-3">
                            {(order.payments || []).map((payment) => (
                                <PaymentRecord
                                    key={payment.id}
                                    payment={payment}
                                    onVoid={() => onVoidPayment(payment)}
                                />
                            ))}
                        </div>
                    )}

                    <div className="font-bold text-gray-900 dark:text-gray-100 pt-3">退货记录</div>
                    {(order.returns || []).length === 0 ? (
                        <EmptyRecord text="暂无退货记录" />
                    ) : (
                        <div className="space-y-3">
                            {(order.returns || []).map((item) => (
                                <ReturnRecord key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PurchaseReturnDetails({ record }: { record: PurchaseReturn }) {
    return (
        <div className="space-y-4 bg-gray-50/70 p-4 dark:bg-black/20">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <ReadonlyCell label="退货商品" value={formatPrice(record.amount)} strong />
                <ReadonlyCell label="商家运费" value={formatPrice(record.merchant_shipping_fee)} />
                <ReadonlyCell label="应收退款" value={formatPrice(record.receivable_amount)} />
                <ReadonlyCell label="已收退款" value={formatPrice(record.refunded_amount)} />
                <ReadonlyCell label="待收退款" value={formatPrice(record.pending_refund)} strong />
                <ReadonlyCell
                    label="物流"
                    value={
                        [
                            record.logistics_record?.company?.name || record.logistics_company,
                            record.logistics_record?.tracking_no || record.tracking_no,
                        ]
                            .filter(Boolean)
                            .join(' / ') || '-'
                    }
                />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">退货明细</div>
                    {(record.items || []).map((item) => (
                        <div
                            key={item.id}
                            className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">
                                        {item.product?.name || `物品 ${item.product_id}`}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400">
                                        库存件 #{item.inventory_item_id}
                                    </div>
                                </div>
                                <div className="font-mono font-black text-red-500">
                                    {formatPrice(item.purchase_price)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">收款记录</div>
                    {(record.refunds || []).length === 0 ? (
                        <EmptyRecord text="暂无收款记录" />
                    ) : (
                        (record.refunds || []).map((refund) => (
                            <div
                                key={refund.id}
                                className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-mono font-black text-gray-900 dark:text-gray-100">
                                            {formatPrice(refund.amount)}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-400">
                                            {refund.refund_account || '-'} /{' '}
                                            {formatDate(refund.refunded_at)}
                                        </div>
                                    </div>
                                    <Tag color={refund.status === 'active' ? 'green' : 'red'}>
                                        {refund.status === 'active' ? '有效' : '已作废'}
                                    </Tag>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function PurchaseItemReadonly({ item }: { item: PurchaseOrderItem }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]">
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
    );
}

function PaymentRecord({ payment, onVoid }: { payment: PurchasePayment; onVoid: () => void }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#141414]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="font-mono text-lg font-black text-gray-900 dark:text-gray-100">
                        {formatPrice(payment.amount)}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                        {payment.payment_account || '未填写账号'} / {formatDate(payment.paid_at)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Tag color={payment.status === 'active' ? 'green' : 'red'}>
                        {payment.status === 'active' ? '有效' : '已作废'}
                    </Tag>
                    {payment.status === 'active' && (
                        <Button danger size="small" icon={<CloseCircleOutlined />} onClick={onVoid}>
                            作废
                        </Button>
                    )}
                </div>
            </div>
            {payment.note && <div className="mt-2 text-xs text-gray-500">{payment.note}</div>}
            {payment.void_reason && (
                <div className="mt-2 text-xs text-red-500">作废原因：{payment.void_reason}</div>
            )}
        </div>
    );
}

function ReturnRecord({ item }: { item: PurchaseReturn }) {
    const goodsStatus = returnGoodsStatusMap[item.goods_status];
    const refundStatus = returnRefundStatusMap[item.refund_status];

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
                <div className="flex gap-2">
                    <Tag color={goodsStatus.color}>{goodsStatus.label}</Tag>
                    <Tag color={refundStatus.color}>{refundStatus.label}</Tag>
                </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">原因：{item.reason}</div>
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

function ReadonlyItems({ items }: { items: PurchaseOrderItem[] }) {
    return (
        <div className="space-y-3">
            <div className="font-bold text-gray-900 dark:text-gray-100">进货明细</div>
            {items.map((item) => (
                <PurchaseItemReadonly key={item.id} item={item} />
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
                <SummaryCell label="商家应付" value={formatPrice(summary.payableAmount)} strong />
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
