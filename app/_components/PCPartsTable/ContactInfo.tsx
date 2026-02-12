'use client';

import { PhoneFilled, TikTokFilled, WechatFilled } from '@ant-design/icons';
import React from 'react';

interface ContactInfoProps {
    phone?: string;
}

export default function ContactInfo({ phone = '13137733019' }: ContactInfoProps) {
    return (
        <div className="space-y-3">
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                联系我们
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-[#1f1f1f] p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <PhoneFilled />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">服务热线</div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {phone}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <SocialButton icon={<WechatFilled />} label="微信" color="bg-green-500" />
                <SocialButton
                    icon={<TikTokFilled />}
                    label="抖音"
                    color="bg-black dark:bg-[#333]"
                />
            </div>
        </div>
    );
}

function SocialButton({
    icon,
    label,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    color: string;
}) {
    return (
        <button
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-white ${color} hover:opacity-90 transition-opacity shadow-sm`}
        >
            <span className="text-sm">{icon}</span>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}
