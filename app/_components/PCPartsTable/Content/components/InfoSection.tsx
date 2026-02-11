import { Button } from 'antd';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface InfoSectionProps {
    onReset: () => void;
}

export function InfoSection({ onReset }: InfoSectionProps) {
    return (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100/50 backdrop-blur-sm">
            {/* Left: Hints */}
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <InfoCircleOutlined className="text-lg" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800 mb-0.5">配置说明</div>
                    <p className="text-xs text-gray-400 leading-relaxed m-0">
                        价格随市场波动，仅供参考。点击左侧{' '}
                        <span className="text-blue-600 font-bold">推荐套餐</span> 可快速填单。
                        所有配件均支持自定义调整。
                    </p>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <Button
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    className="h-10 px-5 border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 rounded-xl transition-all font-medium"
                >
                    清空配置
                </Button>
            </div>
        </div>
    );
}
