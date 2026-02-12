import { PricingConfig } from '@/const/types';
import { useRequest } from 'ahooks';

const fetchPricingConfig = async (): Promise<PricingConfig> => {
    const response = await fetch('/api/pricing');
    if (!response.ok) {
        throw new Error('Failed to fetch pricing config');
    }
    return await response.json();
};

export const usePricingConfig = () => {
    const { data, loading, error } = useRequest(fetchPricingConfig);
    return { config: data, loading, error };
};
