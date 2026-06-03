import { getCurrentAdminUser } from '@/lib/auth/currentUser';
import { error, success } from '@/lib/request/apiResponse';

export async function GET() {
    try {
        const user = await getCurrentAdminUser();
        if (!user) return error(401, '请先登录');

        return success(user, '获取当前用户成功');
    } catch (e) {
        console.error('Get current user error:', e);
        return error(500, '获取当前用户失败');
    }
}

