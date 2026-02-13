import React from 'react';

export default function GameCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-sm flex flex-col animate-pulse">
            {/* Image Placeholder */}
            <div className="aspect-video w-full bg-slate-200 dark:bg-slate-800" />

            {/* Content Placeholder */}
            <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="mt-auto flex items-center justify-between">
                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                </div>
            </div>
        </div>
    );
}
