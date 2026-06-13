'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        // 默认重定向到商品中心页面
        router.push('/admin/dashboard/config');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
        </div>
    );
}
