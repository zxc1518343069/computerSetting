import { getGames } from '@/app/services';
import { useRequest } from 'ahooks';

export const useGames = () => {
    const { data, loading, refresh } = useRequest(getGames, {
        cacheKey: 'pc-games-list',
        staleTime: 1000 * 60 * 5, // 5分钟内使用缓存
    });

    return {
        onlineGames: data?.online || [],
        singleGames: data?.single || [],
        loading,
        refresh,
    };
};
