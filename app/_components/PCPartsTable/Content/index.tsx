'use client';
import { Package, PackageItem } from '@/app/_components/PCPartsTable/PackageRecomment';
import EditablePackageTable from '@/app/admin/dashboard/packages/components/EditablePackageTable';
import { usePackageCalculator } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageCalculator';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { PACKAGE_CATEGORIES } from '@/const';
import { message } from '@/lib/AntdGlobal';
import {
    BuildOutlined,
    ExperimentOutlined,
    SaveOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal } from 'antd';
import React, { useImperativeHandle, useMemo, useState } from 'react';
import { ExportButton } from './components/ExportButton';
import { InfoSection } from './components/InfoSection';
import { TestConfigModal } from './components/TestConfigModal';
import { useTableControl } from './hooks/useTableControl';
import { saveOrder } from '@/app/admin/dashboard/services';
import { useRequest } from 'ahooks';
import { useAuth } from '@/app/_components/AuthProvider';

export interface CustomRef {
    processPkgToTableData: (pkg: Package) => void;
}

export interface ContentProps {
    customRef: React.MutableRefObject<CustomRef | null>;
    tempPackages?: Package[];
    onSaveTempPackage?: (pkg: Package) => void;
}

export function Content(props: ContentProps) {
    const { customRef, tempPackages = [], onSaveTempPackage } = props;
    const {
        handleReset,
        handleTableDataChange,
        tableData,
        handleAddRow,
        handleRemoveRow,
        setTableData,
        discountedPrice,
        setDiscountedPrice,
    } = useTableControl();

    const [testModalVisible, setTestModalVisible] = useState(false);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [orderForm] = Form.useForm();
    const { isLoggedIn } = useAuth();

    // 获取产品和定价数据
    const { products, pricingConfig, loading } = usePackageTableData();
    const { getItemMetrics, totalPrice } = usePackageCalculator(products, pricingConfig, tableData);

    useImperativeHandle(
        customRef,
        () => ({
            processPkgToTableData: (pkg: Package) => {
                const itemsByCategory: Record<string, PackageItem[]> = {};
                pkg.items.forEach((item) => {
                    if (!itemsByCategory[item.product_category]) {
                        itemsByCategory[item.product_category] = [];
                    }
                    itemsByCategory[item.product_category].push(item);
                });
                const newItems = PACKAGE_CATEGORIES.flatMap((cat) => {
                    const categoryItems = itemsByCategory[cat.key] || [];
                    if (categoryItems.length > 0) {
                        return categoryItems.map((packageItem, index) => ({
                            id: `${cat.key}-${index + 1}`,
                            category: cat.key,
                            product_id: packageItem.product_id,
                            quantity: packageItem.quantity,
                        }));
                    }
                    return [
                        {
                            id: `${cat.key}-1`,
                            category: cat.key,
                            product_id: 0,
                            quantity: 1,
                        },
                    ];
                });
                setTableData(newItems);
            },
        }),
        [setTableData]
    );

    // 导出数据
    const exportData = useMemo(
        () => ({
            items: tableData,
            products,
            totalPrice,
            discountedPrice: discountedPrice > 0 ? discountedPrice : undefined,
            getItemMetrics,
        }),
        [tableData, products, totalPrice, discountedPrice, getItemMetrics]
    );

    // 是否有有效配置
    const hasValidItems = useMemo(() => {
        return tableData.some((item) => item.product_id && item.product_id > 0);
    }, [tableData]);

    const handleSaveTemp = () => {
        if (!hasValidItems) {
            message.warning('当前配置为空，无法保存');
            return;
        }

        const validItems = tableData.filter((item) => item.product_id && item.product_id > 0);
        const packageItems: PackageItem[] = validItems.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            return {
                id: Math.random(), // 临时 ID
                product_id: item.product_id,
                quantity: item.quantity,
                product_name: product?.name || '未知产品',
                product_price: product?.price || 0,
                product_category: item.category,
            };
        });

        const newPkg: Package = {
            id: Date.now(),
            name: `临时方案 ${tempPackages.length + 1}`,
            description: `保存于 ${new Date().toLocaleTimeString()}`,
            total_price: totalPrice,
            items: packageItems,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        onSaveTempPackage?.(newPkg);
    };

    const { runAsync: handleSaveOrder, loading: savingOrder } = useRequest(
        async () => {
            const values = await orderForm.validateFields();
            const validItems = tableData.filter((item) => item.product_id && item.product_id > 0);

            const orderItems = validItems.map((item) => {
                const product = products.find((p) => p.id === item.product_id);
                const metrics = getItemMetrics(item);
                return {
                    product_id: item.product_id,
                    product_name: product?.name || '未知产品',
                    product_category: item.category,
                    quantity: item.quantity,
                    sale_price: metrics.unitSellPrice,
                };
            });

            await saveOrder({
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                original_amount: totalPrice,
                final_amount: values.final_amount || totalPrice,
                source: 'frontend_quote',
                note: values.note,
                items: orderItems,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('订单已保存，待后台结算');
                setOrderModalVisible(false);
                orderForm.resetFields();
            },
            onError: (e) => message.error(e.message || '订单保存失败'),
        }
    );

    const openOrderModal = () => {
        if (!isLoggedIn) {
            message.warning('请先登录后台后再保存订单');
            return;
        }
        if (!hasValidItems) {
            message.warning('当前配置为空，无法保存订单');
            return;
        }
        const finalAmount = discountedPrice > 0 ? discountedPrice : totalPrice;
        orderForm.setFieldsValue({ final_amount: finalAmount });
        setOrderModalVisible(true);
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header Area: 科技感标题与操作 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                            Configuration
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            v2.0.4
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <BuildOutlined className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 m-0 tracking-tight">
                                配置工坊
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 m-0 font-medium">
                                自定义您的专属电脑配置清单 · 实时价格计算
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        icon={<SaveOutlined />}
                        size="large"
                        onClick={handleSaveTemp}
                        className="h-12 min-w-[130px] px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 font-bold text-sm shadow-sm dark:shadow-none dark:text-gray-200"
                    >
                        临时保存
                    </Button>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <ExportButton data={exportData} disabled={!hasValidItems || loading} />
                    <Button
                        icon={<ShoppingCartOutlined />}
                        size="large"
                        onClick={openOrderModal}
                        disabled={!hasValidItems || loading || !isLoggedIn}
                        className="h-12 min-w-[130px] px-6 rounded-2xl border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:border-blue-400 transition-all duration-300 font-bold text-sm shadow-sm dark:shadow-none"
                    >
                        保存订单
                    </Button>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <Button
                        type="primary"
                        size="large"
                        icon={<ExperimentOutlined />}
                        onClick={() => setTestModalVisible(true)}
                        className="h-12 min-w-[130px] px-6 bg-gray-900 dark:bg-blue-600 hover:bg-blue-600 border-none shadow-xl shadow-gray-200 dark:shadow-none hover:shadow-blue-200 rounded-2xl transition-all duration-300 font-bold text-sm group relative overflow-hidden"
                    >
                        <span className="relative z-10">测试配置</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
                    </Button>
                </div>
            </div>

            {/* Main Table Area */}
            {/*
                    Wrapping EditablePackageTable to ensure it fits nicely.
                    Since EditablePackageTable is now a clean card-like component, 
                    we can just render it or wrap it for padding if needed.
                    The EditablePackageTable itself has rounded corners and shadow, 
                    so we might want to strip that if we are already in a card,
                    OR just let it be.
                    Let's just render it directly but maybe customize via props if it supported className.
                    Currently it doesn't support className prop in the interface I updated.
                    So we rely on its internal style. It has `rounded-2xl bg-white shadow-sm ring-1`.
                    This matches our theme nicely.
                */}
            <EditablePackageTable
                items={tableData}
                onRowUpdate={handleTableDataChange}
                onAddRow={handleAddRow}
                onRemoveRow={handleRemoveRow}
                pricing={true}
                showProfit={false}
                showDiscountedPrice={true}
                discountedPrice={discountedPrice}
                onDiscountedPriceChange={setDiscountedPrice}
            />

            <InfoSection onReset={handleReset} />

            <TestConfigModal
                visible={testModalVisible}
                onClose={() => setTestModalVisible(false)}
                items={tableData}
                tempPackages={tempPackages}
            />

            <Modal
                title="保存为订单"
                open={orderModalVisible}
                onCancel={() => setOrderModalVisible(false)}
                onOk={handleSaveOrder}
                confirmLoading={savingOrder}
                destroyOnHidden
            >
                <Form form={orderForm} layout="vertical" className="pt-4">
                    <Form.Item
                        name="customer_name"
                        label="客户名称"
                        rules={[{ required: true, message: '请输入客户名称' }]}
                    >
                        <Input placeholder="请输入客户名称" />
                    </Form.Item>
                    <Form.Item name="customer_phone" label="手机号">
                        <Input placeholder="可选，但建议填写" />
                    </Form.Item>
                    <Form.Item
                        name="final_amount"
                        label="最终成交金额"
                        rules={[{ required: true, message: '请输入最终成交金额' }]}
                    >
                        <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} placeholder="订单备注" />
                    </Form.Item>
                    <div className="text-xs text-gray-400">
                        保存后不会扣减库存，需在后台订单列表中结算并绑定具体库存物品。
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
