import { isAuthError, requireAdminUser } from '@/lib/auth/currentUser';
import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';

interface ActiveAdminUserRow {
    id: number;
    username: string;
    role: 'admin' | 'staff';
}

const serializeActiveAdminUser = (row: ActiveAdminUserRow) => ({
    id: row.id,
    username: row.username,
    role: row.role,
});

export async function GET() {
    try {
        await requireAdminUser();

        const db = getDb();
        const rows = db
            .prepare(
                `
                SELECT id, username, role
                FROM admin_users
                WHERE status = 'active'
                ORDER BY role ASC, created_at DESC
            `
            )
            .all() as ActiveAdminUserRow[];

        return success(rows.map(serializeActiveAdminUser), '获取经手人列表成功');
    } catch (e) {
        if (isAuthError(e)) return error(e.code, e.message);
        console.error('Get active admin users error:', e);
        return error(500, '获取经手人列表失败');
    }
}
