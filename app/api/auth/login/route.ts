import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        // 初始阶段：硬编码校验逻辑
        if (username === 'yangshuhao' && password === 'wangman') {
            return success(
                {
                    username,
                    // 未来可以在这里返回 token 或用户信息
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
