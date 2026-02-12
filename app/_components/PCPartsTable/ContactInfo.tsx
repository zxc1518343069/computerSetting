'use client';

import { PhoneFilled, TikTokFilled, WechatFilled } from '@ant-design/icons';
import React from 'react';

interface ContactInfoProps {
    phone?: string;
}

export default function ContactInfo({ phone = '13137733019' }: ContactInfoProps) {
    return (
        <div className="space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                联系我们
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <PhoneFilled />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400">服务热线</div>
                        <div className="text-sm font-bold text-gray-800">{phone}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <SocialButton icon={<WechatFilled />} label="微信" color="bg-green-500" />
                <SocialButton icon={<TikTokFilled />} label="抖音" color="bg-black" />
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
