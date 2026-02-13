'use client';

import React, { useState, useEffect } from 'react';
import SiteHeader from '@/app/_components/SiteHeader';
import { ThunderboltFilled, CheckOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';

interface PricingPlan {
    id: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: { text: string; included: boolean }[];
    themeColor: string;
    glowColor: string;
    isPopular?: boolean;
    isComingSoon?: boolean;
    buttonText: string;
}

const SUBSCRIPTION_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: '免费版',
        price: '¥0',
        period: '/ 永久',
        description: '适合个人装机爱好者',
        themeColor: 'from-slate-400 to-slate-600',
        glowColor: 'rgba(148, 163, 184, 0.3)',
        buttonText: '立即开始',
        features: [
            { text: '最多 10 条配置单', included: true },
            { text: '最多 1 个套餐方案', included: true },
            { text: '基础报价计算', included: true },
            { text: '社区支持', included: true },
            { text: '全功能解锁', included: false },
            { text: '专属顾问', included: false },
        ],
    },
    {
        id: 'monthly',
        name: '月付版',
        price: '¥50',
        period: '/ 月',
        description: '适合小型工作室',
        themeColor: 'from-blue-500 to-cyan-500',
        glowColor: 'rgba(59, 130, 246, 0.4)',
        buttonText: '立即订阅',
        features: [
            { text: '无限制配置单', included: true },
            { text: '无限制套餐方案', included: true },
            { text: '全功能解锁', included: true },
            { text: '优先响应支持', included: true },
            { text: '专属顾问', included: false },
        ],
    },
    {
        id: 'yearly',
        name: '年付版',
        price: '¥500',
        period: '/ 年',
        description: '专业装机商首选',
        themeColor: 'from-purple-600 to-pink-600',
        glowColor: 'rgba(168, 85, 247, 0.5)',
        isPopular: true,
        buttonText: '立即订阅',
        features: [
            { text: '无限制配置单', included: true },
            { text: '无限制套餐方案', included: true },
            { text: '全功能解锁', included: true },
            { text: '专属顾问 1对1', included: true },
            { text: '优先功能体验', included: true },
        ],
    },
];

const LIFETIME_PLANS: PricingPlan[] = [
    {
        id: 'lifetime',
        name: '买断制',
        price: '???',
        period: '',
        description: '极客与长期用户的终极选择',
        themeColor: 'from-emerald-500 to-teal-500',
        glowColor: 'rgba(16, 185, 129, 0.3)',
        isComingSoon: true,
        buttonText: '敬请期待',
        features: [
            { text: '终身无限制使用', included: true },
            { text: '所有未来更新', included: true },
            { text: '全功能解锁', included: true },
            { text: '专属顾问 1对1', included: true },
            { text: '离线导出增强', included: true },
            { text: '专属定制水印', included: true },
        ],
    },
];

const PricingCard = ({ plan }: { plan: PricingPlan }) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 25;
        const rotateY = (centerX - x) / 25;
        setRotate({ x: rotateX, y: rotateY });
    };

    return (
        <div
            className="relative group perspective-1000 h-full w-full max-w-[360px] mx-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                setRotate({ x: 0, y: 0 });
                setIsHovered(false);
            }}
            onMouseEnter={() => setIsHovered(true)}
            style={{
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transition: isHovered ? 'none' : 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
            }}
        >
            {/* Floating Glow */}
            <div
                className="absolute -inset-4 rounded-[2.5rem] blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                style={{ backgroundColor: plan.glowColor }}
            />

            {/* Card Body */}
            <div
                className={`
                relative h-full w-full rounded-[2rem] p-8 flex flex-col
                bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl
                border border-white/20 dark:border-white/10
                shadow-xl group-hover:shadow-2xl transition-all duration-500 overflow-hidden
            `}
            >
                {/* Animated Border */}
                {!plan.isComingSoon && plan.id !== 'free' && (
                    <div className="absolute inset-0 p-[1.5px] rounded-[2rem] overflow-hidden pointer-events-none">
                        <div
                            className={`
                            absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_150deg,var(--tw-gradient-from)_180deg,var(--tw-gradient-to)_210deg,transparent_240deg)]
                            animate-[spin_6s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-700
                        `}
                            style={
                                {
                                    '--tw-gradient-from':
                                        plan.id === 'monthly' ? '#3b82f6' : '#a855f7',
                                    '--tw-gradient-to':
                                        plan.id === 'monthly' ? '#06b6d4' : '#ec4899',
                                } as React.CSSProperties
                            }
                        />
                    </div>
                )}

                {/* Popular Badge */}
                {plan.isPopular && (
                    <div className="absolute top-6 right-6">
                        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                            Popular
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="relative z-10">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                        {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-4">
                        <span
                            className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br ${plan.themeColor}`}
                        >
                            {plan.price}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">
                            {plan.period}
                        </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed mb-6">
                        {plan.description}
                    </p>
                </div>

                {/* Feature List */}
                <div className="relative z-10 flex-grow space-y-4">
                    {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div
                                className={`
                                w-5 h-5 rounded-full flex items-center justify-center
                                ${feature.included ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'}
                            `}
                            >
                                {feature.included ? (
                                    <CheckOutlined style={{ fontSize: 10 }} />
                                ) : (
                                    <LockOutlined style={{ fontSize: 10 }} />
                                )}
                            </div>
                            <span
                                className={`text-xs font-bold ${feature.included ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}
                            >
                                {feature.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="relative z-10 mt-6">
                    <Button
                        type="primary"
                        size="large"
                        disabled={plan.isComingSoon}
                        className={`
                            w-full h-12 rounded-xl font-black text-sm border-none shadow-lg
                            ${
                                plan.isComingSoon
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                    : `bg-gradient-to-r ${plan.themeColor} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`
                            }
                        `}
                    >
                        {plan.buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default function PricingPage() {
    const [mounted, setMounted] = useState(false);
    const [pricingType, setPricingType] = useState<'subscription' | 'lifetime'>('subscription');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-1000 relative overflow-hidden flex flex-col">
            {/* Fluid Gradient Mesh Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className={`
                    absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-40 transition-all duration-1000
                    ${pricingType === 'subscription' ? 'bg-blue-400 animate-blob' : 'bg-emerald-400 animate-blob'}
                `}
                />
                <div
                    className={`
                    absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-30 transition-all duration-1000
                    ${pricingType === 'subscription' ? 'bg-purple-400 animate-blob animation-delay-2000' : 'bg-teal-400 animate-blob animation-delay-2000'}
                `}
                />
                <div className="absolute inset-0 opacity-[0.4] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </div>

            <SiteHeader />

            <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-8">
                {/* Hero Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 mb-4 animate-in fade-in zoom-in duration-1000">
                        <ThunderboltFilled className="text-blue-500" />
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.3em]">
                            Next-Gen PC Builder Platform
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter leading-tight animate-in fade-in slide-in-from-top-10 duration-1000">
                        释放您的{' '}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                            无限创造力
                        </span>
                    </h1>

                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed mb-8 animate-in fade-in duration-1000 delay-300">
                        从个人爱好者到专业装机商，我们提供最先进的工具集，助您打造完美的硬件配置方案。
                    </p>

                    {/* Pricing Type Toggle */}
                    <div className="flex justify-center animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="p-1.5 bg-white/30 dark:bg-white/5 backdrop-blur-xl rounded-2xl flex items-center gap-1.5 border border-white/40 dark:border-white/10 shadow-xl shadow-black/5">
                            <button
                                onClick={() => setPricingType('subscription')}
                                className={`
                                    px-8 py-2.5 rounded-xl text-xs font-black transition-all duration-500 cursor-pointer
                                    ${
                                        pricingType === 'subscription'
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-lg scale-105'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                订阅制
                            </button>
                            <button
                                onClick={() => setPricingType('lifetime')}
                                className={`
                                    px-8 py-2.5 rounded-xl text-xs font-black transition-all duration-500 cursor-pointer
                                    ${
                                        pricingType === 'lifetime'
                                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-white shadow-lg scale-105'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                买断制
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="flex justify-center gap-8 w-full max-w-6xl h-[520px]">
                    {(pricingType === 'subscription' ? SUBSCRIPTION_PLANS : LIFETIME_PLANS).map(
                        (plan, index) => (
                            <div
                                key={plan.id}
                                className="flex-1 max-w-[360px] animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both"
                                style={{ animationDelay: `${index * 200}ms` }}
                            >
                                <PricingCard plan={plan} />
                            </div>
                        )
                    )}
                </div>
            </main>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }

                @keyframes blob {
                    0% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(20px, -30px) scale(1.05);
                    }
                    66% {
                        transform: translate(-15px, 15px) scale(0.95);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                }

                .animate-blob {
                    animation: blob 10s infinite alternate ease-in-out;
                }

                .animation-delay-2000 {
                    animation-delay: 2s;
                }

                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                .animate-in {
                    animation-duration: 1s;
                    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                }

                .fade-in {
                    animation-name: fadeIn;
                }
                .zoom-in {
                    animation-name: zoomIn;
                }
                .slide-in-from-top-10 {
                    animation-name: slideInFromTop;
                }
                .slide-in-from-bottom-12 {
                    animation-name: slideInFromBottom;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes zoomIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes slideInFromTop {
                    from {
                        transform: translateY(-2rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideInFromBottom {
                    from {
                        transform: translateY(2.5rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
