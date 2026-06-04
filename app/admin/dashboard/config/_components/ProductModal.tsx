import { getCategoryTagClass, useProductCategories } from '@/app/hooks/useProductCategories';
import { formatPrice } from '@/utils';
import {
    CalculatorOutlined,
    CheckCircleFilled,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Divider, Form, Input, InputNumber, message, Modal, Select, Switch } from 'antd';
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { usePricing } from '../hooks/usePricing';
import { saveProductService } from '../services';
import { Product, ProductModalRef } from '../types';
import { useTheme } from '@/app/_components/ThemeProvider';

const { Option } = Select;

interface ProductModalProps {
    onSuccess: () => void;
}

export const ProductModal = forwardRef<ProductModalRef, ProductModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { activeCategories, categoryMap, categoryCodeMap } = useProductCategories({
        includeInactive: true,
    });

    // 引入定价计算逻辑
    const { getSellingPriceInfo } = usePricing();

    // 监听表单值以实时计算
    const watchedCategoryId = Form.useWatch('category_id', form);
    const watchedPrice = Form.useWatch('price', form);
    const watchedIsUsePremium = Form.useWatch('is_use_premium', form);
    const watchedSellingPrice = Form.useWatch('selling_price', form);

    // 计算预览价格
    const previewPriceInfo = useMemo(() => {
        const price = parseFloat(watchedPrice || '0');
        if (isNaN(price)) return { price: 0, rate: 0 };

        // 构造临时对象用于计算
        const tempProduct = {
            id: 0,
            name: '',
            price: price,
            category_id: watchedCategoryId,
            category: '',
        } as Product;

        return getSellingPriceInfo(tempProduct);
    }, [watchedCategoryId, watchedPrice, getSellingPriceInfo]);

    const getDefaultCategoryId = () => activeCategories[0]?.id;

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
        open: (product?: Product) => {
            if (product) {
                setIsEditMode(true);
                setCurrentProduct(product);
                form.setFieldsValue({
                    category_id:
                        product.category_id ||
                        (product.category ? categoryCodeMap[product.category]?.id : undefined),
                    name: product.name,
                    barcode: product.barcode,
                    price: product.price,
                    selling_price: product.selling_price,
                    is_use_premium: product.is_use_premium ?? true,
                });
            } else {
                setIsEditMode(false);
                setCurrentProduct(null);
                form.resetFields();
                form.setFieldsValue({ category_id: getDefaultCategoryId(), is_use_premium: true });
            }
            setVisible(true);
        },
        close: () => {
            setVisible(false);
            form.resetFields();
        },
    }));

    const handleCancel = () => {
        setVisible(false);
        form.resetFields();
    };

    // 提交逻辑
    const { runAsync: handleSubmit, loading } = useRequest(
        async () => {
            const values = await form.validateFields();
            // 构造部分对象用于保存，ID 在 Service 内部根据 isEditMode 处理或由 currentProduct 提供
            const productData: Partial<Product> = {
                id: currentProduct?.id, // 编辑时需要 ID
                category_id: values.category_id,
                category: categoryMap[values.category_id]?.code || currentProduct?.category || '',
                name: values.name,
                barcode: values.barcode?.trim() || null,
                price: parseFloat(values.price),
                // 如果使用溢价配置，强制将 selling_price 设为 null
                selling_price: values.is_use_premium ? null : values.selling_price,
                is_use_premium: values.is_use_premium,
            };

            await saveProductService(productData, isEditMode);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(isEditMode ? '产品更新成功' : '产品添加成功');
                handleCancel();
                onSuccess(); // 通知父组件刷新
            },
            onError: (error) => {
                message.error(error.message || '操作失败，请检查输入');
            },
        }
    );

    // 获取当前分类的配置
    const currentCategory = watchedCategoryId ? categoryMap[watchedCategoryId] : undefined;

    return (
        <Modal
            title={null}
            open={visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={loading}
            destroyOnHidden
            width={800}
            footer={null}
            className="custom-modal"
            styles={{
                content: {
                    padding: 0,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: isDark ? '#1f1f1f' : 'white',
                },
            }}
        >
            <div className="flex flex-col md:flex-row h-full">
                {/* 左侧表单区域 */}
                <div className="flex-1 p-8 bg-white dark:bg-[#1f1f1f]">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                {isEditMode ? <EditOutlined /> : <PlusOutlined />}
                            </div>
                            {isEditMode ? '编辑产品' : '新增产品'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
                            填写产品基础信息与报价参考
                        </p>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        name="productForm"
                        initialValues={{ category_id: getDefaultCategoryId(), is_use_premium: true }}
                        size="large"
                    >
                        <Form.Item
                            name="category_id"
                            label="商品类目"
                            rules={[{ required: true, message: '请选择商品类目' }]}
                        >
                            <Select placeholder="请选择" className="w-full">
                                {activeCategories.map((category) => (
                                    <Option key={category.id} value={category.id}>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex h-5 px-2 items-center rounded border text-xs ${getCategoryTagClass(
                                                    category.tag_color
                                                )}`}
                                            >
                                                {category.label || category.name}
                                            </span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label={<span className="dark:text-gray-300">产品名称</span>}
                            rules={[{ required: true, message: '请输入产品名称' }]}
                        >
                            <Input
                                placeholder="例如: Intel Core i9-13900K"
                                className="dark:bg-[#2a2a2a] dark:border-gray-700 dark:text-gray-200"
                            />
                        </Form.Item>

                        <Form.Item
                            name="barcode"
                            label={<span className="dark:text-gray-300">条形码</span>}
                            tooltip="可选，盒装商品可填写；散片商品可留空"
                        >
                            <Input
                                placeholder="扫码或输入商品条形码"
                                className="dark:bg-[#2a2a2a] dark:border-gray-700 dark:text-gray-200"
                            />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="price"
                                label={<span className="dark:text-gray-300">参考价格 (¥)</span>}
                                rules={[{ required: true, message: '请输入价格' }]}
                            >
                                <InputNumber
                                    prefix={<span className="dark:text-gray-500">¥</span>}
                                    style={{ width: '100%' }}
                                    min={0}
                                    precision={2}
                                    placeholder="0.00"
                                    className="dark:bg-[#2a2a2a] dark:border-gray-700 dark:text-gray-200"
                                />
                            </Form.Item>

                            <Form.Item
                                name="selling_price"
                                label={<span className="dark:text-gray-300">手动定价 (¥)</span>}
                                tooltip="若填写，将覆盖自动计算的价格"
                            >
                                <InputNumber
                                    prefix={<span className="dark:text-gray-500">¥</span>}
                                    style={{ width: '100%' }}
                                    min={0}
                                    precision={2}
                                    placeholder="可选"
                                    disabled={watchedIsUsePremium}
                                    className="dark:bg-[#2a2a2a] dark:border-gray-700 dark:text-gray-200"
                                />
                            </Form.Item>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#2a2a2a] p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-0 flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                    自动溢价计算
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    根据全局配置自动计算最终售价
                                </div>
                            </div>
                            <Form.Item name="is_use_premium" valuePropName="checked" noStyle>
                                <Switch />
                            </Form.Item>
                        </div>
                    </Form>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button
                            size="large"
                            onClick={handleCancel}
                            className="dark:bg-[#2a2a2a] dark:text-gray-300 dark:border-gray-700 dark:hover:text-white"
                        >
                            取消
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleSubmit}
                            loading={loading}
                            className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 border-none"
                        >
                            保存提交
                        </Button>
                    </div>
                </div>

                {/* 右侧预览区域 */}
                <div className="w-full md:w-[320px] bg-gray-50/80 dark:bg-[#1f1f1f]/80 border-l border-gray-100 dark:border-gray-800 p-8 flex flex-col justify-center relative overflow-hidden">
                    {/* 背景装饰 */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10">
                        <div className="text-center mb-6">
                            <div
                                className={`min-w-16 h-16 px-3 mx-auto rounded-2xl shadow-sm border flex items-center justify-center text-sm font-black mb-3 ${getCategoryTagClass(
                                    currentCategory?.tag_color
                                )}`}
                            >
                                {currentCategory?.name || '类目'}
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                                价格预览
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                实时计算最终售价
                            </p>
                        </div>

                        <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 dark:text-gray-400">参考价格</span>
                                <span className="font-mono font-medium dark:text-gray-200">
                                    {formatPrice(Number(watchedPrice) || 0)}
                                </span>
                            </div>

                            {watchedIsUsePremium ? (
                                <>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            溢价率
                                        </span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full text-xs">
                                            +{previewPriceInfo.rate.toFixed(1)}%
                                        </span>
                                    </div>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                                            最终售价
                                        </span>
                                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            {formatPrice(previewPriceInfo.price)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2 bg-gray-50 dark:bg-[#1f1f1f] py-2 rounded-lg">
                                        <CheckCircleFilled className="text-emerald-500 dark:text-emerald-400 mr-1" />
                                        已应用自动溢价策略
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            定价模式
                                        </span>
                                        <span className="text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full text-xs">
                                            手动定价
                                        </span>
                                    </div>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                                            最终售价
                                        </span>
                                        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                                            {formatPrice(
                                                Number(watchedSellingPrice) ||
                                                    Number(watchedPrice) ||
                                                    0
                                            )}
                                        </span>
                                    </div>
                                    <div className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2 bg-gray-50 dark:bg-[#1f1f1f] py-2 rounded-lg">
                                        <CalculatorOutlined className="text-orange-500 dark:text-orange-400 mr-1" />
                                        使用手动指定价格
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
});

ProductModal.displayName = 'ProductModal';
