import React from 'react';

interface TableHeaderProps {
    pricing: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ pricing }) => {
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
                        单价
                    </th>
                )}
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider w-36">
                    小计
                </th>
            </tr>
        </thead>
    );
};
