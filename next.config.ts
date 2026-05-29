import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    async redirects() {
        return [
            {
                source: '/admin/dashboard/config',
                destination: '/admin/dashboard/warehouse/products',
                permanent: false,
            },
            {
                source: '/admin/dashboard/pricing',
                destination: '/admin/dashboard/sales/pricing',
                permanent: false,
            },
            {
                source: '/admin/dashboard/packages',
                destination: '/admin/dashboard/sales/packages',
                permanent: false,
            },
            {
                source: '/admin/dashboard/import',
                destination: '/admin/dashboard/data/exchange',
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
