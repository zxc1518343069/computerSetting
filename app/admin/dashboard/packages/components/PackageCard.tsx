import React from 'react';
import { Card, Typography, Tag, Button, Popconfirm, Skeleton, Divider } from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ThunderboltOutlined,
    GatewayOutlined,
    HddOutlined,
    DesktopOutlined,
} from '@ant-design/icons';
import { Package } from '../types';

const { Text } = Typography;

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
            <Card className="h-full shadow-sm rounded-2xl border-gray-100">
                <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
        );
    }

    // 提取核心配置
    const getSpecItem = (category: string) => {
        return pkg.items.find((item) => item.product_category === category);
    };

    const cpu = getSpecItem('cpu');
    const gpu = getSpecItem('gpu');
    const ram = getSpecItem('ram');
    const motherboard = getSpecItem('motherboard');

    // 生成随机渐变色背景，基于 ID
    const gradients = [
        'from-blue-500 to-cyan-400',
        'from-purple-500 to-indigo-400',
        'from-emerald-500 to-teal-400',
        'from-rose-500 to-orange-400',
        'from-amber-500 to-yellow-400',
    ];
    const gradientClass = gradients[pkg.id % gradients.length];

    return (
        <Card
            bordered={false}
            className="h-full shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group border border-gray-100 flex flex-col bg-white"
            styles={{
                body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
            }}
        >
            {/* 视觉封面区 */}
            <div
                onClick={() => !isDeleting && onView(pkg)}
                className={`h-32 bg-gradient-to-r ${gradientClass} p-6 relative cursor-pointer group-hover:brightness-105 transition-all ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-xl text-white hover:bg-white/30 transition-colors">
                    <EyeOutlined style={{ fontSize: 18 }} />
                </div>
                <div className="absolute -bottom-6 left-6">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl">
                        {/* 根据套餐首字显示图标或字符 */}
                        <DesktopOutlined
                            className={`text-transparent bg-clip-text bg-gradient-to-br ${gradientClass}`}
                        />
                    </div>
                </div>
                <div className="text-white/90 font-medium text-sm tracking-wider opacity-80">
                    PACKAGE #{pkg.id}
                </div>
                <h3 className="text-white text-xl font-bold mt-1 truncate pr-12 shadow-sm">
                    {pkg.name}
                </h3>
            </div>

            {/* 内容区 */}
            <div className="pt-10 px-6 pb-4 flex-1 flex flex-col">
                <Text className="text-gray-500 text-sm mb-6 line-clamp-2 h-10 leading-relaxed">
                    {pkg.description || '暂无详细描述，请点击查看更多配置信息。'}
                </Text>

                {/* 核心配置列表 */}
                <div className="space-y-3 mb-6">
                    <SpecRow
                        icon={<ThunderboltOutlined />}
                        label="CPU"
                        value={cpu?.product_name}
                        color="text-blue-500"
                        bg="bg-blue-50"
                    />
                    <SpecRow
                        icon={<DesktopOutlined />}
                        label="显卡"
                        value={gpu?.product_name}
                        color="text-purple-500"
                        bg="bg-purple-50"
                    />
                    <SpecRow
                        icon={<HddOutlined />}
                        label="内存"
                        value={ram?.product_name}
                        color="text-emerald-500"
                        bg="bg-emerald-50"
                    />
                    <SpecRow
                        icon={<GatewayOutlined />}
                        label="主板"
                        value={motherboard?.product_name}
                        color="text-orange-500"
                        bg="bg-orange-50"
                    />
                </div>

                <Divider className="my-4" />

                {/* 价格与操作 */}
                <div className="mt-auto">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <Text type="secondary" className="text-xs block">
                                套餐总价
                            </Text>
                            <div className="text-2xl font-black text-gray-800">
                                <span className="text-base font-bold mr-1">¥</span>
                                {Number(pkg.total_price).toFixed(2)}
                            </div>
                        </div>
                        <div className="text-right">
                            <Tag
                                color="default"
                                className="mr-0 px-3 py-1 rounded-lg border-gray-200 text-gray-500"
                            >
                                共 {pkg.items.length} 件配件
                            </Tag>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => onEdit(pkg)}
                            disabled={isDeleting}
                            className="rounded-xl h-10 hover:border-blue-500 hover:text-blue-500"
                        >
                            编辑
                        </Button>
                        <Popconfirm
                            title="确定删除?"
                            description="删除后无法恢复"
                            onConfirm={() => onDelete(pkg.id)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true, loading: isDeleting }}
                            disabled={isDeleting}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                loading={isDeleting}
                                className="rounded-xl h-10 hover:bg-red-50"
                            >
                                {isDeleting ? '删除中' : '删除'}
                            </Button>
                        </Popconfirm>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const SpecRow = ({
    icon,
    label,
    value,
    color,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    color: string;
    bg: string;
}) => (
    <div className="flex items-center gap-3">
        <div
            className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0`}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="text-sm font-medium text-gray-700 truncate" title={value || '未配置'}>
                {value || <span className="text-gray-300 italic">未配置</span>}
            </div>
        </div>
    </div>
);
