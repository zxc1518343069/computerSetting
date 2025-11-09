import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
        }

        // 查询用户
        const result = await pool.query(
            'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
        }

        const user = result.rows[0];

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
        }

        // 登录成功
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
    }
}
