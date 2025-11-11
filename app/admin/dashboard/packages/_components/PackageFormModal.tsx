'use client';
import React, { useState, useEffect } from 'react';
import EditablePackageTable, { EditablePartRow } from './EditablePackageTable';
import { PackageItem } from './PackageItemsTable';
import { PACKAGE_CATEGORIES } from '@/const';

interface PackageData {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}

interface PackageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    package?: PackageData | null;
    mode: 'create' | 'edit';
}

export default function PackageFormModal({
    isOpen,
    onClose,
    onSuccess,
    package: pkg,
    mode,
}: PackageFormModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<EditablePartRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [initializing, setInitializing] = useState(false);

    // 初始化表单数据
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && pkg) {
                // 编辑模式：回显数据
                setInitializing(true);
                setName(pkg.name);
                setDescription(pkg.description || '');

                // 初始化每个类别的选择
                const initialItems: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => {
                    const existingItem = pkg.items?.find(
                        (item) => item.product_category === cat.key
                    );
                    return {
                        id: cat.key,
                        category: cat.key,
                        product_id: existingItem?.product_id || 0,
                        quantity: existingItem?.quantity || 1,
                    };
                });
                setItems(initialItems);

                // 模拟数据加载延迟，确保产品列表已加载
                setTimeout(() => setInitializing(false), 300);
            } else {
                // 创建模式：初始化空白表单
                setName('');
                setDescription('');
                const initialItems: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
                    category: cat.key,
                    id: cat.key,
                    product_id: 0,
                    quantity: 1,
                }));
                setItems(initialItems);
                setInitializing(false);
            }
        }
    }, [isOpen, mode, pkg]);

    if (!isOpen) return null;

    const handleProductChange = (id: string, productId: number) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, product_id: productId } : item
            )
        );
    };

    const handleQuantityChange = (id: string, quantity: number) => {
        setItems(items.map((item) => (item.id === id ? { ...item, quantity } : item)));
    };

    const handleCustomNameChange = (id: string, name: string) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, custom_name: name } : item
            )
        );
    };

    const handleCustomPriceChange = (id: string, price: number) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, custom_price: price } : item
            )
        );
    };

    const handleSubmit = async () => {
        // 验证套餐名称
        if (!name.trim()) {
            alert('请输入套餐名称');
            return;
        }

        // 过滤掉未选择产品的项
        const selectedItems = items.filter((item) => item.product_id > 0);

        if (selectedItems.length === 0) {
            alert('请至少选择一个配件');
            return;
        }

        setSubmitting(true);

        try {
            // 准备提交数据
            const submitData = {
                name,
                description,
                items: selectedItems.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            };

            let response;
            if (mode === 'edit' && pkg) {
                // 编辑模式
                response = await fetch(`/api/packages/${pkg.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitData),
                });
            } else {
                // 创建模式
                response = await fetch('/api/packages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitData),
                });
            }

            const result = await response.json();

            if (result.success) {
                alert(mode === 'edit' ? '套餐修改成功！' : '套餐创建成功！');
                onSuccess();
                onClose();
            } else {
                alert(result.error || (mode === 'edit' ? '修改失败' : '创建失败'));
            }
        } catch (error) {
            console.error('提交套餐失败:', error);
            alert(mode === 'edit' ? '修改失败，请稍后重试' : '创建失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const isEditMode = mode === 'edit';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div
                    className={`px-6 py-4 text-white ${
                        isEditMode
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                            : 'bg-gradient-to-r from-green-600 to-blue-600'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">
                            {isEditMode ? '编辑套餐' : '新增套餐'}
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* 基本信息 */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    套餐名称 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={initializing || submitting}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="输入套餐名称"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    套餐描述
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={initializing || submitting}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="输入套餐描述"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 配件选择表格 */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">配件配置</h3>
                        {initializing ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-gray-600 font-medium">数据回显中...</p>
                            </div>
                        ) : (
                            <>
                                <EditablePackageTable
                                    items={items}
                                    onProductChange={handleProductChange}
                                    onQuantityChange={handleQuantityChange}
                                    onCustomNameChange={handleCustomNameChange}
                                    onCustomPriceChange={handleCustomPriceChange}
                                    disabled={submitting}
                                />
                                <div className="mt-4 text-sm text-gray-500">
                                    <p>* 在表格中直接选择产品并设置数量，价格会自动计算</p>
                                    <p>* 支持自定义输入产品名称和价格（输入后按回车确认）</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={initializing || submitting}
                            className={`px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                                isEditMode
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {submitting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            {submitting
                                ? isEditMode
                                    ? '保存中...'
                                    : '创建中...'
                                : isEditMode
                                  ? '保存修改'
                                  : '创建套餐'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
