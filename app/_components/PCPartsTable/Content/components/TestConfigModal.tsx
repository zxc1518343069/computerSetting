'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Select, Typography, Button } from 'antd';
import {
    ExperimentOutlined,
    DashboardOutlined,
    WarningFilled,
    ThunderboltFilled,
    PlusOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { INITIAL_ONLINE_GAMES, INITIAL_SINGLE_GAMES } from '@/const/games';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { EditablePartRow } from '@/app/admin/dashboard/packages/types';

const { Title, Text } = Typography;

interface TestConfigModalProps {
    visible: boolean;
    onClose: () => void;
    items: EditablePartRow[];
}

interface GameTestResult {
    gameId: number;
    fps1080p: string;
    fps2k: string;
    fps4k: string;
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

const HardwareBadge = ({
    label,
    value,
    missing,
}: {
    label: string;
    value?: string;
    missing?: boolean;
}) => (
    <div
        className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300
        ${
            missing
                ? 'bg-red-50 border-red-100 text-red-600'
                : 'bg-white border-slate-100 text-slate-700 shadow-sm'
        }
    `}
    >
        <div
            className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0
            ${missing ? 'bg-red-100' : 'bg-slate-100 text-slate-500'}
        `}
        >
            {missing ? <WarningFilled /> : <ThunderboltFilled />}
        </div>
        <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">
                {label}
            </div>
            <div
                className="text-sm font-medium truncate max-w-[120px] md:max-w-[180px]"
                title={value}
            >
                {value || '未选择'}
            </div>
        </div>
    </div>
);

const FpsDisplay = ({ fpsRange, label }: { fpsRange: string; label: string }) => (
    <div className="flex-1 min-w-[80px]">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {label}
        </div>
        <div className="font-mono text-sm font-bold" style={{ color: getFPSColor(fpsRange) }}>
            {fpsRange && fpsRange !== '0' ? fpsRange : '-'} <span className="text-[10px] opacity-60 font-sans ml-1">FPS</span>
        </div>
    </div>
);

export const TestConfigModal: React.FC<TestConfigModalProps> = ({ visible, onClose, items }) => {
    const { products } = usePackageTableData();
    const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
    const [testResults, setTestResults] = useState<GameTestResult[]>([]);

    const allGames = useMemo(() => [...INITIAL_ONLINE_GAMES, ...INITIAL_SINGLE_GAMES], []);

    // Extract core components
    const coreComponents = useMemo(() => {
        if (!products.length) return null;

        const getProduct = (category: string) => {
            const item = items.find((i) => i.category === category);
            if (!item || !item.product_id) return null;
            return products.find((p) => p.id === item.product_id);
        };

        return {
            cpu: getProduct('cpu'),
            gpu: getProduct('gpu'),
            ram: getProduct('ram'),
        };
    }, [items, products]);

    const isHardwareMissing = !coreComponents?.cpu || !coreComponents?.gpu;

    // Calculate a mock "performance score"
    const performanceScore = useMemo(() => {
        if (!coreComponents) return 0;
        let score = 100; // Base score

        const { cpu, gpu, ram } = coreComponents;

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

        // If missing critical components, score is 0
        if (!cpu || !gpu) return 0;

        return score;
    }, [coreComponents]);

    // Update results when selected games change
    useEffect(() => {
        const newResults = selectedGameIds.map((gameId) => {
            const isOnline = INITIAL_ONLINE_GAMES.some((g) => g.id === gameId);
            return {
                gameId,
                fps1080p: estimateFPS(performanceScore, isOnline ? 'online' : 'single', '1080p'),
                fps2k: estimateFPS(performanceScore, isOnline ? 'online' : 'single', '2k'),
                fps4k: estimateFPS(performanceScore, isOnline ? 'online' : 'single', '4k'),
            };
        });
        setTestResults(newResults);
    }, [selectedGameIds, performanceScore]);

    const handleGameChange = (values: number[]) => {
        setSelectedGameIds(values);
    };

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            className="test-config-modal-v2"
            styles={{
                content: {
                    borderRadius: '24px',
                    padding: '0',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    height: '80vh',
                    maxHeight: '800px',
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
            <div className="bg-white border-b border-slate-100 p-6 shrink-0 z-20 relative">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Title level={4} className="!mb-1 flex items-center gap-2">
                            <ExperimentOutlined className="text-blue-600" />
                            性能实验室
                        </Title>
                        <Text type="secondary" className="text-xs">
                            多维度游戏帧率预测与硬件评估
                        </Text>
                    </div>
                    <div className="flex gap-2">
                        {/* Legend */}
                        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 144+
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 60+
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 30+
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hardware Status Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <HardwareBadge
                        label="CPU 处理器"
                        value={coreComponents?.cpu?.name}
                        missing={!coreComponents?.cpu}
                    />
                    <HardwareBadge
                        label="GPU 显卡"
                        value={coreComponents?.gpu?.name}
                        missing={!coreComponents?.gpu}
                    />
                    <HardwareBadge
                        label="RAM 内存"
                        value={coreComponents?.ram?.name}
                        missing={!coreComponents?.ram}
                    />
                </div>

                {/* Game Selector */}
                <div className="relative">
                    <Select
                        mode="multiple"
                        size="large"
                        className="w-full"
                        placeholder={
                            isHardwareMissing ? '请先完善硬件配置...' : '添加游戏进行对比测试...'
                        }
                        options={allGames.map((g) => ({
                            label: (
                                <div className="flex items-center gap-2 py-1">
                                    <img
                                        src={g.icon}
                                        alt=""
                                        className="w-6 h-6 rounded object-cover shadow-sm"
                                    />
                                    <span className="font-medium text-slate-700">{g.name}</span>
                                    <span className="text-xs text-slate-400 ml-auto">
                                        {INITIAL_ONLINE_GAMES.some((og) => og.id === g.id)
                                            ? '网游'
                                            : '单机'}
                                    </span>
                                </div>
                            ),
                            value: g.id,
                        }))}
                        onChange={handleGameChange}
                        value={selectedGameIds}
                        maxTagCount="responsive"
                        style={{ width: '100%' }}
                        dropdownStyle={{
                            borderRadius: '16px',
                            padding: '8px',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                        }}
                        suffixIcon={<PlusOutlined className="text-slate-400" />}
                        // We allow selection even if hardware is missing, to let user explore
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-slate-50/50 overflow-y-auto p-6 relative scroll-smooth">
                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-blue-50/80 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

                {isHardwareMissing && selectedGameIds.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-fade-in">
                        <WarningFilled className="text-red-500 mt-0.5 text-lg" />
                        <div>
                            <h4 className="text-sm font-bold text-red-700 mb-0.5">
                                无法进行性能评估
                            </h4>
                            <p className="text-xs text-red-600/80">
                                请在配置单中选择 CPU 和 显卡。缺少核心硬件数据，无法计算游戏帧率。
                            </p>
                        </div>
                    </div>
                )}

                {selectedGameIds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 min-h-[300px]">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                            <DashboardOutlined style={{ fontSize: '40px' }} />
                        </div>
                        <Title level={5} className="text-slate-500 !mb-1">
                            开始您的测试
                        </Title>
                        <Text type="secondary" className="text-xs">
                            在上方添加游戏，横向对比不同分辨率下的性能表现
                        </Text>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Table Header (Visual only) */}
                        <div className="hidden md:flex px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="w-[35%]">游戏项目</div>
                            <div className="flex-1 px-2">1080P FHD</div>
                            <div className="flex-1 px-2">2K QHD</div>
                            <div className="flex-1 px-2">4K UHD</div>
                            <div className="w-8"></div>
                        </div>

                        {/* Game Rows */}
                        {testResults.map((result) => {
                            const game = allGames.find((g) => g.id === result.gameId);
                            if (!game) return null;

                            return (
                                <div
                                    key={result.gameId}
                                    className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 p-4 md:p-0 md:h-20 flex flex-col md:flex-row md:items-center overflow-hidden"
                                >
                                    {/* Game Info Column */}
                                    <div className="md:w-[35%] md:h-full md:border-r border-slate-50 p-4 flex items-center gap-4 bg-slate-50/30 group-hover:bg-white transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 shadow-inner relative group-hover:scale-105 transition-transform">
                                            <img
                                                src={game.icon}
                                                alt={game.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate leading-tight mb-0.5">
                                                {game.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${INITIAL_ONLINE_GAMES.some((g) => g.id === game.id) ? 'bg-blue-400' : 'bg-purple-400'}`}
                                                />
                                                {INITIAL_ONLINE_GAMES.some((g) => g.id === game.id)
                                                    ? '多人竞技'
                                                    : '3A大作'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* FPS Columns */}
                                    <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-0 p-4 md:p-0">
                                        <div className="flex-1 md:px-6 md:border-r border-slate-50 md:flex md:items-center">
                                            <FpsDisplay fpsRange={result.fps1080p} label="1080P" />
                                        </div>
                                        <div className="flex-1 md:px-6 md:border-r border-slate-50 md:flex md:items-center">
                                            <FpsDisplay fpsRange={result.fps2k} label="2K" />
                                        </div>
                                        <div className="flex-1 md:px-6 md:flex md:items-center">
                                            <FpsDisplay fpsRange={result.fps4k} label="4K" />
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="hidden md:flex w-12 h-full items-center justify-center border-l border-slate-50 bg-slate-50/30 group-hover:bg-white transition-colors">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={
                                                <DeleteOutlined className="text-slate-300 group-hover:text-red-400 transition-colors" />
                                            }
                                            onClick={() =>
                                                handleGameChange(
                                                    selectedGameIds.filter(
                                                        (id) => id !== result.gameId
                                                    )
                                                )
                                            }
                                        />
                                    </div>

                                    {/* Mobile Delete Button (visible only on small screens) */}
                                    <div className="md:hidden mt-2 pt-2 border-t border-slate-50 flex justify-end">
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() =>
                                                handleGameChange(
                                                    selectedGameIds.filter(
                                                        (id) => id !== result.gameId
                                                    )
                                                )
                                            }
                                        >
                                            移除
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Note */}
            <div className="bg-white border-t border-slate-100 p-3 text-center">
                <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                    <InfoCircleOutlined />
                    <span>
                        数据基于硬件规格理论估算，仅供参考。实际帧率受驱动、散热及场景复杂度影响。
                    </span>
                </div>
            </div>
        </Modal>
    );
};
