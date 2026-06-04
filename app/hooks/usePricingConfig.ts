import { PricingConfig } from '@/const/types';
import api from '@/lib/request/axios';
import { useRequest } from 'ahooks';

const fetchPricingConfig = async (): Promise<PricingConfig> => {
    return api.get('/pricing');
};

export const usePricingConfig = () => {
    const { data, loading, error } = useRequest(fetchPricingConfig);
    return { config: data, loading, error };
};
