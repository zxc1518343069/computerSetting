import { error, success } from '@/lib/request/apiResponse';
import { getDb } from '@/lib/db';
import { signAdminCookie } from '@/lib/auth/currentUser';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

interface AdminUserRow {
    id: number;
    username: string;
    password_hash: string;
    role: 'admin' | 'staff';
    status: 'active' | 'disabled';
}

function isHttpsRequest(request: NextRequest) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return request.nextUrl.protocol === 'https:' || forwardedProto === 'https';
}

export async function POST(request: NextRequest) {
    try {
        const { username, password, remember } = await request.json();
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername || !password) {
            return error(400, '账号和密码不能为空');
        }

        const db = getDb();
        const user = db
            .prepare('SELECT * FROM admin_users WHERE username = ?')
            .get(normalizedUsername) as AdminUserRow | undefined;

        if (user && user.status === 'active' && bcrypt.compareSync(password, user.password_hash)) {
            const cookieStore = await cookies();
            const secureCookie = isHttpsRequest(request);
            const maxAge = remember ? 60 * 60 * 24 * 7 : undefined;
            const sessionValue = signAdminCookie({
                id: user.id,
                username: user.username,
                role: user.role,
            });

            db.prepare('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(
                user.id
            );

            cookieStore.set('admin_session', sessionValue, {
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax',
                path: '/',
                maxAge,
            });

            cookieStore.set('is_admin', 'true', {
                httpOnly: false,
                secure: secureCookie,
                sameSite: 'lax',
                path: '/',
                maxAge,
            });

            cookieStore.set('admin_role', user.role, {
                httpOnly: false,
                secure: secureCookie,
                sameSite: 'lax',
                path: '/',
                maxAge,
            });

            return success(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
                '登录成功'
            );
        }

        return error(401, '账号或密码错误');
    } catch (e) {
        console.error('Login error:', e);
        return error(500, '服务器内部错误');
    }
}
