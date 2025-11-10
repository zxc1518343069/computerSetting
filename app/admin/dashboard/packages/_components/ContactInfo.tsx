'use client';

import React from 'react';

interface ContactInfoProps {
    phone?: string;
}

export default function ContactInfo({ phone = '138-0000-0000' }: ContactInfoProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                </svg>
                联系方式
            </h3>

            {/* 手机号 */}
            <div className="mb-6">
                <div className="text-sm font-medium text-gray-600 mb-2">手机号码</div>
                <div className="flex items-center bg-blue-50 rounded-lg p-4">
                    <svg
                        className="w-6 h-6 text-blue-600 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                    </svg>
                    <span className="text-xl font-bold text-gray-900">{phone}</span>
                </div>
            </div>

            {/* 抖音二维码 */}
            <div className="mb-6">
                <div className="text-sm font-medium text-gray-600 mb-2">抖音二维码</div>
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 text-center">
                    <div className="bg-white rounded-lg p-3 inline-block shadow-sm mb-3">
                        <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                            {/* 二维码占位符 */}
                            <svg
                                className="w-24 h-24 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        关注抖音了解更多硬件资讯
                    </p>
                </div>
            </div>

            {/* 微信二维码 */}
            <div>
                <div className="text-sm font-medium text-gray-600 mb-2">微信二维码</div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center">
                    <div className="bg-white rounded-lg p-3 inline-block shadow-sm mb-3">
                        <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                            {/* 二维码占位符 */}
                            <svg
                                className="w-24 h-24 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                />
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">扫码添加微信咨询</p>
                </div>
            </div>
        </div>
    );
}
