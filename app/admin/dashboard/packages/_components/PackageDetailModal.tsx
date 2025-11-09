'use client';
import React from 'react';
import PackageItemsTable, { PackageItem } from './PackageItemsTable';

interface PackageData {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}

interface PackageDetailModalProps {
    package: PackageData | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function PackageDetailModal({
    package: pkg,
    isOpen,
    onClose,
}: PackageDetailModalProps) {
    if (!isOpen || !pkg) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">{pkg.name}</h2>
                            {pkg.description && (
                                <p className="text-blue-100 mt-1">{pkg.description}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <PackageItemsTable items={pkg.items || []} />
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            共 {pkg.items?.length || 0} 个配件
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">套餐总价</div>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                ${parseFloat(pkg.total_price?.toString() || '0').toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
