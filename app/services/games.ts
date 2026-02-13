import api from '@/lib/request/axios';
import { Game } from '@/const/types';

export interface GamesResponse {
    online: Game[];
    single: Game[];
}

/**
 * 获取游戏榜单数据
 */
export const getGames = (): Promise<GamesResponse> => {
    return api.get('/games');
};

/**
 * 预留：更新游戏信息 (未来管理端使用)
 */
export const updateGame = (id: string | number, data: Partial<Game>): Promise<void> => {
    return api.patch(`/games/${id}`, data);
};
