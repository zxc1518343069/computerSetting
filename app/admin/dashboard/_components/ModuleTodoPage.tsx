interface ModuleTodoPageProps {
    eyebrow: string;
    title: string;
    description: string;
    todoItems: string[];
}

export function ModuleTodoPage({ eyebrow, title, description, todoItems }: ModuleTodoPageProps) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-blue-200/20 dark:bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10 space-y-8">
                <header className="pt-8">
                    <div className="inline-flex items-center rounded-full border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-900/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-400 mb-5">
                        {eyebrow}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-3">
                        {title}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg max-w-3xl leading-relaxed">
                        {description}
                    </p>
                </header>

                <section className="bg-white/70 dark:bg-[#1f1f1f]/70 backdrop-blur-xl rounded-[2rem] border border-white dark:border-white/10 shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                                待实现事项
                            </h2>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                先保留页面入口，后续按规划逐步接入数据和交互。
                            </p>
                        </div>
                        <span className="rounded-full bg-gray-100 dark:bg-white/5 px-3 py-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                            TODO
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {todoItems.map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-black/20 p-4 flex items-start gap-3"
                            >
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-6">
                                    {item}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
