import { INITIAL_ONLINE_GAMES, INITIAL_SINGLE_GAMES } from '@/const/games';
import { Game } from '@/const/types';
import { success } from '@/lib/request/apiResponse';

export async function GET() {
    // 模拟后端返回，并注入 type 字段
    const online: Game[] = INITIAL_ONLINE_GAMES.map((g) => ({
        ...g,
        type: 'online',
    }));

    const single: Game[] = INITIAL_SINGLE_GAMES.map((g) => ({
        ...g,
        type: 'single',
    }));

    return success({
        online,
        single,
    });
}
