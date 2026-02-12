import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

interface SearchBoxProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    resultCount: number;
}

export function SearchBox({ searchQuery, onSearchChange, resultCount }: SearchBoxProps) {
    return (
        <div className="relative group">
            <Input
                placeholder="搜索套餐..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                prefix={
                    <SearchOutlined className="text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                }
                allowClear
                className="rounded-xl bg-gray-100/80 dark:bg-[#1f1f1f]/80 border-transparent hover:bg-gray-100 dark:hover:bg-[#2a2a2a] focus:bg-white dark:focus:bg-[#141414] focus:shadow-sm focus:border-blue-200 dark:focus:border-blue-800 transition-all h-9 text-sm dark:text-gray-200 dark:placeholder:text-gray-600"
            />
            {searchQuery && resultCount > 0 && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md font-medium animate-fade-in">
                    {resultCount}
                </div>
            )}
        </div>
    );
}
