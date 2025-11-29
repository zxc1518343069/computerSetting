import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Modal, Form, Select, Space, Badge, Input, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { categoryOptions } from '@/const';
import { Product, ProductModalRef } from '../types';
import { saveProductService } from '../services';

const { Option } = Select;

interface ProductModalProps {
    onSuccess: () => void;
}

export const ProductModal = forwardRef<ProductModalRef, ProductModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [form] = Form.useForm();

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
                });
            } else {
                setIsEditMode(false);
                setCurrentProduct(null);
                form.resetFields();
                form.setFieldsValue({ category: 'cpu' }); // 默认值
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
                initialValues={{ category: 'cpu' }}
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
                >
                    <Input prefix="¥" type="number" step="0.01" min="0" placeholder="0.00" />
                </Form.Item>
            </Form>
        </Modal>
    );
});

ProductModal.displayName = 'ProductModal';
