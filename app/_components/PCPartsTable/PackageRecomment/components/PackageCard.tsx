import { Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { Package } from '../types';
import { getCoreSpecs } from '../utils';

interface PackageCardProps {
    pkg: Package;
    onApply: () => void;
}

export function PackageCard({ pkg, onApply }: PackageCardProps) {
    const coreSpecs = getCoreSpecs(pkg);

    return (
        <div
            className="group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer bg-white/50 hover:bg-white/80 border border-white/60 hover:border-blue-200/60 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden backdrop-blur-sm"
            onClick={onApply}
        >
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />

            {/* 徽章装饰 */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-blue-500/30">
                    点击使用
                </div>
            </div>

            <div className="relative z-10">
                {/* 标题和价格 */}
                <div className="mb-4">
                    <h3 className="font-bold text-slate-800 text-base mb-2 pr-12 group-hover:text-blue-600 transition-colors">
                        {pkg.name}
                    </h3>
                    <div className="flex items-baseline justify-between">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-lg">
                            ¥{pkg.total_price.toFixed(2)}
                        </span>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50">
                            {pkg.items.length}件
                        </span>
                    </div>
                </div>

                {/* 核心配件信息 */}
                {coreSpecs.length > 0 && (
                    <div className="space-y-2 mb-3">
                        {coreSpecs.map((spec) => (
                            <CoreSpecItem key={spec.id} icon={spec.icon} name={spec.product_name} />
                        ))}
                    </div>
                )}

                {/* 按钮 - 使用 antd Button */}
                <Button
                    type="primary"
                    block
                    icon={<CopyOutlined />}
                    size="middle"
                    style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                        border: 'none',
                        fontWeight: 500,
                    }}
                    className="group-hover:scale-[1.02] transform transition-transform"
                >
                    使用配置
                </Button>
            </div>
        </div>
    );
}

function CoreSpecItem({ icon, name }: { icon: string; name: string }) {
    return (
        <div className="flex items-start gap-2 text-xs">
            <span className="text-base">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-gray-700 truncate font-medium">{name}</p>
            </div>
        </div>
    );
}
