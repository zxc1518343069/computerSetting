import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get('admin_session');

    // 1. 访问登录页 (/admin)
    if (pathname === '/admin') {
        if (session) {
            // 已登录，直接重定向到仪表盘
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // 2. 访问受保护的仪表盘路由 (/admin/dashboard/:path*)
    if (pathname.startsWith('/admin/dashboard')) {
        if (!session) {
            // 未登录，重定向到登录页
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        return NextResponse.next();
    }

    // 3. API 权限校验
    if (pathname.startsWith('/api')) {
        // 排除登录/退出接口
        if (pathname.startsWith('/api/auth')) {
            return NextResponse.next();
        }

        if (pathname === '/api/after-sales/checkout') {
            return NextResponse.next();
        }

        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
        const isSensitiveRead =
            request.method === 'GET' &&
            (pathname === '/api/pricing' || pathname === '/api/data-exchange');

        if ((isWriteOperation || isSensitiveRead) && !session) {
            return new NextResponse(
                JSON.stringify({ code: 401, message: '未授权访问，请先登录' }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            );
        }
    }

    return NextResponse.next();
}

// 匹配管理后台路由和所有 API 路由
export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
};
