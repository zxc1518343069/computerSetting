import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface InfoSectionProps {
    onReset: () => void;
}

export function InfoSection({ onReset }: InfoSectionProps) {
    return (
        <div className="space-y-4">
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-700 space-y-2">
                    <InfoItem text="选择产品并设置数量,价格自动计算。支持自定义产品名称和价格。" />
                    <InfoItem text="点击左侧推荐套餐可快速填充配件信息。" />
                </div>
            </div>

            {/* 价格说明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div className="ml-4">
                        <p className="font-semibold text-gray-800 text-base">价格说明</p>
                        <p className="text-sm text-gray-600 leading-relaxed mt-1">
                            硬件价格随市场行情波动,报价仅当日有效。
                        </p>
                    </div>
                </div>
            </div>

            {/* 重置按钮 - 使用 antd Button */}
            <div className="flex justify-center sm:justify-end">
                <Button
                    type="default"
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    className="shadow-md hover:shadow-lg"
                    style={{
                        borderRadius: '12px',
                        background: 'linear-gradient(to right, #6b7280, #4b5563)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 500,
                    }}
                >
                    重置配置
                </Button>
            </div>
        </div>
    );
}

function InfoItem({ text }: { text: string }) {
    return (
        <p className="flex items-start">
            <svg
                className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
            >
                <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                />
            </svg>
            <span>{text}</span>
        </p>
    );
}
