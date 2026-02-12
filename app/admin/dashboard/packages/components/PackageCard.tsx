import {
    ArrowRightOutlined,
    DeleteOutlined,
    DesktopOutlined,
    EyeOutlined,
    GatewayOutlined,
    HddOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Card, Popconfirm, Skeleton, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { Package } from '../types';

interface PackageCardProps {
    pkg: Package;
    loading?: boolean;
    isDeleting?: boolean;
    onView: (pkg: Package) => void;
    onEdit: (pkg: Package) => void;
    onDelete: (id: number) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({
    pkg,
    loading,
    isDeleting,
    onView,
    onEdit,
    onDelete,
}) => {
    if (loading) {
        return (
            <Card className="h-full shadow-sm rounded-2xl border-gray-100 overflow-hidden">
                <Skeleton active avatar paragraph={{ rows: 5 }} />
            </Card>
        );
    }

    const getSpecItem = (category: string) => {
        return pkg.items.find((item) => item.product_category === category);
    };

    const cpu = getSpecItem('cpu');
    const gpu = getSpecItem('gpu');
    const ram = getSpecItem('ram');
    const motherboard = getSpecItem('motherboard');

    // 定义多色系配置，参考 import 模块
    const themes = [
        {
            name: 'blue',
            bg: 'bg-blue-50/50',
            border: 'border-blue-100',
            iconBg: 'bg-blue-100 text-blue-600',
            hoverBorder: 'hover:border-blue-300',
            glow: 'hover:shadow-blue-200/50',
            gradient: 'from-blue-500 to-cyan-400',
            btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20',
        },
        {
            name: 'purple',
            bg: 'bg-purple-50/50',
            border: 'border-purple-100',
            iconBg: 'bg-purple-100 text-purple-600',
            hoverBorder: 'hover:border-purple-300',
            glow: 'hover:shadow-purple-200/50',
            gradient: 'from-purple-500 to-pink-400',
            btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20',
        },
        {
            name: 'green',
            bg: 'bg-emerald-50/50',
            border: 'border-emerald-100',
            iconBg: 'bg-emerald-100 text-emerald-600',
            hoverBorder: 'hover:border-emerald-300',
            glow: 'hover:shadow-emerald-200/50',
            gradient: 'from-emerald-500 to-teal-400',
            btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
        },
        {
            name: 'amber',
            bg: 'bg-amber-50/50',
            border: 'border-amber-100',
            iconBg: 'bg-amber-100 text-amber-600',
            hoverBorder: 'hover:border-amber-300',
            glow: 'hover:shadow-amber-200/50',
            gradient: 'from-amber-500 to-orange-400',
            btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
        },
    ];

    const theme = themes[pkg.id % themes.length];

    return (
        <div
            className={`group relative h-full overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.hoverBorder} ${theme.glow} backdrop-blur-sm flex flex-col ${isDeleting ? 'opacity-50 grayscale pointer-events-none' : ''}`}
        >
            {/* 装饰性渐变光晕 */}
            <div
                className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-20`}
            />

            <div className="relative z-10 flex flex-col h-full">
                {/* 头部：图标与 ID */}
                <div className="flex justify-between items-start mb-6">
                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.iconBg} shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                    >
                        <DesktopOutlined style={{ fontSize: 24 }} />
                    </div>
                    <div className="text-right">
                        <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${theme.iconBg}`}
                        >
                            ID: {pkg.id}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 font-medium">
                            {dayjs(pkg.updated_at).format('YYYY.MM.DD')}
                        </div>
                    </div>
                </div>

                {/* 标题与描述 */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-black transition-colors truncate mb-2">
                        {pkg.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-500 line-clamp-2 h-8">
                        {pkg.description || '该配置方案经过专业调优，旨在提供卓越的性能表现。'}
                    </p>
                </div>

                {/* 核心规格：网格布局 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <SpecItem
                        icon={<ThunderboltOutlined />}
                        value={cpu?.product_name}
                        theme={theme}
                    />
                    <SpecItem icon={<DesktopOutlined />} value={gpu?.product_name} theme={theme} />
                    <SpecItem icon={<HddOutlined />} value={ram?.product_name} theme={theme} />
                    <SpecItem
                        icon={<GatewayOutlined />}
                        value={motherboard?.product_name}
                        theme={theme}
                    />
                </div>

                {/* 底部：价格与操作 */}
                <div className="mt-auto pt-6 border-t border-gray-100/50">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                套餐总价
                            </span>
                            <div className="text-2xl font-black text-gray-900 tabular-nums flex items-baseline">
                                <span className="text-sm font-bold mr-1">¥</span>
                                {Number(pkg.total_price).toLocaleString()}
                            </div>
                        </div>
                        <Tag className="m-0 px-2 py-0.5 rounded-md bg-white/50 border-gray-100 text-gray-500 text-[10px] font-bold backdrop-blur-sm">
                            {pkg.items.length} 件配件
                        </Tag>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            onClick={() => onEdit(pkg)}
                            className={`flex-1 h-11 border-none shadow-lg rounded-xl font-bold transition-all duration-300 group-hover:scale-[1.02] ${theme.btn}`}
                        >
                            配置详情
                        </Button>
                        <Tooltip title="快速预览">
                            <Button
                                icon={<EyeOutlined />}
                                onClick={() => onView(pkg)}
                                className="h-11 w-11 flex items-center justify-center rounded-xl border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                            />
                        </Tooltip>
                        <Popconfirm
                            title="确定删除？"
                            onConfirm={() => onDelete(pkg.id)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true, loading: isDeleting }}
                        >
                            <Button
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                className="h-11 w-11 flex items-center justify-center rounded-xl bg-red-50/50 hover:bg-red-100 border-none transition-all"
                            />
                        </Popconfirm>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpecItem = ({
    icon,
    value,
    theme,
}: {
    icon: React.ReactNode;
    value?: string;
    theme: { iconBg: string };
}) => (
    <div className="flex items-center gap-2 group/item">
        <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme.iconBg} text-xs shadow-sm`}
        >
            {icon}
        </div>
        <div
            className="text-[11px] font-bold text-gray-600 truncate flex-1"
            title={value || '未配置'}
        >
            {value || <span className="text-gray-300 italic font-normal">未配置</span>}
        </div>
    </div>
);
