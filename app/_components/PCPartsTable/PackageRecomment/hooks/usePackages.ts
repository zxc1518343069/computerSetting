import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
// import { useState } from 'react'; // Remove useState import
import { Package } from '../types';

export function usePackages() {
    // const [packages, setPackages] = useState<Package[]>([]); // Remove this line
    const { data: packages = [], loading } = useRequest<Package[], []>(getPackages, {
        // Corrected generics for Result and Params
    });
    return {
        packages,
        loading,
    };
}

function getPackages(): Promise<Package[]> {
    return axios.get<Package[], Package[]>('/packages');
}
