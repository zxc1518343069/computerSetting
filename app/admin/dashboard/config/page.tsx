'use client';
import React, { useState, useEffect } from 'react';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    created_at?: string;
}

interface PricingConfig {
    unifiedPricing: boolean;
    unifiedRate: number;
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
}

const categoryOptions = [
    { value: '', label: '全部' },
    { value: 'cpu', label: 'CPU(处理器)' },
    { value: 'motherboard', label: 'Motherboard(主板)' },
    { value: 'ram', label: 'RAM(内存)' },
    { value: 'gpu', label: 'GPU(显卡)' },
    { value: 'storage', label: 'Storage(存储)' },
    { value: 'psu', label: 'PSU(电源)' },
    { value: 'case', label: 'Case(机箱)' },
    { value: 'cooling', label: 'Cooling(散热)' },
    { value: 'monitor', label: 'Monitor(显示器)' },
];

const categoryDisplayMap: Record<string, string> = {
    cpu: 'CPU(处理器)',
    motherboard: 'Motherboard(主板)',
    ram: 'RAM(内存)',
    gpu: 'GPU(显卡)',
    storage: 'Storage(存储)',
    psu: 'PSU(电源)',
    case: 'Case(机箱)',
    cooling: 'Cooling(散热)',
    monitor: 'Monitor(显示器)',
};

// 分页配置
const PAGE_SIZE = 10;

export default function ConfigPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchCategory, setSearchCategory] = useState('');
    const [searchName, setSearchName] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'warning';
    }>({ show: false, message: '', type: 'success' });

    // 显示提示信息
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 5000);
    };

    // 产品表单
    const [productForm, setProductForm] = useState({
        category: 'cpu',
        name: '',
        price: '',
    });

    // 获取溢价配置
    const fetchPricingConfig = async () => {
        try {
            const response = await fetch('/api/pricing');
            const data = await response.json();
            setPricingConfig(data);
        } catch (error) {
            console.error('获取溢价配置失败:', error);
        }
    };

    // 获取产品列表
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchCategory) params.append('category', searchCategory);
            if (searchName) params.append('search', searchName);

            const response = await fetch(`/api/products?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setAllProducts(result.data || []);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error('获取产品列表失败:', error);
            alert('获取产品列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        fetchProducts();
        fetchPricingConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 分页数据计算
    useEffect(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        setProducts(allProducts.slice(startIndex, endIndex));
    }, [allProducts, currentPage]);

    const totalPages = Math.ceil(allProducts.length / PAGE_SIZE);

    // 计算售价（含溢价）
    const calculateSellingPrice = (product: Product): number => {
        if (!pricingConfig) return product.price;

        let rate = 0;
        if (pricingConfig.unifiedPricing) {
            rate = pricingConfig.unifiedRate;
        } else {
            const categoryRateMap: Record<string, number> = {
                cpu: pricingConfig.cpu,
                motherboard: pricingConfig.motherboard,
                ram: pricingConfig.ram,
                gpu: pricingConfig.gpu,
                storage: pricingConfig.storage,
                psu: pricingConfig.psu,
                case: pricingConfig.case,
                cooling: pricingConfig.cooling,
            };
            rate = categoryRateMap[product.category] || 0;
        }

        return product.price * (1 + rate / 100);
    };

    // 查询处理
    const handleSearch = () => {
        fetchProducts();
    };

    // 重置查询
    const handleReset = () => {
        setSearchCategory('');
        setSearchName('');
    };

    // 打开新增模态框
    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setProductForm({ category: 'cpu', name: '', price: '' });
        setShowFormModal(true);
    };

    // 打开编辑模态框
    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setProductForm({
            category: product.category,
            name: product.name,
            price: product.price.toString(),
        });
        setShowFormModal(true);
    };

    // 提交产品（新增或编辑）
    const handleSubmitProduct = async () => {
        if (!productForm.name || !productForm.price) {
            alert('请填写完整的产品信息');
            return;
        }

        setActionLoading(true);
        try {
            const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: productForm.category,
                    name: productForm.name,
                    price: parseFloat(productForm.price),
                }),
            });

            const result = await response.json();

            if (result.success) {
                showToast(editingProduct ? '产品更新成功' : '产品添加成功', 'success');
                setShowFormModal(false);
                setProductForm({ category: 'cpu', name: '', price: '' });
                setEditingProduct(null);
                fetchProducts();
            } else {
                showToast(result.error || '操作失败', 'error');
            }
        } catch (error) {
            console.error('操作失败:', error);
            showToast('操作失败，请稍后重试', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // 打开删除确认模态框
    const handleOpenDeleteModal = (product: Product) => {
        setDeletingProduct(product);
        setShowDeleteModal(true);
    };

    // 确认删除产品
    const handleConfirmDelete = async () => {
        if (!deletingProduct) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/api/products/${deletingProduct.id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (result.success) {
                showToast('产品删除成功', 'success');
                setShowDeleteModal(false);
                setDeletingProduct(null);
                fetchProducts();
            } else {
                // 如果是因为被套餐使用而无法删除，显示警告类型
                const toastType = result.inUse ? 'warning' : 'error';
                showToast(result.error || '删除失败', toastType);
                // 如果是被使用的错误，关闭删除确认框但保持错误提示
                if (result.inUse) {
                    setShowDeleteModal(false);
                    setDeletingProduct(null);
                }
            }
        } catch (error) {
            console.error('删除失败:', error);
            showToast('删除失败，请稍后重试', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">产品配置管理</h1>
                    <p className="text-sm text-gray-500 mt-1">管理所有硬件产品的基础信息和价格</p>
                </div>
            </div>

            {/* 搜索表单 */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                            <svg
                                className="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                            </svg>
                            硬件类型
                        </label>
                        <select
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                            value={searchCategory}
                            onChange={(e) => setSearchCategory(e.target.value)}
                        >
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                            <svg
                                className="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            产品名称
                        </label>
                        <input
                            type="text"
                            className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2.5 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="输入产品名称搜索..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md hover:shadow-lg transition-all"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            查询
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md hover:shadow-lg transition-all"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            重置
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md hover:shadow-lg transition-all w-full"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                            新增产品
                        </button>
                    </div>
                </div>
            </div>

            {/* 产品列表 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p className="mt-3 text-gray-500">加载中...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            硬件类型
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            产品名称
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            原价
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            售价
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            创建时间
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg
                                                        className="w-16 h-16 text-gray-300 mb-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={1.5}
                                                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                                        />
                                                    </svg>
                                                    <p className="text-gray-500 text-base">
                                                        暂无产品数据
                                                    </p>
                                                    <p className="text-gray-400 text-sm mt-1">
                                                        点击上方新增按钮添加产品
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product, index) => (
                                            <tr
                                                key={product.id}
                                                className={`
                                                    transition-colors duration-150 ease-in-out hover:bg-blue-50
                                                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                                `}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    #{product.id}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {categoryDisplayMap[product.category] ||
                                                            product.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                    {product.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        ${product.price.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-semibold text-green-600">
                                                            $
                                                            {calculateSellingPrice(product).toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                        {pricingConfig && (
                                                            <span className="text-xs text-gray-400 mt-0.5">
                                                                +
                                                                {(() => {
                                                                    if (
                                                                        pricingConfig.unifiedPricing
                                                                    ) {
                                                                        return pricingConfig.unifiedRate.toFixed(
                                                                            1
                                                                        );
                                                                    }
                                                                    const categoryRateMap: Record<
                                                                        string,
                                                                        number
                                                                    > = {
                                                                        cpu: pricingConfig.cpu,
                                                                        motherboard:
                                                                            pricingConfig.motherboard,
                                                                        ram: pricingConfig.ram,
                                                                        gpu: pricingConfig.gpu,
                                                                        storage:
                                                                            pricingConfig.storage,
                                                                        psu: pricingConfig.psu,
                                                                        case: pricingConfig.case,
                                                                        cooling:
                                                                            pricingConfig.cooling,
                                                                    };
                                                                    return (
                                                                        categoryRateMap[
                                                                            product.category
                                                                        ] || 0
                                                                    ).toFixed(1);
                                                                })()}
                                                                %
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {product.created_at
                                                        ? new Date(
                                                              product.created_at
                                                          ).toLocaleString('zh-CN', {
                                                              year: 'numeric',
                                                              month: '2-digit',
                                                              day: '2-digit',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                handleOpenEditModal(product)
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors shadow-sm hover:shadow-md"
                                                            title="编辑"
                                                        >
                                                            <svg
                                                                className="w-3.5 h-3.5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                />
                                                            </svg>
                                                            编辑
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleOpenDeleteModal(product)
                                                            }
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-md transition-colors shadow-sm hover:shadow-md"
                                                            title="删除"
                                                        >
                                                            <svg
                                                                className="w-3.5 h-3.5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                            删除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    显示 {(currentPage - 1) * PAGE_SIZE + 1} 到{' '}
                                    {Math.min(currentPage * PAGE_SIZE, allProducts.length)} 条，共{' '}
                                    {allProducts.length} 条记录
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className={`
                                            px-4 py-2 text-sm font-medium rounded-lg transition-colors
                                            ${
                                                currentPage === 1
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
                                            }
                                        `}
                                    >
                                        上一页
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                            (page) => {
                                                // 显示逻辑：始终显示第一页、最后一页、当前页及其前后各一页
                                                const showPage =
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    Math.abs(page - currentPage) <= 1;

                                                if (!showPage && page === 2) {
                                                    return (
                                                        <span
                                                            key={page}
                                                            className="px-3 py-2 text-gray-400"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                if (!showPage && page === totalPages - 1) {
                                                    return (
                                                        <span
                                                            key={page}
                                                            className="px-3 py-2 text-gray-400"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                if (!showPage) return null;

                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`
                                                        px-4 py-2 text-sm font-medium rounded-lg transition-colors
                                                        ${
                                                            currentPage === page
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
                                                        }
                                                    `}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                    <button
                                        onClick={() =>
                                            setCurrentPage(Math.min(totalPages, currentPage + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        className={`
                                            px-4 py-2 text-sm font-medium rounded-lg transition-colors
                                            ${
                                                currentPage === totalPages
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
                                            }
                                        `}
                                    >
                                        下一页
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 产品表单模态框 (新增/编辑) */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                        {/* 模态框头部 */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white">
                                    {editingProduct ? '编辑产品' : '新增产品'}
                                </h2>
                            </div>
                        </div>

                        {/* 模态框内容 */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                                    <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                        />
                                    </svg>
                                    硬件类型
                                </label>
                                <select
                                    className="shadow-sm border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white transition-all"
                                    value={productForm.category}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, category: e.target.value })
                                    }
                                    disabled={actionLoading}
                                >
                                    {categoryOptions
                                        .filter((opt) => opt.value !== '')
                                        .map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                                    <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    产品名称
                                </label>
                                <input
                                    type="text"
                                    className="shadow-sm border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    value={productForm.name}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, name: e.target.value })
                                    }
                                    placeholder="输入产品名称"
                                    disabled={actionLoading}
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                                    <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    价格 ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="shadow-sm border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    value={productForm.price}
                                    onChange={(e) =>
                                        setProductForm({ ...productForm, price: e.target.value })
                                    }
                                    placeholder="输入价格"
                                    disabled={actionLoading}
                                />
                            </div>
                        </div>

                        {/* 模态框底部 */}
                        <div className="flex justify-end gap-3 px-6 pb-6">
                            <button
                                onClick={() => {
                                    setShowFormModal(false);
                                    setProductForm({ category: 'cpu', name: '', price: '' });
                                    setEditingProduct(null);
                                }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <svg
                                    className="w-4 h-4"
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
                                取消
                            </button>
                            <button
                                onClick={handleSubmitProduct}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        处理中...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        确定
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认模态框 */}
            {showDeleteModal && deletingProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                        {/* 模态框头部 */}
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                                    <svg
                                        className="w-6 h-6 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white">确认删除</h2>
                            </div>
                        </div>

                        {/* 模态框内容 */}
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-6 h-6 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-800 font-medium mb-2">
                                        您确定要删除以下产品吗？
                                    </p>
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">产品名称：</span>
                                            {deletingProduct.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">类别：</span>
                                            {categoryDisplayMap[deletingProduct.category]}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">价格：</span>$
                                            {deletingProduct.price.toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="text-sm text-red-600 mt-3">
                                        此操作不可撤销，请谨慎操作！
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 模态框底部 */}
                        <div className="flex justify-end gap-3 px-6 pb-6">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingProduct(null);
                                }}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <svg
                                    className="w-4 h-4"
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
                                取消
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        删除中...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                        确认删除
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast 通知 */}
            {toast.show && (
                <div className="fixed top-4 right-4 z-[60] animate-slide-in-right">
                    <div
                        className={`
                            flex items-start gap-3 px-6 py-4 rounded-xl shadow-2xl border-l-4 min-w-[320px] max-w-md
                            ${
                                toast.type === 'success'
                                    ? 'bg-green-50 border-green-500'
                                    : toast.type === 'error'
                                      ? 'bg-red-50 border-red-500'
                                      : 'bg-yellow-50 border-yellow-500'
                            }
                        `}
                    >
                        {/* 图标 */}
                        <div className="flex-shrink-0 mt-0.5">
                            {toast.type === 'success' ? (
                                <svg
                                    className="w-6 h-6 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            ) : toast.type === 'error' ? (
                                <svg
                                    className="w-6 h-6 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-6 h-6 text-yellow-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            )}
                        </div>

                        {/* 内容 */}
                        <div className="flex-1">
                            <h4
                                className={`
                                    font-semibold text-sm mb-1
                                    ${
                                        toast.type === 'success'
                                            ? 'text-green-800'
                                            : toast.type === 'error'
                                              ? 'text-red-800'
                                              : 'text-yellow-800'
                                    }
                                `}
                            >
                                {toast.type === 'success'
                                    ? '操作成功'
                                    : toast.type === 'error'
                                      ? '操作失败'
                                      : '警告'}
                            </h4>
                            <p
                                className={`
                                    text-sm
                                    ${
                                        toast.type === 'success'
                                            ? 'text-green-700'
                                            : toast.type === 'error'
                                              ? 'text-red-700'
                                              : 'text-yellow-700'
                                    }
                                `}
                            >
                                {toast.message}
                            </p>
                        </div>

                        {/* 关闭按钮 */}
                        <button
                            onClick={() => setToast({ show: false, message: '', type: 'success' })}
                            className={`
                                flex-shrink-0 p-1 rounded-lg transition-colors
                                ${
                                    toast.type === 'success'
                                        ? 'hover:bg-green-100 text-green-600'
                                        : toast.type === 'error'
                                          ? 'hover:bg-red-100 text-red-600'
                                          : 'hover:bg-yellow-100 text-yellow-600'
                                }
                            `}
                        >
                            <svg
                                className="w-5 h-5"
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
            )}
        </div>
    );
}
