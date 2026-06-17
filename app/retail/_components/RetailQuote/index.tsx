'use client';

import { useAuth } from '@/app/_components/AuthProvider';
import { ExportButton } from '@/app/_components/PCPartsTable/Content/components/ExportButton';
import { fetchActiveAdminUsers } from '@/app/services/adminUsers';
import { fetchCustomers } from '@/app/services/customers';
import { saveRetailOrder } from '@/app/services/orders';
import { usePackageCalculator } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageCalculator';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { fetchProductCategories } from '@/app/services/categories';
import { ProductCategory } from '@/const/types';
import { FileDoneOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { App, Button, Form, Spin } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { RetailOrderModal } from './components/RetailOrderModal';
import { RetailQuoteTable } from './components/RetailQuoteTable';
import { RetailToolbar } from './components/RetailToolbar';
import { useRetailTableControl } from './hooks/useRetailTableControl';

const getCategoryValue = (category: ProductCategory) => category.code || String(category.id);

export default function RetailQuote() {
    const { message } = App.useApp();
    const { isLoggedIn, currentUser } = useAuth();
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [orderForm] = Form.useForm();

    const {
        tableData,
        validProductItems,
        discountedPrice,
        setDiscountedPrice,
        handleAddRow,
        handleTableDataChange,
        handleRemoveRow,
        handleReset,
    } = useRetailTableControl();

    const { products, pricingConfig, loading: loadingProducts } = usePackageTableData();
    const { data: categories = [], loading: loadingCategories } = useRequest(
        () => fetchProductCategories(),
        {
            onError: (error) => message.error(error.message || '商品类目加载失败'),
        }
    );
    const { data: customers = [] } = useRequest(fetchCustomers, { ready: isLoggedIn });
    const { data: handlerUsers = [], loading: loadingHandlerUsers } = useRequest(
        fetchActiveAdminUsers,
        {
            ready: isLoggedIn,
        }
    );

    const { getItemMetrics, totalPrice } = usePackageCalculator(products, pricingConfig, tableData);

    const categoryLabelMap = useMemo(
        () =>
            new Map(
                categories.flatMap((category) => {
                    const value = getCategoryValue(category);
                    const label = category.label || category.name;
                    return [[value, label] as const, [String(category.id), label] as const];
                })
            ),
        [categories]
    );

    const defaultHandlerUserId = useMemo(
        () => handlerUsers.find((user) => user.id === currentUser?.id)?.id ?? handlerUsers[0]?.id,
        [handlerUsers, currentUser?.id]
    );

    const hasValidItems = validProductItems.length > 0;
    const loading = loadingProducts || loadingCategories;

    const exportData = useMemo(
        () => ({
            items: tableData,
            products,
            totalPrice,
            discountedPrice: discountedPrice > 0 ? discountedPrice : undefined,
            title: '产品零售报价单',
            subtitle: '硬件零售明细报价',
            itemOrder: 'input' as const,
            totalLabel: '零售总价',
            getCategoryLabel: (category: string) => categoryLabelMap.get(category) || category,
            getItemMetrics,
        }),
        [tableData, products, totalPrice, discountedPrice, categoryLabelMap, getItemMetrics]
    );

    const openOrderModal = () => {
        if (!isLoggedIn) {
            message.warning('请先登录后台后再保存订单');
            return;
        }
        if (!hasValidItems) {
            message.warning('请先添加并选择零售商品');
            return;
        }

        const finalAmount = discountedPrice > 0 ? discountedPrice : totalPrice;
        orderForm.resetFields();
        orderForm.setFieldsValue({
            customer_source: 'new',
            save_customer: true,
            final_amount: finalAmount,
            handler_user_id: defaultHandlerUserId,
        });
        setOrderModalVisible(true);
    };

    const { runAsync: handleSaveOrder, loading: savingOrder } = useRequest(
        async () => {
            const values = await orderForm.validateFields();
            const orderItems = validProductItems.map((item) => {
                const product = products.find((p) => p.id === item.product_id);
                const metrics = getItemMetrics(item);

                return {
                    product_id: item.product_id,
                    product_name: product?.name || '未知产品',
                    product_category: product?.category || item.category,
                    quantity: item.quantity,
                    sale_price: metrics.unitSellPrice,
                };
            });

            await saveRetailOrder({
                handler_user_id: values.handler_user_id,
                customer_id:
                    values.customer_source === 'existing' ? values.customer_id || null : null,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                save_customer:
                    values.customer_source === 'new' ? Boolean(values.save_customer) : false,
                original_amount: totalPrice,
                final_amount: values.final_amount || totalPrice,
                note: values.note,
                items: orderItems,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('零售订单已保存，待后台结算');
                setOrderModalVisible(false);
                orderForm.resetFields();
            },
            onError: (error) => message.error(error.message || '订单保存失败'),
        }
    );

    useEffect(() => {
        if (!orderModalVisible || orderForm.getFieldValue('handler_user_id')) return;
        if (defaultHandlerUserId) {
            orderForm.setFieldValue('handler_user_id', defaultHandlerUserId);
        }
    }, [defaultHandlerUserId, orderForm, orderModalVisible]);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200 dark:bg-blue-600 dark:shadow-none">
                        <ShoppingCartOutlined className="text-xl" />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                Retail
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                                Quote
                            </span>
                        </div>
                        <h1 className="m-0 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            产品零售
                        </h1>
                        <p className="m-0 text-xs font-medium text-slate-400 dark:text-gray-500">
                            按硬件类别添加零售商品，实时生成报价与订单
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <ExportButton
                        data={exportData}
                        disabled={!hasValidItems || loading}
                        filenamePrefix="产品零售报价单"
                    />
                    <Button
                        size="large"
                        icon={<FileDoneOutlined />}
                        disabled={!hasValidItems || loading || !isLoggedIn}
                        onClick={openOrderModal}
                        className="h-12 min-w-[130px] rounded-2xl border-blue-100 bg-blue-50 px-6 text-sm font-bold text-blue-600 shadow-sm transition-all hover:border-blue-400 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                        保存订单
                    </Button>
                </div>
            </div>

            <RetailToolbar
                loading={loadingCategories}
                disabled={loading}
                onAddRow={handleAddRow}
                onReset={handleReset}
            />

            {loading ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-slate-100 bg-white/70 shadow-sm dark:border-white/10 dark:bg-[#1f1f1f]/70">
                    <div className="flex flex-col items-center gap-4">
                        <Spin />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            正在同步零售数据...
                        </span>
                    </div>
                </div>
            ) : (
                <RetailQuoteTable
                    items={tableData}
                    products={products}
                    categories={categories}
                    totalPrice={totalPrice}
                    discountedPrice={discountedPrice}
                    disabled={loading}
                    getItemMetrics={getItemMetrics}
                    onRowUpdate={handleTableDataChange}
                    onRemoveRow={handleRemoveRow}
                    onDiscountedPriceChange={setDiscountedPrice}
                />
            )}

            <RetailOrderModal
                open={orderModalVisible}
                form={orderForm}
                saving={savingOrder}
                customers={customers}
                handlerUsers={handlerUsers}
                loadingHandlerUsers={loadingHandlerUsers}
                onCancel={() => setOrderModalVisible(false)}
                onOk={handleSaveOrder}
            />
        </div>
    );
}
