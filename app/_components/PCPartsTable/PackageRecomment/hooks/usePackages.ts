import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { Package } from '../types';

export function usePackages() {
    const [packages, setPackages] = useState<Package[]>([]);
    const { loading } = useRequest(getPackages, {
        onSuccess: (result) => {
            if (result.data) {
                setPackages(result.data);
            }
        },
    });

    return {
        packages,
        loading,
    };
}

function getPackages() {
    return axios.get<Package[]>('/packages');
}
