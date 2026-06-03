import { isAuthError, requireSuperAdmin } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

interface AdminUserRow {
    id: number;
    username: string;
    role: 'admin' | 'staff';
    status: 'active' | 'disabled';
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

const serializeAdminUser = (row: AdminUserRow) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

const isUsernameConflict = (e: unknown) =>
    e instanceof Error && e.message.includes('UNIQUE constraint failed: admin_users.username');

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const role = searchParams.get('role');
        const status = searchParams.get('status');

        const conditions: string[] = [];
        const params: Record<string, string> = {};

        if (search) {
            conditions.push('username LIKE @search');
            params.search = `%${search}%`;
        }

        if (role === 'admin' || role === 'staff') {
            conditions.push('role = @role');
            params.role = role;
        }

        if (status === 'active' || status === 'disabled') {
            conditions.push('status = @status');
            params.status = status;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = db
            .prepare(
                `
                SELECT id, username, role, status, last_login_at, created_at, updated_at
                FROM admin_users
                ${where}
                ORDER BY role ASC, created_at DESC
            `
            )
            .all(params) as AdminUserRow[];

        return success(rows.map(serializeAdminUser), '获取账号列表成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get admin users error:', e);
        return error(500, '获取账号列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const db = getDb();
        const { username, password, role = 'staff', status = 'active' } = await request.json();
        const normalizedUsername = String(username || '').trim();

        if (!normalizedUsername) return error(400, '账号不能为空');
        if (!password || String(password).length < 6) return error(400, '密码至少需要 6 位');
        if (role !== 'admin' && role !== 'staff') return error(400, '账号角色不正确');
        if (status !== 'active' && status !== 'disabled') return error(400, '账号状态不正确');

        const result = db
            .prepare(
                `
                INSERT INTO admin_users (username, password_hash, role, status, updated_at)
                VALUES (@username, @password_hash, @role, @status, CURRENT_TIMESTAMP)
            `
            )
            .run({
                username: normalizedUsername,
                password_hash: bcrypt.hashSync(String(password), 10),
                role,
                status,
            });

        const row = db
            .prepare(
                `
                SELECT id, username, role, status, last_login_at, created_at, updated_at
                FROM admin_users
                WHERE id = ?
            `
            )
            .get(result.lastInsertRowid) as AdminUserRow;

        return success(serializeAdminUser(row), '账号创建成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isUsernameConflict(e)) return error(400, '账号已存在');
        console.error('Create admin user error:', e);
        return error(500, '账号创建失败');
    }
}

