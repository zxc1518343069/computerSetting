'use client';

import React, { useRef } from 'react';
import { Card, Input, Select, Button, Space, Typography, Tooltip, Badge } from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    SearchOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import { usePricing, useProductList } from './hooks';
import { ProductTable } from './_components/ProductTable';
import { ProductModal } from './_components/ProductModal';
import { ProductModalRef } from './types';
import { categoryOptions } from './constants';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ConfigPage() {
    // 列表数据逻辑
    const {
        products,
        loading,
        queryParams,
        handleSearch,
        handleReset,
        deleteProduct,
        deleteLoading,
        refresh,
    } = useProductList();

    // 价格计算逻辑
    const { getSellingPriceInfo } = usePricing();

    // 模态框 Ref
    const modalRef = useRef<ProductModalRef>(null);

    return (
        <div className="p-6 min-h-screen bg-gray-50/50">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* 页面标题区域 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Title
                            level={2}
                            style={{ marginBottom: 0, fontSize: '24px', fontWeight: 600 }}
                        >
                            <Space>
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                    <SettingOutlined style={{ fontSize: 20 }} />
                                </div>
                                <span>产品配置管理</span>
                            </Space>
                        </Title>
                        <Text type="secondary" className="mt-1 block pl-[52px]">
                            统一管理电脑硬件的基础信息、分类及定价策略
                        </Text>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm hidden md:flex">
                            <Space size={0}>
                                <span className="px-3 text-gray-400 text-sm">总产品数</span>
                                <span className="px-3 font-semibold text-gray-700 border-l border-gray-100">
                                    {products.length}
                                </span>
                            </Space>
                        </div>
                    </div>
                </div>

                {/* 主内容卡片 */}
                <Card
                    bordered={false}
                    className="shadow-sm rounded-xl overflow-hidden"
                    bodyStyle={{ padding: '24px' }}
                >
                    {/* 工具栏 */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        {/* 左侧搜索筛选区 */}
                        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
                            <Select
                                placeholder="所有硬件类型"
                                allowClear
                                style={{ width: 180 }}
                                size="large"
                                value={queryParams.category}
                                onChange={(val) => handleSearch('category', val)}
                                suffixIcon={<FilterOutlined className="text-gray-400" />}
                                className="shadow-sm"
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) => {
                                    console.log('options', option);
                                    const optLabel = (option?.value as string) || '';
                                    return optLabel?.toLowerCase().includes(input.toLowerCase());
                                }}
                            >
                                {categoryOptions.map((opt) => (
                                    <Option key={opt.value} value={opt.value}>
                                        <Space>
                                            <Badge color={opt.color} />
                                            {opt.label}
                                        </Space>
                                    </Option>
                                ))}
                            </Select>

                            <Input
                                placeholder="搜索产品名称..."
                                prefix={<SearchOutlined className="text-gray-400" />}
                                allowClear
                                size="large"
                                style={{ width: 240 }}
                                value={queryParams.search}
                                onChange={(e) => handleSearch('search', e.target.value)}
                                className="shadow-sm"
                            />

                            <Tooltip title="重置筛选">
                                <Button
                                    icon={<ReloadOutlined />}
                                    size="large"
                                    onClick={handleReset}
                                    className="text-gray-500 hover:text-blue-600 border-dashed"
                                />
                            </Tooltip>
                        </div>

                        {/* 右侧操作区 */}
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => modalRef.current?.open()}
                            className="bg-blue-600 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 border-none w-full md:w-auto"
                        >
                            新增产品
                        </Button>
                    </div>

                    {/* 表格区域 */}
                    <div className="bg-white rounded-lg border border-gray-100">
                        <ProductTable
                            loading={loading}
                            products={products}
                            getSellingPriceInfo={getSellingPriceInfo}
                            onEdit={(product) => modalRef.current?.open(product)}
                            onDelete={deleteProduct}
                            deleteLoading={deleteLoading}
                        />
                    </div>
                </Card>
            </div>

            <ProductModal ref={modalRef} onSuccess={refresh} />
        </div>
    );
}
