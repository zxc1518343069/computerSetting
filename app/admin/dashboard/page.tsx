'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        // 默认重定向到溢价控制页面
        router.push('/admin/dashboard/pricing');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
        </div>
    );
}
