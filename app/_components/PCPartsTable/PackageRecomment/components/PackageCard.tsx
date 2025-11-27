import { Button, Tag } from 'antd';
import { CopyOutlined, ThunderboltFilled, DesktopOutlined, RocketFilled } from '@ant-design/icons';
import { Package } from '../types';
import { getCoreSpecs } from '../utils';

interface PackageCardProps {
    pkg: Package;
    onApply: () => void;
}

export function PackageCard({ pkg, onApply }: PackageCardProps) {
    const coreSpecs = getCoreSpecs(pkg);

    // 提取关键配置用于展示
    const findSpec = (category: string) => coreSpecs.find((s) => s.product_category === category);
    const cpu = findSpec('cpu');
    const gpu = findSpec('gpu');
    const motherboard = findSpec('motherboard');

    // 辅助渲染行
    const SpecRow = ({
        icon,
        label,
        value,
        color,
    }: {
        icon: React.ReactNode;
        label: string;
        value?: string;
        color: string;
    }) => (
        <div className="flex items-center gap-2 text-xs overflow-hidden">
            <div
                className={`w-5 h-5 rounded flex items-center justify-center ${color} text-white flex-shrink-0 shadow-sm`}
            >
                {icon}
            </div>
            <div className="flex-1 truncate">
                <span className="text-gray-400 mr-1 scale-90 inline-block origin-left">
                    {label}
                </span>
                <span className="font-medium text-gray-700" title={value}>
                    {value || '-'}
                </span>
            </div>
        </div>
    );

    return (
        <div
            className="group relative bg-white rounded-xl border border-gray-100 hover:border-blue-400/50 p-4 transition-all duration-300 hover:shadow-[0_8px_24px_-6px_rgba(59,130,246,0.15)] cursor-pointer overflow-hidden"
            onClick={onApply}
        >
            {/* 顶部：名称与价格 */}
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex-1 pr-2 overflow-hidden">
                    <div className="font-bold text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                        {pkg.name}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {pkg.description || '暂无描述'}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-blue-600 font-black text-base leading-none">
                        <span className="text-xs font-medium mr-0.5">¥</span>
                        {pkg.total_price.toFixed(0)}
                    </div>
                </div>
            </div>

            {/* 核心配置列表 */}
            <div className="space-y-2 mb-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100 group-hover:bg-white group-hover:shadow-inner transition-colors">
                <SpecRow
                    icon={<ThunderboltFilled style={{ fontSize: 10 }} />}
                    label="CPU"
                    value={cpu?.product_name}
                    color="bg-blue-500"
                />
                <SpecRow
                    icon={<DesktopOutlined style={{ fontSize: 10 }} />}
                    label="显卡"
                    value={gpu?.product_name}
                    color="bg-purple-500"
                />
                <SpecRow
                    icon={<RocketFilled style={{ fontSize: 10 }} />}
                    label="主板"
                    value={motherboard?.product_name}
                    color="bg-indigo-500"
                />
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between mt-2">
                <Tag className="m-0 border-transparent bg-gray-100 text-gray-500 text-[10px] px-2">
                    {pkg.items.length} 配件
                </Tag>
                <Button
                    type="primary"
                    size="small"
                    icon={<CopyOutlined />}
                    className="bg-slate-800 hover:bg-blue-600 border-none shadow-sm text-[10px] h-6 px-3"
                >
                    应用
                </Button>
            </div>

            {/* 悬浮光效装饰 */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-100/20 rounded-full blur-2xl group-hover:bg-blue-200/30 transition-all" />
        </div>
    );
}
