import { success } from '@/lib/request/apiResponse';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = await cookies();

    // 清除 Cookie
    cookieStore.delete('admin_session');
    cookieStore.delete('is_admin');
    cookieStore.delete('admin_role');

    return success(null, '已退出登录');
}
