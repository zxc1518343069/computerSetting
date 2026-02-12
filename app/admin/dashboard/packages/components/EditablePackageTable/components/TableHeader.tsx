import React from 'react';
interface TableHeaderProps {
    pricing: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ pricing }) => {
    return (
        <thead className="bg-slate-50/50 dark:bg-[#1f1f1f]/50">
            <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    硬件类别
                </th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                    配置详情
                </th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    数量
                </th>
                {pricing && (
                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                        单价 (¥)
                    </th>
                )}
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                    小计 (¥)
                </th>
            </tr>
        </thead>
    );
};
