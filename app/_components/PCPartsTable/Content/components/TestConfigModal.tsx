/* eslint-disable @next/next/no-img-element */
'use client';

import { Package } from '@/app/_components/PCPartsTable/PackageRecomment';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import { INITIAL_ONLINE_GAMES, INITIAL_SINGLE_GAMES } from '@/const/games';
import { DashboardOutlined, ExperimentOutlined, SwapOutlined } from '@ant-design/icons';
import { Button, Divider, Modal, Select, Table, Tag, Typography } from 'antd';
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

// --- Components ---

const FpsDisplay = ({ fpsRange, label }: { fpsRange: string; label: string }) => (
    <div className="flex-1 min-w-[80px]">
        <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            {label}
        </div>
        <div className="font-mono text-sm font-bold" style={{ color: getFPSColor(fpsRange) }}>
            {fpsRange && fpsRange !== '0' ? fpsRange : '-'}{' '}
            <span className="text-[10px] opacity-60 font-sans ml-1">FPS</span>
        </div>
    </div>
);

export const TestConfigModal: React.FC<TestConfigModalProps> = ({
    visible,
    onClose,
    items,
    tempPackages = [],
}) => {
    const { products } = usePackageTableData();
    const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>(['current']);
    const [viewMode, setViewMode] = useState<'performance' | 'hardware'>('performance');

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
            width={1000}
            centered
            className="test-config-modal-v2"
            styles={{
                content: {
                    borderRadius: '24px',
                    padding: '0',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    height: '85vh',
                    maxHeight: '900px',
                    display: 'flex',
                    flexDirection: 'column',
                },
                body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header Section */}
            <div className="bg-white dark:bg-[#1f1f1f] border-b border-slate-100 dark:border-gray-800 p-6 shrink-0 z-20 relative">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Title level={4} className="!mb-1 flex items-center gap-2">
                            <ExperimentOutlined className="text-blue-600 dark:text-blue-400" />
                            性能实验室 & 方案对比
                        </Title>
                        <Text type="secondary" className="text-xs">
                            多维度游戏帧率预测与硬件配置深度对比
                        </Text>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type={viewMode === 'performance' ? 'primary' : 'default'}
                            icon={<DashboardOutlined />}
                            onClick={() => setViewMode('performance')}
                            className="rounded-lg"
                        >
                            性能对比
                        </Button>
                        <Button
                            type={viewMode === 'hardware' ? 'primary' : 'default'}
                            icon={<SwapOutlined />}
                            onClick={() => setViewMode('hardware')}
                            className="rounded-lg"
                        >
                            硬件对比
                        </Button>
                    </div>
                </div>

                {/* Config Selector */}
                <div className="mb-6">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        选择对比方案 (最多支持多选)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {configMetrics.map((m) => (
                            <Tag.CheckableTag
                                key={m.id}
                                checked={selectedConfigIds.includes(m.id)}
                                onChange={() => handleConfigToggle(m.id)}
                                className={`px-4 py-1.5 rounded-lg border transition-all ${
                                    selectedConfigIds.includes(m.id)
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                                        : 'bg-slate-50 dark:bg-[#2a2a2a] border-slate-100 dark:border-gray-700 text-slate-500 dark:text-gray-400'
                                }`}
                            >
                                {m.name}
                            </Tag.CheckableTag>
                        ))}
                    </div>
                </div>

                {viewMode === 'performance' && (
                    <div className="relative">
                        <Select
                            mode="multiple"
                            size="large"
                            className="w-full"
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

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#141414]">
                {viewMode === 'performance' ? (
                    <div className="space-y-6">
                        {selectedGameIds.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 bg-white dark:bg-[#1f1f1f] rounded-3xl border border-dashed border-slate-200 dark:border-gray-800">
                                <ExperimentOutlined className="text-4xl mb-4 opacity-20" />
                                <p>请选择游戏以开始性能测试</p>
                            </div>
                        ) : (
                            selectedGameIds.map((gameId) => {
                                const game = allGames.find((g) => g.id === gameId);
                                const isOnline = INITIAL_ONLINE_GAMES.some((g) => g.id === gameId);
                                if (!game) return null;

                                return (
                                    <div
                                        key={gameId}
                                        className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden"
                                    >
                                        <div className="px-6 py-4 border-b border-slate-50 dark:border-gray-800 bg-slate-50/30 dark:bg-[#2a2a2a]/30 flex items-center gap-4">
                                            <img
                                                src={game.icon}
                                                alt=""
                                                className="w-10 h-10 rounded-xl object-cover shadow-md"
                                            />
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-gray-200">
                                                    {game.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-widest">
                                                    {isOnline ? 'Online Game' : 'Single Player'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-1 gap-4">
                                                {selectedMetrics.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50/50 dark:bg-[#2a2a2a]/50 border border-slate-100 dark:border-gray-700"
                                                    >
                                                        <div className="w-24 shrink-0">
                                                            <div className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase mb-1">
                                                                方案
                                                            </div>
                                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate">
                                                                {m.name}
                                                            </div>
                                                        </div>
                                                        <Divider type="vertical" className="h-8" />
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
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <Table
                            pagination={false}
                            columns={[
                                {
                                    title: '硬件类别',
                                    dataIndex: 'category',
                                    key: 'category',
                                    width: 120,
                                    render: (text) => (
                                        <span className="font-bold text-slate-500 dark:text-gray-400">
                                            {text}
                                        </span>
                                    ),
                                },
                                ...selectedMetrics.map((m) => ({
                                    title: m.name,
                                    dataIndex: m.id,
                                    key: m.id,
                                    render: (val: { name?: string; price?: number } | null) => (
                                        <div className="py-2">
                                            <div className="font-medium text-slate-800 dark:text-gray-200">
                                                {val?.name || '-'}
                                            </div>
                                            {val?.price && (
                                                <div className="text-xs text-blue-500 dark:text-blue-400 font-mono mt-1">
                                                    ¥{val.price}
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
                )}
            </div>
        </Modal>
    );
};
