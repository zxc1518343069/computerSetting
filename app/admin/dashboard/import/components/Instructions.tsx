import {
    CheckCircleOutlined,
    CloudDownloadOutlined,
    CloudUploadOutlined,
    FileExcelOutlined,
} from '@ant-design/icons';
import React from 'react';

export const Instructions: React.FC = () => {
    const steps = [
        {
            icon: <CloudDownloadOutlined />,
            title: '下载模板',
            desc: '获取当前系统支持的完整工作表和字段结构。',
        },
        {
            icon: <FileExcelOutlined />,
            title: '导出备份',
            desc: '建议先导出现有数据，保留一份可恢复的完整备份。',
        },
        {
            icon: <CloudUploadOutlined />,
            title: '上传备份',
            desc: '上传完整 Excel 备份，系统会按表关系恢复数据。',
        },
        {
            icon: <CheckCircleOutlined />,
            title: '完成导入',
            desc: '恢复会覆盖当前库，并重新计算产品库存数量。',
        },
    ];

    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#1f1f1f]/60 p-8 backdrop-blur-xl shadow-sm">
            <div className="mb-8 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                    <span className="font-bold text-sm">i</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">操作指南</h3>
            </div>

            <div className="grid gap-8 md:grid-cols-4">
                {steps.map((step, index) => (
                    <div key={index} className="relative flex flex-col gap-4 group">
                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div className="absolute left-6 top-6 hidden h-0.5 w-full bg-gray-100 dark:bg-gray-800 md:block group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors" />
                        )}

                        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#2a2a2a] border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 shadow-sm transition-all duration-300 group-hover:border-blue-200 dark:group-hover:border-blue-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-110">
                            <span className="text-xl">{step.icon}</span>
                        </div>

                        <div>
                            <h4 className="mb-1 font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                {step.title}
                            </h4>
                            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {step.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                上传数据用于整库恢复，会替换当前产品、库存、入库单、订单和财务数据。Excel 中的 id
                字段用于维持表之间的关联，手工修改时请保持关联一致。
            </div>

            {/* Background Decoration */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gray-50 dark:bg-gray-900 opacity-50 dark:opacity-20 blur-3xl pointer-events-none" />
        </div>
    );
};
