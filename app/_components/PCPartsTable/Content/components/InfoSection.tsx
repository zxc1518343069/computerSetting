import { Button, Space } from 'antd';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface InfoSectionProps {
    onReset: () => void;
}

export function InfoSection({ onReset }: InfoSectionProps) {
    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            {/* Left: Hints */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <InfoCircleOutlined className="text-blue-500" />
                <span>
                    提示：价格随市场波动，仅供参考。点击左侧{' '}
                    <span className="font-bold text-gray-700">推荐套餐</span> 可快速填单。
                </span>
            </div>

            {/* Right: Actions */}
            <Space>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    className="border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200"
                >
                    重置
                </Button>
            </Space>
        </div>
    );
}
