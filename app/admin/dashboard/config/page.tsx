'use client';

import { CATEGORY_CONFIG, categoryOptions } from '@/const/categories';
import { formatPrice } from '@/utils';
import {
    AppstoreOutlined,
    DatabaseOutlined,
    DollarOutlined,
    FilterOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import React, { useMemo, useRef } from 'react';
import { ProductModal } from './_components/ProductModal';
import { ProductTable } from './_components/ProductTable';
import { usePricing, useProductList } from './hooks';
import { ProductModalRef } from './types';

const { Option } = Select;

export default function ConfigPage() {
    // 列表数据逻辑
    const { products, loading, queryParams, handleSearch, deleteProduct, deleteLoading, refresh } =
        useProductList();

    // 价格计算逻辑
    const { getSellingPriceInfo } = usePricing();

    // 模态框 Ref
    const modalRef = useRef<ProductModalRef>(null);

    // 计算统计数据
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
        const avgPrice = totalProducts > 0 ? totalPrice / totalProducts : 0;
        const activeCategories = new Set(products.map((p) => p.category)).size;

        return {
            totalProducts,
            avgPrice,
            activeCategories,
        };
    }, [products]);

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-black pb-20">
            {/* 顶部装饰背景 */}
            <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent -z-10 pointer-events-none" />

            <div className="max-w-[1600px] mx-auto px-6 pt-8 space-y-8">
                {/* 页面头部 */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                            硬件配置中心
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl">
                            管理所有电脑硬件的基础信息、分类归属及全局定价策略。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => modalRef.current?.open()}
                            className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 dark:shadow-none border-none rounded-xl"
                        >
                            新增产品
                        </Button>
                    </div>
                </div>

                {/* 统计卡片区域 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
                            <DatabaseOutlined />
                        </div>
                        <div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                                总产品数
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                {stats.totalProducts}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
                            <DollarOutlined />
                        </div>
                        <div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                                平均参考价
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                {formatPrice(stats.avgPrice)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl">
                            <AppstoreOutlined />
                        </div>
                        <div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                                覆盖分类
                            </div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                                {stats.activeCategories}
                                <span className="text-gray-400 dark:text-gray-500 text-lg font-normal ml-2">
                                    / {categoryOptions.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 控制栏与表格 */}
                <div className="space-y-4">
                    {/* 悬浮控制栏 */}
                    <div className="sticky top-4 z-20 bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl p-2 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-4 transition-all duration-300">
                        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                            <div className="relative flex-1 max-w-md group">
                                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="搜索产品名称 / 条形码..."
                                    allowClear
                                    value={queryParams.search}
                                    onChange={(e) => handleSearch('search', e.target.value)}
                                    className="pl-10 border-none bg-gray-100/50 dark:bg-[#2a2a2a]/50 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] focus:bg-white dark:focus:bg-[#141414] transition-all rounded-xl h-10 dark:text-gray-200 dark:placeholder:text-gray-600"
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
                            <Select
                                placeholder="所有硬件类型"
                                allowClear
                                style={{ width: 200 }}
                                value={queryParams.category}
                                onChange={(val) => handleSearch('category', val)}
                                suffixIcon={
                                    <FilterOutlined className="text-gray-400 dark:text-gray-500" />
                                }
                                className="bg-gray-100/50 dark:bg-[#2a2a2a]/50 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-xl h-10 flex items-center"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                    const optLabel = (option?.label as string) || '';
                                    return optLabel?.toLowerCase().includes(input.toLowerCase());
                                }}
                            >
                                {categoryOptions.map((opt) => (
                                    <Option key={opt.value} value={opt.value} label={opt.label}>
                                        <div className="flex items-center gap-2 py-1">
                                            <span>{CATEGORY_CONFIG[opt.value]?.icon}</span>
                                            <span>{opt.label}</span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 pr-2">
                            <Tooltip title="刷新列表">
                                <Button
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    onClick={refresh}
                                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg h-10 w-10 flex items-center justify-center"
                                />
                            </Tooltip>
                        </div>
                    </div>

                    {/* 表格区域 */}
                    <ProductTable
                        loading={loading}
                        products={products}
                        getSellingPriceInfo={getSellingPriceInfo}
                        onEdit={(product) => modalRef.current?.open(product)}
                        onDelete={deleteProduct}
                        deleteLoading={deleteLoading}
                    />
                </div>
            </div>

            <ProductModal ref={modalRef} onSuccess={refresh} />
        </div>
    );
}
