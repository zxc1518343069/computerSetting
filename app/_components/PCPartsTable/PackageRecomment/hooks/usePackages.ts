import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { Package } from '../types';

export function usePackages() {
    const [packages, setPackages] = useState<Package[]>([]);
    const { data, loading } = useRequest(getPackages, {
        onSuccess: (result) => {
            console.log('Fetched Packages:', result.data);
            if (result.data) {
                setPackages(result.data);
            }
        },
        onFinally: (props) => {
            console.log('Fetched fetching packages', props);
        },
    });
    console.log('data', data);
    return {
        packages,
        loading,
    };
}

function getPackages() {
    return axios.get<Package[]>('/packages');
}
