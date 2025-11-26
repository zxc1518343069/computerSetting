interface TableHeaderProps {
    pricing: boolean;
}

export function TableHeader({ pricing }: TableHeaderProps) {
    return (
        <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="w-24 px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                        </svg>
                        类型
                    </div>
                </th>
                <th className="w-104 px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <svg
                            className="w-4 h-4 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                        </svg>
                        产品名称
                    </div>
                </th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    数量
                </th>
                {pricing ? (
                    <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        单价
                    </th>
                ) : (
                    <>
                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            原价
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            售价
                        </th>
                    </>
                )}
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                        <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        小计
                    </div>
                </th>
            </tr>
        </thead>
    );
}
