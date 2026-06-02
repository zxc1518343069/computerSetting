import { error, success } from '@/lib/request/apiResponse';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

function isHttpsRequest(request: NextRequest) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return request.nextUrl.protocol === 'https:' || forwardedProto === 'https';
}

export async function POST(request: NextRequest) {
    try {
        const { username, password, remember } = await request.json();

        // 初始阶段：硬编码校验逻辑
        if (username === 'yangshuhao' && password === 'wangman') {
            const cookieStore = await cookies();
            const secureCookie = isHttpsRequest(request);

            // 设置会话 Cookie
            cookieStore.set('admin_session', 'true', {
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax',
                path: '/',
                maxAge: remember ? 60 * 60 * 24 * 7 : undefined, // 7天或会话级
            });

            // 设置 JS 可读的暗示 Cookie (非敏感)
            cookieStore.set('is_admin', 'true', {
                httpOnly: false, // JS 可读
                secure: secureCookie,
                sameSite: 'lax',
                path: '/',
                maxAge: remember ? 60 * 60 * 24 * 7 : undefined,
            });

            return success(
                {
                    username,
                },
                '登录成功'
            );
        } else {
            return error(401, '账号或密码错误');
        }
    } catch (e) {
        console.error('Login error:', e);
        return error(500, '服务器内部错误');
    }
}
