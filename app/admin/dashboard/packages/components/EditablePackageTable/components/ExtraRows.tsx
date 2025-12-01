import React from 'react';
import { Input } from 'antd';
import { PlusCircleOutlined, GiftOutlined } from '@ant-design/icons';

interface ExtraRowsProps {
    pricing: boolean;
    disabled: boolean;
}

export const ExtraRows: React.FC<ExtraRowsProps> = ({ pricing, disabled }) => {
    return (
        <>
            {/* Other Items - Subtle styling */}
            <tr className="group hover:bg-amber-50/20 transition-colors border-t border-dashed border-gray-200/60">
                <td className="px-6 py-4 align-middle bg-gray-50/30">
                    <div className="flex items-center gap-3 text-amber-600 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <PlusCircleOutlined />
                        <span className="text-sm font-bold">附加项目</span>
                    </div>
                </td>
                <td colSpan={1} className="px-6 py-4">
                    <Input
                        placeholder="添加其他费用（如：装机服务费、运费...）"
                        disabled={disabled}
                        className="w-full rounded-lg border-gray-200 hover:border-amber-300 focus:border-amber-500 focus:shadow-amber-100"
                    />
                </td>
                {/* Spacer cols */}
                <td className="px-6 py-4 text-center">
                    <span className="text-gray-300 text-xs font-mono">1</span>
                </td>
                {pricing && <td className="px-6 py-4 text-right text-gray-200">-</td>}
                <td className="px-6 py-4 text-right text-gray-300 font-mono">-</td>
            </tr>

            {/* Gifts - Distinctive but soft */}
            <tr className="group hover:bg-pink-50/20 transition-colors border-t border-dashed border-gray-200/60">
                <td className="px-6 py-4 align-middle bg-gray-50/30">
                    <div className="flex items-center gap-3 text-pink-600 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <GiftOutlined />
                        <span className="text-sm font-bold">赠品</span>
                    </div>
                </td>
                <td colSpan={3 + (pricing ? 1 : 0)} className="px-6 py-4">
                    <Input
                        placeholder="添加赠品（如：鼠标垫、U盘...）"
                        disabled={disabled}
                        className="w-full rounded-lg border-gray-200 hover:border-pink-300 focus:border-pink-500 focus:shadow-pink-100"
                    />
                </td>
            </tr>
        </>
    );
};
