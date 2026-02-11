'use client';

import React, { useRef, useState } from 'react';
import { Input, Button, Typography, Tooltip, Segmented } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    CodeSandboxOutlined,
    FilterOutlined,
    AppstoreOutlined,
    BarsOutlined,
    LayoutOutlined,
} from '@ant-design/icons';
import { usePackageList } from './hooks/usePackageList';
import { PackageCard } from './components/PackageCard';
import { PackageModal } from './components/PackageModal';
import { PackageModalRef } from './types';

const { Title, Text } = Typography;

export default function PackagesPage() {
    const {
        packages,
        loading,
        queryParams,
        deletingId,
        handleSearch,
        handleReset,
        deletePackage,
        refresh,
    } = usePackageList();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const modalRef = useRef<PackageModalRef>(null);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 relative overflow-hidden">
            {/* 背景装饰：参考 import 模块 */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-200/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1600px] mx-auto space-y-10 relative z-10">
                {/* 页面头部 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-5">
                        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                <LayoutOutlined style={{ fontSize: 24 }} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                                套餐方案中心
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">
                                数字化管理您的硬件配置方案，当前已加载 {packages.length} 个模块
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1">
                            <Segmented
                                value={viewMode}
                                onChange={(value) => setViewMode(value as 'grid' | 'list')}
                                options={[
                                    { value: 'grid', icon: <AppstoreOutlined /> },
                                    { value: 'list', icon: <BarsOutlined /> },
                                ]}
                                className="bg-transparent"
                            />
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => modalRef.current?.open('create')}
                            className="h-14 px-8 bg-indigo-600 hover:bg-indigo-500 border-none shadow-xl shadow-indigo-600/20 rounded-2xl font-bold text-base transition-all active:scale-95"
                        >
                            新建配置方案
                        </Button>
                    </div>
                </div>

                {/* 搜索控制台：玻璃拟态 */}
                <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/50 space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full group">
                            <Input
                                placeholder="搜索套餐名称、核心硬件型号..."
                                prefix={<SearchOutlined className="text-gray-400 text-lg mr-2 transition-colors group-focus-within:text-indigo-500" />}
                                variant="borderless"
                                allowClear
                                value={queryParams.search}
                                onChange={(e) => handleSearch('search', e.target.value)}
                                className="w-full h-14 px-6 bg-white/50 hover:bg-white focus:bg-white rounded-2xl text-base font-medium transition-all border border-gray-100 focus:border-indigo-200 shadow-inner"
                            />
                        </div>
                        
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <Input
                                placeholder="ID 搜索"
                                variant="borderless"
                                allowClear
                                value={queryParams.id}
                                onChange={(e) => handleSearch('id', e.target.value)}
                                className="w-full md:w-36 h-14 px-6 bg-white/50 hover:bg-white focus:bg-white rounded-2xl text-base font-mono transition-all border border-gray-100 focus:border-indigo-200 shadow-inner"
                            />
                            <Button
                                icon={<FilterOutlined />}
                                size="large"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className={`h-14 px-6 rounded-2xl border-gray-100 font-bold transition-all ${showAdvanced ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:border-indigo-300'}`}
                            >
                                高级筛选
                            </Button>
                            <Tooltip title="重置控制台">
                                <Button
                                    icon={<ReloadOutlined />}
                                    size="large"
                                    onClick={handleReset}
                                    className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white border-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                                />
                            </Tooltip>
                        </div>
                    </div>

                    {/* 高级筛选面板 */}
                    {showAdvanced && (
                        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">价格区间</span>
                                <div className="flex items-center gap-2">
                                    <Input placeholder="最低" className="rounded-xl h-11 bg-white/50" />
                                    <div className="w-4 h-px bg-gray-200" />
                                    <Input placeholder="最高" className="rounded-xl h-11 bg-white/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">创建时间</span>
                                <Input placeholder="选择日期范围" className="rounded-xl h-11 bg-white/50 w-full" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">排序方式</span>
                                <Input placeholder="默认排序" className="rounded-xl h-11 bg-white/50 w-full" />
                            </div>
                            <div className="flex items-end">
                                <Button className="w-full h-11 bg-indigo-50 text-indigo-600 border-none rounded-xl font-bold hover:bg-indigo-100 transition-all">
                                    应用筛选条件
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 内容展示区域 */}
                <div className="relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                </div>
                            </div>
                            <span className="text-gray-400 text-sm font-bold uppercase tracking-[0.3em] animate-pulse">
                                正在同步方案数据...
                            </span>
                        </div>
                    ) : packages.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                                {packages.map((pkg) => (
                                    <PackageCard
                                        key={pkg.id}
                                        pkg={pkg}
                                        isDeleting={deletingId === pkg.id}
                                        onView={(p) => modalRef.current?.open('view', p)}
                                        onEdit={(p) => modalRef.current?.open('edit', p)}
                                        onDelete={(id) => deletePackage(id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto scrollbar-hide bg-white rounded-2xl border border-white shadow-sm">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead className="bg-slate-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">方案名称</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">核心配置摘要</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">市场总价</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {packages.map((pkg) => (
                                            <tr key={pkg.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-mono text-gray-400">#{pkg.id}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{pkg.name}</td>
                                                <td className="px-8 py-5 text-xs text-gray-500">
                                                    <div className="flex gap-2">
                                                        {pkg.items.slice(0, 3).map((i, idx) => (
                                                            <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{i.product_name}</span>
                                                        ))}
                                                        {pkg.items.length > 3 && <span className="text-gray-300">...</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-base font-black text-gray-900 text-right tabular-nums">
                                                    <span className="text-xs mr-1">¥</span>
                                                    {Number(pkg.total_price).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button type="text" size="small" onClick={() => modalRef.current?.open('edit', pkg)} className="text-blue-600 font-bold hover:bg-blue-50">编辑</Button>
                                                        <Button type="text" size="small" danger onClick={() => deletePackage(pkg.id)} className="font-bold hover:bg-red-50">删除</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        <div className="py-40 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-24 h-24 bg-gray-100 rounded-[2rem] flex items-center justify-center text-gray-300 mb-8 transition-transform hover:scale-110 hover:rotate-3">
                                <CodeSandboxOutlined style={{ fontSize: 48 }} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">未检测到配置方案</h3>
                            <p className="text-gray-500 max-w-md mb-10 text-base">
                                您的方案库目前为空。点击下方按钮初始化您的第一个硬件配置方案。
                            </p>
                            <Button 
                                type="primary" 
                                size="large"
                                onClick={() => modalRef.current?.open('create')}
                                className="h-14 px-12 bg-indigo-600 border-none rounded-2xl font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                            >
                                初始化首个方案
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <PackageModal ref={modalRef} onSuccess={refresh} />
        </div>
    );
}




