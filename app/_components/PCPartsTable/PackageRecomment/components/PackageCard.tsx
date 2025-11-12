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
            className="group relative border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-blue-500 transition-all duration-300 hover:shadow-xl cursor-pointer bg-gradient-to-br from-white to-gray-50 overflow-hidden transform hover:-translate-y-1"
            onClick={onApply}
        >
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-300" />

            {/* 徽章装饰 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    点击使用
                </div>
            </div>

            <div className="relative">
                {/* 标题和价格 */}
                <div className="mb-3">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2 pr-12">
                        {pkg.name}
                    </h3>
                    <div className="flex items-baseline justify-between">
                        <span className="text-blue-600 font-bold text-base sm:text-lg">
                            ¥{pkg.total_price.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
