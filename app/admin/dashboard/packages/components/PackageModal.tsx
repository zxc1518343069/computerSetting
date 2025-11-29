import EditablePackageTable from '@/app/admin/dashboard/packages/components/EditablePackageTable';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Form, Input, Button, Space, Typography, message } from 'antd';
import { useRequest } from 'ahooks';
import { EditablePartRow, Package, PackageModalRef } from '../types';
import { savePackageService } from '../services';
import { PACKAGE_CATEGORIES } from '@/const';

const { Title } = Typography;

interface PackageModalProps {
    onSuccess: () => void;
}

export const PackageModal = forwardRef<PackageModalRef, PackageModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
    const [currentPackage, setCurrentPackage] = useState<Package | undefined>(undefined);
    const [items, setItems] = useState<EditablePartRow[]>([]); // EditablePackageTable 需要的 items 格式
    const [form] = Form.useForm();

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
        open: (mode, pkg) => {
            setMode(mode);
            setCurrentPackage(pkg);
            setVisible(true);

            if (pkg) {
                form.setFieldsValue({
                    name: pkg.name,
                    description: pkg.description,
                });
                // 转换 items 格式以适配 EditablePackageTable
                const tableItems = PACKAGE_CATEGORIES.map((cat) => {
                    const existingItem = pkg.items.find((i) => i.product_category === cat.key);
                    return {
                        id: cat.key,
                        category: cat.key,
                        product_id: existingItem?.product_id || 0,
                        quantity: existingItem?.quantity || 1,
                        // ...其他可能需要的字段
                    };
                });
                setItems(tableItems);
            } else {
                form.resetFields();
                // 初始化空 items
                const initialItems = PACKAGE_CATEGORIES.map((cat) => ({
                    id: cat.key,
                    category: cat.key,
                    product_id: 0,
                    quantity: 1,
                }));
                setItems(initialItems);
            }
        },
        close: () => handleCancel(),
    }));

    const handleCancel = () => {
        setVisible(false);
        form.resetFields();
        setItems([]);
    };

    // 处理表格数据变更
    const handleRowUpdate = (id: string, changes: Partial<EditablePartRow>) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
        );
    };

    const { runAsync: handleSubmit, loading } = useRequest(
        async () => {
            const values = await form.validateFields();
            const selectedItems = items
                .filter((item) => item.product_id > 0)
                .map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                }));

            if (selectedItems.length === 0) {
                message.warning('请至少选择一个配件');
                return;
            }

            await savePackageService(
                {
                    ...values,
                    items: selectedItems,
                },
                currentPackage?.id
            );

            message.success(mode === 'create' ? '创建成功' : '更新成功');
            handleCancel();
            onSuccess();
        },
        {
            manual: true,
            onError: (e) => message.error(e.message),
        }
    );

    const isView = mode === 'view';
    const titleMap = {
        create: '创建新套餐',
        edit: '编辑套餐',
        view: '套餐详情',
    };

    return (
        <Modal
            title={
                <Title level={4} style={{ margin: 0 }}>
                    {titleMap[mode]}
                </Title>
            }
            open={visible}
            onCancel={handleCancel}
            width={1000}
            footer={
                isView
                    ? [
                          <Button key="close" onClick={handleCancel}>
                              关闭
                          </Button>,
                      ]
                    : [
                          <Button key="cancel" onClick={handleCancel}>
                              取消
                          </Button>,
                          <Button
                              key="submit"
                              type="primary"
                              loading={loading}
                              onClick={handleSubmit}
                          >
                              {mode === 'create' ? '创建' : '保存'}
                          </Button>,
                      ]
            }
            style={{ top: 20 }}
        >
            <div className="py-4">
                <Form form={form} layout="vertical" disabled={isView}>
                    <Space size="large" style={{ display: 'flex', marginBottom: 16 }}>
                        <Form.Item
                            name="name"
                            label="套餐名称"
                            rules={[{ required: true, message: '请输入套餐名称' }]}
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="给套餐起个名字" />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="描述"
                            style={{ flex: 2, marginBottom: 0 }}
                        >
                            <Input placeholder="简要描述套餐特点" />
                        </Form.Item>
                    </Space>
                </Form>

                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
                    <EditablePackageTable
                        items={items}
                        onRowUpdate={handleRowUpdate}
                        disabled={isView}
                        pricing // 开启价格显示
                    />
                </div>
            </div>
        </Modal>
    );
});

PackageModal.displayName = 'PackageModal';
