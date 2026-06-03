import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export type AdminRole = 'admin' | 'staff';

export interface CurrentAdminUser {
    id: number;
    username: string;
    role: AdminRole;
}

interface AdminUserRow {
    id: number;
    username: string;
    role: AdminRole;
    status: 'active' | 'disabled';
}

export class AuthError extends Error {
    constructor(
        public code: 401 | 403,
        message: string
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

const COOKIE_SECRET = process.env.AUTH_SECRET || 'computer-setting-local-auth-secret';

const createSignature = (payload: string) => {
    return crypto.createHmac('sha256', COOKIE_SECRET).update(payload).digest('hex');
};

const safeEqual = (left: string, right: string) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const signAdminCookie = (user: CurrentAdminUser) => {
    const payload = Buffer.from(
        JSON.stringify({ id: user.id, username: user.username, role: user.role })
    ).toString('base64url');
    return `${payload}.${createSignature(payload)}`;
};

export const parseAdminCookie = (value?: string): CurrentAdminUser | null => {
    if (!value) return null;

    const [payload, signature] = value.split('.');
    if (!payload || !signature || !safeEqual(signature, createSignature(payload))) return null;

    try {
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<
            CurrentAdminUser
        >;
        if (
            typeof parsed.id !== 'number' ||
            typeof parsed.username !== 'string' ||
            (parsed.role !== 'admin' && parsed.role !== 'staff')
        ) {
            return null;
        }

        return {
            id: parsed.id,
            username: parsed.username,
            role: parsed.role,
        };
    } catch {
        return null;
    }
};

export const getCurrentAdminUser = async (): Promise<CurrentAdminUser | null> => {
    const cookieStore = await cookies();
    const signedUser = parseAdminCookie(cookieStore.get('admin_session')?.value);
    if (!signedUser) return null;

    const db = getDb();
    const row = db
        .prepare('SELECT id, username, role, status FROM admin_users WHERE id = ?')
        .get(signedUser.id) as AdminUserRow | undefined;

    if (!row || row.status !== 'active') return null;

    return {
        id: row.id,
        username: row.username,
        role: row.role,
    };
};

export const requireAdminUser = async () => {
    const user = await getCurrentAdminUser();
    if (!user) {
        throw new AuthError(401, '请先登录');
    }
    return user;
};

export const requireSuperAdmin = async () => {
    const user = await requireAdminUser();
    if (user.role !== 'admin') {
        throw new AuthError(403, '无权访问账号管理');
    }
    return user;
};

export const isAuthError = (value: unknown): value is AuthError => value instanceof AuthError;

