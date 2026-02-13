import { useRequest } from 'ahooks';
import { fetchPricingConfigService, fetchProductsService } from '../../../services';
import { useAuth } from '@/app/_components/AuthProvider';
import { MOCK_PRODUCTS } from '@/const/mockData';

export const usePackageTableData = () => {
    const { isLoggedIn } = useAuth();

    // Parallel fetching of products and pricing config
    const { data: products = isLoggedIn ? [] : MOCK_PRODUCTS, loading: productsLoading } =
        useRequest(fetchProductsService, {
            ready: isLoggedIn,
        });
    const { data: pricingConfig, loading: pricingLoading } = useRequest(fetchPricingConfigService, {
        ready: isLoggedIn,
    });

    return {
        products,
        pricingConfig,
        loading: isLoggedIn ? productsLoading || pricingLoading : false,
    };
};
