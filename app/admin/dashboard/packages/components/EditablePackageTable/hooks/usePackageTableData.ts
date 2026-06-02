import { useRequest } from 'ahooks';
import { fetchPricingConfigService, fetchProductsService } from '../../../services';

export const usePackageTableData = () => {
    // Parallel fetching of products and pricing config
    const { data: products = [], loading: productsLoading } = useRequest(fetchProductsService);
    const { data: pricingConfig, loading: pricingLoading } = useRequest(fetchPricingConfigService);

    return {
        products,
        pricingConfig,
        loading: productsLoading || pricingLoading,
    };
};
