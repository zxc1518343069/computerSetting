/* eslint-disable @next/next/no-img-element */
'use client';

import { Package } from '@/app/_components/PCPartsTable/PackageRecomment';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import { INITIAL_ONLINE_GAMES, INITIAL_SINGLE_GAMES } from '@/const/games';
import {
    DashboardOutlined,
    ExperimentOutlined,
    SwapOutlined,
    TableOutlined,
} from '@ant-design/icons';
import { Divider, Modal, Select, Table, Typography, Segmented } from 'antd';
import React, { useMemo, useState } from 'react';

const { Title, Text } = Typography;

interface TestConfigModalProps {
    visible: boolean;
    onClose: () => void;
    items: EditablePartRow[];
    tempPackages?: Package[];
}

// --- Helper Functions ---

const estimateFPS = (
    baseScore: number,
    gameType: 'online' | 'single',
    resolution: '1080p' | '2k' | '4k'
) => {
    if (baseScore === 0) return '0';

    let multiplier = 1;
    if (resolution === '2k') multiplier = 0.7;
    if (resolution === '4k') multiplier = 0.4;

    // Online games generally run faster
    const typeMultiplier = gameType === 'online' ? 1.5 : 0.8;

    const baseFPS = baseScore * multiplier * typeMultiplier;

    // Create a range (e.g., +/- 10%)
    const min = Math.max(10, Math.round(baseFPS * 0.9));
    const max = Math.max(10, Math.round(baseFPS * 1.1));

    if (min === max) return `${min}`;
    return `${min}-${max}`;
};

const getFPSColor = (fpsRange: string) => {
    if (!fpsRange || fpsRange === '0') return '#e2e8f0'; // Slate 200

    // Extract the minimum value from the range string "min-max" or "val"
    const minVal = parseInt(fpsRange.split('-')[0]);

    if (minVal >= 144) return '#10b981'; // Emerald 500
    if (minVal >= 60) return '#3b82f6'; // Blue 500
    if (minVal >= 30) return '#f59e0b'; // Amber 500
    return '#ef4444'; // Red 500
};

const PerformanceLegend = () => (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                电竞级 (144+)
            </span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                流畅级 (60+)
            </span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                及格级 (30+)
            </span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                吃力级 (&lt;30)
            </span>
        </div>
    </div>
);

const FpsDisplay = ({ fpsRange, label }: { fpsRange: string; label: string }) => {
    const color = getFPSColor(fpsRange);
    const minVal = fpsRange && fpsRange !== '0' ? parseInt(fpsRange.split('-')[0]) : 0;

    const getLevelLabel = (fps: number) => {
        if (fps >= 144) return '电竞级';
        if (fps >= 60) return '流畅级';
        if (fps >= 30) return '及格级';
        return '吃力级';
    };

    return (
        <div className="flex-1 min-w-[100px] group/fps">
            <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                {label}
                {minVal > 0 && (
                    <span
                        className="px-1.5 py-0.5 rounded-md text-[8px] text-white font-bold"
                        style={{ backgroundColor: color }}
                    >
                        {getLevelLabel(minVal)}
                    </span>
                )}
            </div>
            <div className="flex items-baseline gap-1">
                <div
                    className="font-mono text-xl font-black tracking-tighter transition-transform group-hover/fps:scale-110 origin-left duration-300"
                    style={{ color }}
                >
                    {fpsRange && fpsRange !== '0' ? fpsRange : '-'}
                </div>
                <span className="text-[10px] font-bold opacity-40 dark:text-white">FPS</span>
            </div>
        </div>
    );
};

export const TestConfigModal: React.FC<TestConfigModalProps> = ({
    visible,
    onClose,
    items,
    tempPackages = [],
}) => {
    const { products } = usePackageTableData();
    const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>(['current']);
    const [viewMode, setViewMode] = useState<'performance' | 'specs'>('performance');

    const allGames = useMemo(() => [...INITIAL_ONLINE_GAMES, ...INITIAL_SINGLE_GAMES], []);

    // Available configurations for comparison
    const availableConfigs = useMemo(() => {
        const configs = [
            {
                id: 'current',
                name: '当前配置',
                items: items,
            },
        ];

        tempPackages.forEach((pkg) => {
            configs.push({
                id: pkg.id.toString(),
                name: pkg.name,
                items: pkg.items.map((item) => ({
                    id: item.id.toString(),
                    category: item.product_category,
                    product_id: item.product_id,
                    quantity: item.quantity,
                })),
            });
        });

        return configs;
    }, [items, tempPackages]);

    // Calculate performance scores for each config
    const configMetrics = useMemo(() => {
        if (!products.length) return [];

        return availableConfigs.map((config) => {
            const getProduct = (category: string) => {
                const item = config.items.find((i) => i.category === category);
                if (!item || !item.product_id) return null;
                return products.find((p) => p.id === item.product_id);
            };

            const cpu = getProduct('cpu');
            const gpu = getProduct('gpu');
            const ram = getProduct('ram');

            let score = 100;
            if (cpu) {
                if (cpu.name.includes('i9') || cpu.name.includes('R9')) score += 150;
                else if (cpu.name.includes('i7') || cpu.name.includes('R7')) score += 100;
                else if (cpu.name.includes('i5') || cpu.name.includes('R5')) score += 60;
                else score += 30;
            }

            if (gpu) {
                if (gpu.name.includes('4090')) score += 400;
                else if (gpu.name.includes('4080')) score += 300;
                else if (gpu.name.includes('4070')) score += 200;
                else if (gpu.name.includes('4060')) score += 120;
                else if (gpu.name.includes('3060')) score += 80;
                else score += 40;
            }

            if (ram) {
                if (ram.name.includes('32G') || ram.name.includes('32GB')) score += 40;
                else if (ram.name.includes('16G') || ram.name.includes('16GB')) score += 20;
            }

            if (!cpu || !gpu) score = 0;

            return {
                id: config.id,
                name: config.name,
                score,
                hardware: { cpu, gpu, ram },
            };
        });
    }, [availableConfigs, products]);

    const selectedMetrics = useMemo(() => {
        return configMetrics.filter((m) => selectedConfigIds.includes(m.id));
    }, [configMetrics, selectedConfigIds]);

    const isHardwareMissing = selectedMetrics.some((m) => m.score === 0);

    const handleGameChange = (values: number[]) => {
        setSelectedGameIds(values);
    };

    const handleConfigToggle = (id: string) => {
        setSelectedConfigIds((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev; // Keep at least one
                return prev.filter((i) => i !== id);
            }
            return [...prev, id];
        });
    };

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={1100}
            centered
            className="test-config-modal-v2"
            styles={{
                content: {
                    borderRadius: '32px',
                    padding: '0',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    height: '90vh',
                    maxHeight: '950px',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                },
                body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Header Section */}
            <div className="bg-white dark:bg-[#121212] border-b border-slate-100 dark:border-white/5 p-8 shrink-0 z-20 relative">
                <div className="flex justify-between items-start mb-8 pr-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-400/10 flex items-center justify-center">
                                <ExperimentOutlined className="text-xl text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <Title
                                    level={3}
                                    className="!mb-0 !text-slate-900 dark:!text-white tracking-tight"
                                >
                                    性能实验室
                                </Title>
                                <Text type="secondary" className="text-xs font-medium opacity-60">
                                    多维度游戏帧率预测与硬件配置深度对比
                                </Text>
                            </div>
                        </div>
                    </div>
                    <PerformanceLegend />
                </div>

                {/* Config Selector */}
                <div className="mb-8">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                        选择对比方案 (支持多选)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {configMetrics.map((m) => {
                            const isSelected = selectedConfigIds.includes(m.id);
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => handleConfigToggle(m.id)}
                                    className={`group cursor-pointer relative p-4 rounded-2xl border transition-all duration-300 ${
                                        isSelected
                                            ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                            : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div
                                            className={`text-sm font-bold truncate pr-4 ${
                                                isSelected
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-slate-700 dark:text-gray-300'
                                            }`}
                                        >
                                            {m.name}
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-slate-400 dark:text-gray-500 flex items-center gap-1">
                                            <span className="font-bold opacity-50">CPU</span>
                                            <span className="truncate">
                                                {m.hardware.cpu?.name || '未配置'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 dark:text-gray-500 flex items-center gap-1">
                                            <span className="font-bold opacity-50">GPU</span>
                                            <span className="truncate">
                                                {m.hardware.gpu?.name || '未配置'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Hover Effect */}
                                    {!isSelected && (
                                        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/[0.02] transition-colors" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* View Switcher & Game Selector */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <Segmented
                        size="large"
                        value={viewMode}
                        onChange={(value) => setViewMode(value as 'performance' | 'specs')}
                        className="custom-segmented-v2 shrink-0"
                        options={[
                            {
                                label: (
                                    <div className="flex items-center gap-2 px-2">
                                        <DashboardOutlined />
                                        <span>性能看板</span>
                                    </div>
                                ),
                                value: 'performance',
                            },
                            {
                                label: (
                                    <div className="flex items-center gap-2 px-2">
                                        <TableOutlined />
                                        <span>规格矩阵</span>
                                    </div>
                                ),
                                value: 'specs',
                            },
                        ]}
                    />

                    {viewMode === 'performance' && (
                        <div className="flex-1 relative">
                            <Select
                                mode="multiple"
                                size="large"
                                allowClear
                                className="w-full custom-select-v2"
                                placeholder={
                                    isHardwareMissing
                                        ? '部分方案硬件配置不全...'
                                        : '添加游戏进行对比测试...'
                                }
                                options={allGames.map((g) => ({
                                    label: (
                                        <div className="flex items-center gap-2 py-1">
                                            <img
                                                src={g.icon}
                                                alt=""
                                                className="w-6 h-6 rounded object-cover shadow-sm"
                                            />
                                            <span className="font-medium text-slate-700 dark:text-gray-200">
                                                {g.name}
                                            </span>
                                            <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">
                                                {INITIAL_ONLINE_GAMES.some((og) => og.id === g.id)
                                                    ? '网游'
                                                    : '单机'}
                                            </span>
                                        </div>
                                    ),
                                    value: g.id,
                                }))}
                                value={selectedGameIds}
                                onChange={handleGameChange}
                                maxTagCount="responsive"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-[#0a0a0a]">
                <div className="space-y-8">
                    {viewMode === 'performance' ? (
                        selectedGameIds.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 bg-white dark:bg-[#121212] rounded-[32px] border border-dashed border-slate-200 dark:border-white/5">
                                <ExperimentOutlined className="text-4xl mb-4 opacity-20" />
                                <p className="font-medium">请选择游戏以开始性能测试</p>
                            </div>
                        ) : (
                            selectedGameIds.map((gameId) => {
                                const game = allGames.find((g) => g.id === gameId);
                                const isOnline = INITIAL_ONLINE_GAMES.some((g) => g.id === gameId);
                                if (!game) return null;

                                return (
                                    <div
                                        key={gameId}
                                        className="bg-white dark:bg-[#121212] rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden"
                                    >
                                        <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02] flex items-center gap-6">
                                            <div className="relative">
                                                <img
                                                    src={game.icon}
                                                    alt=""
                                                    className="w-14 h-14 rounded-2xl object-cover shadow-xl z-10 relative"
                                                />
                                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full -z-0" />
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                                    {game.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-widest">
                                                        {isOnline ? 'Online Game' : 'Single Player'}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-700" />
                                                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-widest">
                                                        Performance Test
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <div className="grid grid-cols-1 gap-6">
                                                {selectedMetrics.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="flex items-center gap-8 p-6 rounded-3xl bg-slate-50/50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-colors"
                                                    >
                                                        <div className="w-32 shrink-0">
                                                            <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase mb-2 tracking-widest">
                                                                方案配置
                                                            </div>
                                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate mb-1">
                                                                {m.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 dark:text-gray-500 truncate opacity-60">
                                                                {m.hardware.gpu?.name || '无显卡'}
                                                            </div>
                                                        </div>
                                                        <Divider
                                                            type="vertical"
                                                            className="h-12 border-slate-200 dark:border-white/10"
                                                        />
                                                        <div className="flex-1 flex items-center gap-8">
                                                            <FpsDisplay
                                                                label="1080P"
                                                                fpsRange={estimateFPS(
                                                                    m.score,
                                                                    isOnline ? 'online' : 'single',
                                                                    '1080p'
                                                                )}
                                                            />
                                                            <FpsDisplay
                                                                label="2K"
                                                                fpsRange={estimateFPS(
                                                                    m.score,
                                                                    isOnline ? 'online' : 'single',
                                                                    '2k'
                                                                )}
                                                            />
                                                            <FpsDisplay
                                                                label="4K"
                                                                fpsRange={estimateFPS(
                                                                    m.score,
                                                                    isOnline ? 'online' : 'single',
                                                                    '4k'
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    ) : (
                        /* Hardware Comparison Table (Specs View) */
                        <div className="bg-white dark:bg-[#121212] rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02]">
                                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <SwapOutlined className="text-blue-500" />
                                    硬件规格深度对比
                                </div>
                            </div>
                            <div className="p-0">
                                <Table
                                    pagination={false}
                                    className="custom-compare-table"
                                    columns={[
                                        {
                                            title: '硬件类别',
                                            dataIndex: 'category',
                                            key: 'category',
                                            width: 150,
                                            render: (text) => (
                                                <span className="font-bold text-slate-400 dark:text-gray-500 uppercase text-[10px] tracking-widest">
                                                    {text}
                                                </span>
                                            ),
                                        },
                                        ...selectedMetrics.map((m) => ({
                                            title: (
                                                <div className="text-blue-600 dark:text-blue-400 font-bold">
                                                    {m.name}
                                                </div>
                                            ),
                                            dataIndex: m.id,
                                            key: m.id,
                                            render: (
                                                val: { name?: string; price?: number } | null
                                            ) => (
                                                <div className="py-2">
                                                    <div className="font-medium text-slate-800 dark:text-gray-200 text-sm">
                                                        {val?.name || '-'}
                                                    </div>
                                                    {val?.price && (
                                                        <div className="text-[10px] text-blue-500 dark:text-blue-400 font-mono mt-1 font-bold">
                                                            ¥{val.price.toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            ),
                                        })),
                                    ]}
                                    dataSource={[
                                        {
                                            key: 'cpu',
                                            category: '处理器 (CPU)',
                                            ...Object.fromEntries(
                                                selectedMetrics.map((m) => [m.id, m.hardware.cpu])
                                            ),
                                        },
                                        {
                                            key: 'gpu',
                                            category: '显卡 (GPU)',
                                            ...Object.fromEntries(
                                                selectedMetrics.map((m) => [m.id, m.hardware.gpu])
                                            ),
                                        },
                                        {
                                            key: 'ram',
                                            category: '内存 (RAM)',
                                            ...Object.fromEntries(
                                                selectedMetrics.map((m) => [m.id, m.hardware.ram])
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
