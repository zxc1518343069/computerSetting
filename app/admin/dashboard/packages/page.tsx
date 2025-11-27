'use client';

import React, { useRef } from 'react';
import { Input, Button, Typography, Empty, Spin } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    CodeSandboxOutlined,
} from '@ant-design/icons';
import { usePackageList } from './hooks/usePackageList';
import { PackageCard } from './components/PackageCard';
import { PackageModal } from './components/PackageModal';
import { PackageModalRef } from './types';

const { Title, Text } = Typography;

export default function PackagesPage() {
    const { packages, loading, queryParams, handleSearch, handleReset, deletePackage, refresh } =
        usePackageList();

    const modalRef = useRef<PackageModalRef>(null);

    return (
        <div className="p-6 min-h-screen bg-gray-50/50">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Title
                            level={2}
                            style={{ marginBottom: 0, fontSize: '24px', fontWeight: 600 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-800/20">
                                    <CodeSandboxOutlined style={{ fontSize: 20 }} />
                                </div>
                                <span>配件套餐管理</span>
                            </div>
                        </Title>
                        <Text type="secondary" className="mt-1 block pl-[52px]">
                            查看、创建和管理所有自定义电脑配置套餐
                        </Text>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => modalRef.current?.open('create')}
                        className="bg-slate-800 hover:bg-slate-700 border-none shadow-lg shadow-slate-800/20 h-11 px-6"
                    >
                        新增套餐
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                    <Input
                        placeholder="搜索套餐名称..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        allowClear
                        size="large"
                        value={queryParams.search}
                        onChange={(e) => handleSearch('search', e.target.value)}
                        className="max-w-md shadow-sm bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                    <Input
                        placeholder="输入ID搜索"
                        allowClear
                        size="large"
                        value={queryParams.id}
                        onChange={(e) => handleSearch('id', e.target.value)}
                        className="max-w-[200px] shadow-sm bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        size="large"
                        onClick={handleReset}
                        className="text-gray-500 border-dashed ml-auto"
                    >
                        重置
                    </Button>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" tip="加载套餐数据中..." />
                    </div>
                ) : packages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {packages.map((pkg) => (
                            <PackageCard
                                key={pkg.id}
                                pkg={pkg}
                                onView={(p) => modalRef.current?.open('view', p)}
                                onEdit={(p) => modalRef.current?.open('edit', p)}
                                onDelete={(id) => deletePackage(id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={<span className="text-gray-400">暂无套餐数据</span>}
                        >
                            <Button type="primary" onClick={() => modalRef.current?.open('create')}>
                                立即创建
                            </Button>
                        </Empty>
                    </div>
                )}
            </div>

            <PackageModal ref={modalRef} onSuccess={refresh} />
        </div>
    );
}
