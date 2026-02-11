import EditablePackageTable from '@/app/admin/dashboard/packages/components/EditablePackageTable';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Form, Input, Button, Typography, message, Divider } from 'antd';
import { useRequest } from 'ahooks';
import { EditablePartRow, Package, PackageModalRef } from '../types';
import { savePackageService } from '../services';
import { PACKAGE_CATEGORIES } from '@/const';
import {
    CodeSandboxOutlined,
    SaveOutlined,
    CloseOutlined,
    LayoutOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface PackageModalProps {
    onSuccess: () => void;
}

export const PackageModal = forwardRef<PackageModalRef, PackageModalProps>(({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
    const [currentPackage, setCurrentPackage] = useState<Package | undefined>(undefined);
    const [items, setItems] = useState<EditablePartRow[]>([]);
    const [form] = Form.useForm();

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
                const tableItems = PACKAGE_CATEGORIES.map((cat) => {
                    const existingItem = pkg.items.find((i) => i.product_category === cat.key);
                    return {
                        id: cat.key,
                        category: cat.key,
                        product_id: existingItem?.product_id || 0,
                        quantity: existingItem?.quantity || 1,
                        custom_name: existingItem?.custom_name,
                        custom_price: existingItem?.custom_price,
                    };
                });
                setItems(tableItems);
            } else {
                form.resetFields();
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

    const handleRowUpdate = (id: string, changes: Partial<EditablePartRow>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    };

    const { runAsync: handleSubmit, loading } = useRequest(
        async () => {
            const values = await form.validateFields();
            const selectedItems = items
                .filter((item) => item.product_id > 0 || item.custom_name)
                .map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    custom_name: item.custom_name,
                    custom_price: item.custom_price,
                }));

            if (selectedItems.length === 0) {
                message.warning('请至少选择一个配件模块');
                return;
            }

            await savePackageService(
                {
                    ...values,
                    items: selectedItems,
                },
                currentPackage?.id
            );

            message.success(mode === 'create' ? '方案初始化成功' : '方案配置已更新');
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
        create: '初始化新配置方案',
        edit: '编辑硬件配置方案',
        view: '方案技术规格详情',
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <LayoutOutlined style={{ fontSize: 24 }} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 m-0">{titleMap[mode]}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest m-0 mt-1">
                            {mode === 'create'
                                ? 'System Initialization'
                                : `Package ID: ${currentPackage?.id || 'NEW'}`}
                        </p>
                    </div>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            width={1400}
            centered
            closeIcon={
                <div className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                    <CloseOutlined />
                </div>
            }
            footer={
                <div className="flex items-center justify-end gap-4 px-8 py-6 bg-gray-50/50 rounded-b-[2.5rem] border-t border-gray-100">
                    <Button
                        onClick={handleCancel}
                        size="large"
                        className="h-12 px-8 rounded-xl border-gray-200 font-bold text-gray-500 hover:text-gray-800 hover:bg-white transition-all"
                    >
                        {isView ? '关闭窗口' : '取消编辑'}
                    </Button>
                    {!isView && (
                        <Button
                            type="primary"
                            size="large"
                            loading={loading}
                            onClick={handleSubmit}
                            icon={<SaveOutlined />}
                            className="h-12 px-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 border-none font-bold shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            {mode === 'create' ? '立即初始化方案' : '保存配置更改'}
                        </Button>
                    )}
                </div>
            }
            styles={{
                content: {
                    padding: 0,
                    borderRadius: '2.5rem',
                    overflow: 'hidden',
                    border: 'none',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                },
                header: {
                    padding: '32px 40px',
                    borderBottom: '1px solid #f1f5f9',
                    margin: 0,
                    background: 'white',
                },
                body: { padding: '40px', background: '#FBFCFD' },
            }}
        >
            <div className="space-y-10">
                {/* 方案身份表单 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50" />
                    <Form
                        form={form}
                        layout="vertical"
                        disabled={isView}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10"
                    >
                        <div className="lg:col-span-1">
                            <Form.Item
                                name="name"
                                label={
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                                        方案名称
                                    </span>
                                }
                                rules={[{ required: true, message: '请输入方案名称' }]}
                            >
                                <Input
                                    placeholder="例如：极客电竞主机 2024"
                                    className="h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold text-base"
                                />
                            </Form.Item>
                        </div>
                        <div className="lg:col-span-2">
                            <Form.Item
                                name="description"
                                label={
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                                        方案描述
                                    </span>
                                }
                            >
                                <Input
                                    placeholder="简要描述该方案的定位、适用人群或核心卖点..."
                                    className="h-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-base"
                                />
                            </Form.Item>
                        </div>
                    </Form>
                </div>

                {/* 配件清单 */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                            <h4 className="text-lg font-bold text-gray-900">硬件配置清单</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            实时价格计算已就绪
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm bg-white">
                        <EditablePackageTable
                            items={items}
                            onRowUpdate={handleRowUpdate}
                            disabled={isView}
                            pricing
                            showProfit
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
});

PackageModal.displayName = 'PackageModal';
