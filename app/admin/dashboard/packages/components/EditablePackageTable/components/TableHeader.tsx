import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface TableHeaderProps {
    pricing: boolean;
    showTips?: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ pricing, showTips }) => {
    return (
        <thead className="bg-gray-50/50">
            <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">
                    类别
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                    配置详情
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-28">
                    数量
                </th>
                {pricing && (
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider w-36">
                        {showTips ? (
                            <div className="flex items-center justify-end gap-1 cursor-help">
                                <span>单价</span>
                                <Tooltip
                                    title={
                                        <div className="text-xs">
                                            <p className="font-bold mb-1">单价计算公式</p>
                                            <p>进价 × (1 + 溢价率)</p>
                                            <p className="mt-1 opacity-80 border-t border-white/20 pt-1">
                                                *包含已配置的取整策略
                                                <br />
                                                (如向上取整到个位/十位)
                                            </p>
                                        </div>
                                    }
                                >
                                    <InfoCircleOutlined className="text-[10px]" />
                                </Tooltip>
                            </div>
                        ) : (
                            '单价'
                        )}
                    </th>
                )}
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider w-36">
                    {showTips ? (
                        <div className="flex items-center justify-end gap-1 cursor-help">
                            <span>小计</span>
                            <Tooltip title="单价 × 数量">
                                <InfoCircleOutlined className="text-[10px]" />
                            </Tooltip>
                        </div>
                    ) : (
                        '小计'
                    )}
                </th>
            </tr>
        </thead>
    );
};
