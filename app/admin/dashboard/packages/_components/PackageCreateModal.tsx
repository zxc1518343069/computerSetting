'use client';
import React, { useState, useEffect } from 'react';
import EditablePackageTable, { Product, EditablePartRow } from './EditablePackageTable';
import { PackageItem } from './PackageItemsTable';
import { PACKAGE_CATEGORIES } from '@/const';

interface PackageCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (newPackage: {
        name: string;
        description: string;
        total_price: number;
        items: PackageItem[];
    }) => void;
}

export default function PackageCreateModal({ isOpen, onClose, onCreate }: PackageCreateModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<EditablePartRow[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // 加载产品数据
    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (error) {
            console.error('加载产品失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始化空白表单
    useEffect(() => {
        if (isOpen) {
            setName('');
            setDescription('');
            const initialItems: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
                category: cat.key,
                product_id: 0,
                quantity: 1,
            }));
            setItems(initialItems);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleProductChange = (category: string, productId: number) => {
        setItems(
            items.map((item) =>
                item.category === category ? { ...item, product_id: productId } : item
            )
        );
    };

    const handleQuantityChange = (category: string, quantity: number) => {
        setItems(items.map((item) => (item.category === category ? { ...item, quantity } : item)));
    };

    const getTotalPrice = () => {
        return items
            .filter((item) => item.product_id > 0)
            .reduce((sum, item) => {
                const product = products.find((p) => p.id === item.product_id);
                return sum + (product?.price || 0) * item.quantity;
            }, 0);
    };

    const handleCreate = () => {
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

        // 计算总价
        let totalPrice = 0;
        const packageItems: PackageItem[] = selectedItems
            .map((item, index) => {
                const product = products.find((p) => p.id === item.product_id);
                if (product) {
                    totalPrice += product.price * item.quantity;
                    return {
                        id: index + 1,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        product_name: product.name,
                        product_price: product.price,
                        product_category: product.category,
                    };
                }
                return null as unknown as PackageItem;
            })
            .filter(Boolean);

        const newPackage = {
            name,
            description,
            total_price: totalPrice,
            items: packageItems,
        };

        onCreate(newPackage);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">新增套餐</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="输入套餐描述"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 配件选择表格 */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">配件配置</h3>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : (
                            <>
                                <EditablePackageTable
                                    items={items}
                                    products={products}
                                    onProductChange={handleProductChange}
                                    onQuantityChange={handleQuantityChange}
                                    getTotalPrice={getTotalPrice}
                                />
                                <div className="mt-4 text-sm text-gray-500">
                                    <p>* 在表格中直接选择产品并设置数量，价格会自动计算</p>
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
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            创建套餐
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
