import { PricingConfig } from '@/const/types';
import { Package } from '../types';
import { EmptyState } from './EmptyState';
import { PackageCard } from './PackageCard';

interface PackageListProps {
    packages: Package[];
    onApplyPackage: (pkg: Package) => void;
    pricingConfig?: PricingConfig;
}

export function PackageList({ packages, onApplyPackage, pricingConfig }: PackageListProps) {
    if (packages.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-3">
            {packages.map((pkg) => (
                <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onApply={() => onApplyPackage(pkg)}
                    pricingConfig={pricingConfig}
                />
            ))}
        </div>
    );
}