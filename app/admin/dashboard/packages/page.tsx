'use client';
import React, { useState, useEffect } from 'react';
import PackageDetailModal from './_components/PackageDetailModal';
import PackageFormModal from './_components/PackageFormModal';

interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

export interface Package {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
    created_at: string;
    updated_at: string;
}

import { packageCategoryDisplayNames } from '@/const';

export default function PackagesPage() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // 搜索表单状态
    const [searchName, setSearchName] = useState('');
    const [searchId, setSearchId] = useState('');

    // 加载套餐列表
    const loadPackages = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/packages');
            const result = await response.json();
            if (result.success && result.data) {
                setPackages(result.data);
                setFilteredPackages(result.data);
            }
        } catch (error) {
            console.error('加载套餐失败:', error);
            alert('加载套餐列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);

    // 搜索处理
    const handleSearch = () => {
        let filtered = [...packages];

        if (searchName) {
            filtered = filtered.filter((pkg) =>
                pkg.name.toLowerCase().includes(searchName.toLowerCase())
            );
        }

        if (searchId) {
            filtered = filtered.filter((pkg) => pkg.id.toString() === searchId);
        }

        setFilteredPackages(filtered);
    };

    // 重置搜索
    const handleReset = () => {
        setSearchName('');
        setSearchId('');
        setFilteredPackages(packages);
    };

    // 打开详情
    const handleViewDetail = (pkg: Package) => {
        setSelectedPackage(pkg);
        setIsDetailModalOpen(true);
    };

    // 打开创建模态框
    const handleOpenCreate = () => {
        setSelectedPackage(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    // 打开编辑模态框
    const handleEdit = (pkg: Package) => {
        setSelectedPackage(pkg);
        setFormMode('edit');
        setIsFormModalOpen(true);
    };

    // 删除套餐
    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个套餐吗？')) return;

        try {
            const response = await fetch(`/api/packages/${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (result.success) {
                alert('套餐删除成功');
                loadPackages();
            } else {
                alert(result.error || '删除失败');
            }
        } catch (error) {
            console.error('删除套餐失败:', error);
            alert('删除失败，请稍后重试');
        }
    };

    // 获取核心配置描述
    const getCoreDescription = (items: PackageItem[]) => {
        const coreCategories = ['cpu', 'motherboard', 'gpu'];
        const coreItems = items
            .filter((item) => coreCategories.includes(item.product_category))
            .map(
                (item) =>
                    `${packageCategoryDisplayNames[item.product_category]}: ${item.product_name}`
            );

        return coreItems.length > 0 ? coreItems.join(' • ') : '暂无核心配置';
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* 标题和新增按钮 */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">配件套餐管理</h1>
                    <p className="text-gray-600">管理和查看所有配件套餐</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-blue-700 focus:ring-4 focus:ring-green-300 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    新增套餐
                </button>
            </div>

            {/* 搜索表单 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            套餐名称
                        </label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="输入套餐名称搜索"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            套餐ID
                        </label>
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder="输入ID搜索"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={handleSearch}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 transition-all duration-200 font-medium"
                        >
                            查询
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                        >
                            重置
                        </button>
                    </div>
                </div>
            </div>

            {/* 套餐卡片网格 */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredPackages.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg
                        className="mx-auto h-16 w-16 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">暂无套餐</h3>
                    <p className="text-gray-500">没有找到符合条件的套餐</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPackages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                        >
                            {/* 卡片头部 - 可点击查看详情 */}
                            <div
                                onClick={() => handleViewDetail(pkg)}
                                className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-100 cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                            {pkg.name}
                                        </h3>
                                        <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            ID: {pkg.id}
                                        </span>
                                    </div>
                                </div>
                                {/* 固定高度的描述区域 */}
                                <div className="h-10 overflow-hidden">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {pkg.description || '暂无描述'}
                                    </p>
                                </div>
                            </div>

                            {/* 核心配置 - 可点击查看详情 */}
                            <div
                                onClick={() => handleViewDetail(pkg)}
                                className="p-6 flex-1 flex flex-col cursor-pointer"
                            >
                                <div className="mb-4 flex-1">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-1"
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
                                        核心配置
                                    </h4>
                                    {/* 固定高度的核心配置区域 */}
                                    <div className="h-16 overflow-hidden">
                                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                                            {getCoreDescription(pkg.items || [])}
                                        </p>
                                    </div>
                                </div>

                                {/* 价格和数量 */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">配件数量</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {pkg.items?.length || 0} 个
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 mb-1">套餐总价</div>
                                        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                            $
                                            {parseFloat(pkg.total_price?.toString() || '0').toFixed(
                                                2
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="px-6 pb-6 flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(pkg);
                                    }}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm"
                                >
                                    编辑
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(pkg.id);
                                    }}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 font-medium text-sm"
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 详情Modal */}
            <PackageDetailModal
                package={selectedPackage}
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
            />

            {/* 表单Modal (创建/编辑) */}
            <PackageFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setSelectedPackage(null);
                }}
                onSuccess={loadPackages}
                package={selectedPackage}
                mode={formMode}
            />
        </div>
    );
}
