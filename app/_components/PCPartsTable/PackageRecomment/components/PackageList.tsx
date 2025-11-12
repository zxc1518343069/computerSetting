import { Package } from '../types';
import { EmptyState } from './EmptyState';
import { PackageCard } from './PackageCard';

interface PackageListProps {
    packages: Package[];
    onApplyPackage: (pkg: Package) => void;
}

export function PackageList({ packages, onApplyPackage }: PackageListProps) {
    if (packages.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-3 max-h-[500px] lg:max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onApply={() => onApplyPackage(pkg)} />
            ))}
        </div>
    );
}
