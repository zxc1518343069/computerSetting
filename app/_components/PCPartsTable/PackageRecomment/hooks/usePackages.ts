import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
import { Package } from '../types';
import { useAuth } from '@/app/_components/AuthProvider';
import { MOCK_PACKAGES } from '@/const/mockData';

export function usePackages() {
    const { isLoggedIn } = useAuth();

    const { data: packages = isLoggedIn ? [] : MOCK_PACKAGES, loading } = useRequest<Package[], []>(
        getPackages,
        {
            ready: isLoggedIn, // 仅在登录时发起请求
        }
    );

    return {
        packages,
        loading: isLoggedIn ? loading : false,
    };
}

function getPackages(): Promise<Package[]> {
    return axios.get<Package[], Package[]>('/packages');
}
