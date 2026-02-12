import { GiftOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import React from 'react';

interface ExtraRowsProps {
    pricing: boolean;
    disabled: boolean;
}

export const ExtraRows: React.FC<ExtraRowsProps> = ({ pricing, disabled }) => {
    return (
        <>
            {/* 附加项目 */}
            <tr className="group hover:bg-amber-50/30 dark:hover:bg-amber-900/20 transition-colors border-t border-dashed border-gray-100 dark:border-gray-800">
                <td className="px-8 py-5 align-middle bg-gray-50/30 dark:bg-[#1f1f1f]/30">
                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <PlusCircleOutlined />
                        <span className="text-sm font-bold">附加项目</span>
                    </div>
                </td>
                <td colSpan={1} className="px-8 py-5">
                    <Input
                        placeholder="添加其他费用（如：装机服务费、运费...）"
                        disabled={disabled}
                        variant="borderless"
                        className="w-full rounded-xl bg-white/50 dark:bg-[#1f1f1f]/50 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 focus:border-amber-400 dark:focus:border-amber-600 focus:bg-white dark:focus:bg-[#141414] transition-all h-10 dark:text-gray-200"
                    />
                </td>
                <td className="px-8 py-5 text-center">
                    <span className="text-gray-300 dark:text-gray-600 text-xs font-mono">1</span>
                </td>
                {pricing && (
                    <td className="px-8 py-5 text-right text-gray-200 dark:text-gray-700 font-mono">
                        ---
                    </td>
                )}
                <td className="px-8 py-5 text-right text-gray-300 dark:text-gray-600 font-mono">
                    ---
                </td>
            </tr>

            {/* 赠品 */}
            <tr className="group hover:bg-pink-50/30 dark:hover:bg-pink-900/20 transition-colors border-t border-dashed border-gray-100 dark:border-gray-800">
                <td className="px-8 py-5 align-middle bg-gray-50/30 dark:bg-[#1f1f1f]/30">
                    <div className="flex items-center gap-3 text-pink-600 dark:text-pink-500 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        <GiftOutlined />
                        <span className="text-sm font-bold">赠品项目</span>
                    </div>
                </td>
                <td colSpan={3 + (pricing ? 1 : 0)} className="px-8 py-5">
                    <Input
                        placeholder="添加赠品（如：鼠标垫、U盘...）"
                        disabled={disabled}
                        variant="borderless"
                        className="w-full rounded-xl bg-white/50 dark:bg-[#1f1f1f]/50 border border-transparent hover:border-pink-200 dark:hover:border-pink-800 focus:border-pink-400 dark:focus:border-pink-600 focus:bg-white dark:focus:bg-[#141414] transition-all h-10 dark:text-gray-200"
                    />
                </td>
            </tr>
        </>
    );
};
