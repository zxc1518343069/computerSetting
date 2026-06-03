import { isAuthError, requireSuperAdmin } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

interface Params {
    params: Promise<{ id: string }>;
}

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

const getActiveAdminCount = () => {
    const db = getDb();
    const row = db
        .prepare("SELECT COUNT(*) AS count FROM admin_users WHERE role = 'admin' AND status = 'active'")
        .get() as { count: number };
    return row.count;
};

const wouldRemoveLastActiveAdmin = (current: AdminUserRow, nextRole: string, nextStatus: string) => {
    if (current.role !== 'admin' || current.status !== 'active') return false;
    if (nextRole === 'admin' && nextStatus === 'active') return false;
    return getActiveAdminCount() <= 1;
};

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireSuperAdmin();

        const { id: rawId } = await params;
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) return error(400, '账号 ID 不正确');

        const db = getDb();
        const current = db
            .prepare(
                `
                SELECT id, username, role, status, last_login_at, created_at, updated_at
                FROM admin_users
                WHERE id = ?
            `
            )
            .get(id) as AdminUserRow | undefined;

        if (!current) return error(404, '账号不存在');

        const body = await request.json();
        const username = String(body.username ?? current.username).trim();
        const role = body.role ?? current.role;
        const status = body.status ?? current.status;
        const password = body.password ? String(body.password) : '';

        if (!username) return error(400, '账号不能为空');
        if (role !== 'admin' && role !== 'staff') return error(400, '账号角色不正确');
        if (status !== 'active' && status !== 'disabled') return error(400, '账号状态不正确');
        if (password && password.length < 6) return error(400, '密码至少需要 6 位');
        if (wouldRemoveLastActiveAdmin(current, role, status)) {
            return error(400, '至少需要保留一个启用中的超级管理员');
        }

        const update = db.transaction(() => {
            if (password) {
                db.prepare(
                    `
                    UPDATE admin_users
                    SET username = @username,
                        password_hash = @password_hash,
                        role = @role,
                        status = @status,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                ).run({
                    id,
                    username,
                    password_hash: bcrypt.hashSync(password, 10),
                    role,
                    status,
                });
            } else {
                db.prepare(
                    `
                    UPDATE admin_users
                    SET username = @username,
                        role = @role,
                        status = @status,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @id
                `
                ).run({ id, username, role, status });
            }

            return db
                .prepare(
                    `
                    SELECT id, username, role, status, last_login_at, created_at, updated_at
                    FROM admin_users
                    WHERE id = ?
                `
                )
                .get(id) as AdminUserRow;
        });

        return success(serializeAdminUser(update()), '账号更新成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        if (isUsernameConflict(e)) return error(400, '账号已存在');
        console.error('Update admin user error:', e);
        return error(500, '账号更新失败');
    }
}

