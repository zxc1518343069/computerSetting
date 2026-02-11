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
        <div className="space-y-4 animate-fade-in px-1">
            {packages.map((pkg, index) => (
                <div
                    key={pkg.id}
                    className="transform transition-all duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <PackageCard
                        pkg={pkg}
                        onApply={() => onApplyPackage(pkg)}
                        pricingConfig={pricingConfig}
                    />
                </div>
            ))}
        </div>
    );
}
