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
            {/* 附加项目 */}
            <tr className="group hover:bg-amber-50/30 transition-colors border-t border-dashed border-gray-100">
                <td className="px-8 py-5 align-middle bg-gray-50/30">
                    <div className="flex items-center gap-3 text-amber-600 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <PlusCircleOutlined />
                        <span className="text-sm font-bold">附加项目</span>
                    </div>
                </td>
                <td colSpan={1} className="px-8 py-5">
                    <Input
                        placeholder="添加其他费用（如：装机服务费、运费...）"
                        disabled={disabled}
                        variant="borderless"
                        className="w-full rounded-xl bg-white/50 border border-transparent hover:border-amber-200 focus:border-amber-400 focus:bg-white transition-all h-10"
                    />
                </td>
                <td className="px-8 py-5 text-center">
                    <span className="text-gray-300 text-xs font-mono">1</span>
                </td>
                {pricing && <td className="px-8 py-5 text-right text-gray-200 font-mono">---</td>}
                <td className="px-8 py-5 text-right text-gray-300 font-mono">---</td>
            </tr>

            {/* 赠品 */}
            <tr className="group hover:bg-pink-50/30 transition-colors border-t border-dashed border-gray-100">
                <td className="px-8 py-5 align-middle bg-gray-50/30">
                    <div className="flex items-center gap-3 text-pink-600 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <GiftOutlined />
                        <span className="text-sm font-bold">赠品项目</span>
                    </div>
                </td>
                <td colSpan={3 + (pricing ? 1 : 0)} className="px-8 py-5">
                    <Input
                        placeholder="添加赠品（如：鼠标垫、U盘...）"
                        disabled={disabled}
                        variant="borderless"
                        className="w-full rounded-xl bg-white/50 border border-transparent hover:border-pink-200 focus:border-pink-400 focus:bg-white transition-all h-10"
                    />
                </td>
            </tr>
        </>
    );
};

