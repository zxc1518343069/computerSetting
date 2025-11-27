import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface InfoSectionProps {
    onReset: () => void;
}

export function InfoSection({ onReset }: InfoSectionProps) {
    return (
        <div className="space-y-4">
            {/* 提示信息 */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 transition-all hover:bg-slate-50">
                <div className="text-sm text-slate-600 space-y-3">
                    <InfoItem text="选择产品并设置数量, 价格将自动计算。支持自定义输入产品名称和价格。" />
                    <InfoItem text="点击左侧「推荐套餐」可快速填充整套高性价比配置。" />
                </div>
            </div>

            {/* 价格说明 */}
            <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div>
                    <p className="font-bold text-slate-800 text-sm mb-1">价格免责声明</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        电子产品价格随市场行情实时波动，本报价单仅当日有效。实际成交价格请以最终确认单为准。
                    </p>
                </div>
            </div>

            {/* 重置按钮 - 使用 antd Button */}
            <div className="flex justify-center sm:justify-end pt-2">
                <Button
                    type="text"
                    size="middle"
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    style={{
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    重置所有配置
                </Button>
            </div>
        </div>
    );
}

function InfoItem({ text }: { text: string }) {
    return (
        <p className="flex items-start group">
            <span className="w-5 h-5 mr-2 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mt-0.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                    />
                </svg>
            </span>
            <span className="flex-1">{text}</span>
        </p>
    );
}
