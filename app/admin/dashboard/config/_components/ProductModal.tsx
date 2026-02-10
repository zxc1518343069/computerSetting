import React, { useState, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Modal, Form, Select, Space, Badge, Input, message, InputNumber, Switch, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { categoryOptions } from '@/const';
import { Product, ProductModalRef } from '../types';
import { saveProductService } from '../services';
import { usePricing } from '../hooks/usePricing';
import { formatPrice } from '@/utils';

const { Option } = Select;
const { Text } = Typography;

interface ProductModalProps {
    onSuccess: () => void;
}

export const ProductModal = forwardRef<ProductModalRef, ProductModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();

    // 引入定价计算逻辑
    const { getSellingPriceInfo } = usePricing();

    // 监听表单值以实时计算
    const watchedCategory = Form.useWatch('category', form);
    const watchedPrice = Form.useWatch('price', form);
    const watchedIsUsePremium = Form.useWatch('is_use_premium', form);

    // 计算预览价格
    const previewPriceInfo = useMemo(() => {
        if (!watchedIsUsePremium) return null;
        const price = parseFloat(watchedPrice || '0');
        if (isNaN(price)) return null;

        // 构造临时对象用于计算
        const tempProduct = {
            id: 0,
            name: '',
            price: price,
            category: watchedCategory || 'cpu',
        } as Product;

        return getSellingPriceInfo(tempProduct);
    }, [watchedCategory, watchedPrice, watchedIsUsePremium, getSellingPriceInfo]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
        open: (product?: Product) => {
            if (product) {
                setIsEditMode(true);
                setCurrentProduct(product);
                form.setFieldsValue({
                    category: product.category,
                    name: product.name,
                    price: product.price,
                    selling_price: product.selling_price,
                    is_use_premium: product.is_use_premium ?? true,
                });
            } else {
                setIsEditMode(false);
                setCurrentProduct(null);
                form.resetFields();
                form.setFieldsValue({ category: 'cpu', is_use_premium: true }); // 默认值
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
                category: values.category,
                name: values.name,
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

    return (
        <Modal
            title={
                <Space>
                    {isEditMode ? <EditOutlined /> : <PlusOutlined />}
                    {isEditMode ? '编辑产品' : '新增产品'}
                </Space>
            }
            open={visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={loading}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                name="productForm"
                initialValues={{ category: 'cpu', is_use_premium: true }}
            >
                <Form.Item
                    name="category"
                    label="硬件类型"
                    rules={[{ required: true, message: '请选择硬件类型' }]}
                >
                    <Select placeholder="请选择">
                        {categoryOptions.map((opt) => (
                            <Option key={opt.value} value={opt.value}>
                                <Space>
                                    <Badge color={opt.color} />
                                    {opt.label}
                                </Space>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="name"
                    label="产品名称"
                    rules={[{ required: true, message: '请输入产品名称' }]}
                >
                    <Input placeholder="例如: Intel Core i9-13900K" />
                </Form.Item>

                <Space style={{ display: 'flex', width: '100%' }} align="start">
                    <Form.Item
                        name="price"
                        label="基础价格 (¥)"
                        rules={[
                            { required: true, message: '请输入价格' },
                            {
                                pattern: /^\d+(\.\d{1,2})?$/,
                                message: '请输入有效的数字，最多两位小数',
                            },
                        ]}
                        style={{ flex: 1 }}
                    >
                        <Input prefix="¥" type="number" step="0.01" min="0" placeholder="0.00" />
                    </Form.Item>

                    <div style={{ flex: 1 }}>
                        <Form.Item
                            name="selling_price"
                            label="最终售价 (¥)"
                            tooltip="手动指定最终售价，若设置则优先使用此价格"
                            style={{ marginBottom: 0 }}
                        >
                            <InputNumber
                                prefix="¥"
                                style={{ width: '100%' }}
                                min={0}
                                precision={2}
                                placeholder={watchedIsUsePremium ? '自动计算' : '请输入'}
                                disabled={watchedIsUsePremium}
                            />
                        </Form.Item>
                        {watchedIsUsePremium && previewPriceInfo && (
                            <div style={{ marginTop: 4, fontSize: 12 }}>
                                <Text type="secondary">预计售价: </Text>
                                <Text type="success" strong>
                                    {formatPrice(previewPriceInfo.price)}
                                </Text>
                                {previewPriceInfo.rate > 0 && (
                                    <Text type="secondary" style={{ marginLeft: 4 }}>
                                        (+{previewPriceInfo.rate.toFixed(1)}%)
                                    </Text>
                                )}
                            </div>
                        )}
                    </div>
                </Space>

                <Form.Item
                    name="is_use_premium"
                    label="是否使用溢价配置"
                    valuePropName="checked"
                    tooltip="开启后，售价将根据全局溢价规则自动计算，手动售价将失效"
                >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
            </Form>
        </Modal>
    );
});

ProductModal.displayName = 'ProductModal';
