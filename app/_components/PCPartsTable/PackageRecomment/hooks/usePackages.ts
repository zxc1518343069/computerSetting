import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
import { Package } from '../types';

export function usePackages() {
    const { data: packages = [], loading } = useRequest<Package[], []>(getPackages);

    return {
        packages,
        loading,
    };
}

function getPackages(): Promise<Package[]> {
    return axios.get<Package[], Package[]>('/packages');
}
