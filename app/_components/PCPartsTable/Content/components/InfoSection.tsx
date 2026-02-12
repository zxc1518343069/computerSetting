import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface InfoSectionProps {
    onReset: () => void;
}

export function InfoSection({ onReset }: InfoSectionProps) {
    return (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gray-50/50 dark:bg-[#1f1f1f]/50 rounded-[2rem] border border-gray-100/50 dark:border-gray-800/50 backdrop-blur-sm">
            {/* Left: Hints */}
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 flex-shrink-0">
                    <InfoCircleOutlined className="text-lg" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                        配置说明
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed m-0">
                        价格随市场波动，仅供参考。点击左侧{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-bold">推荐套餐</span>{' '}
                        可快速填单。 所有配件均支持自定义调整。
                    </p>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <Button
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    className="h-10 px-5 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 rounded-xl transition-all font-medium"
                >
                    清空配置
                </Button>
            </div>
        </div>
    );
}
