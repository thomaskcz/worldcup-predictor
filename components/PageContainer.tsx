type PageContainerProps = {
    title: string;
    description?: string;
    children?: React.ReactNode;
    showFootballAccent?: boolean;
};

export function PageContainer({ title, description, children, showFootballAccent = false }: PageContainerProps) {
    return (
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
            <div className="flex items-start gap-3">
                {showFootballAccent && <span className="text-3xl animate-pulse">⚽</span>}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h1>

                    {description && (
                        <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-8">
                {children}
            </div>
        </div>
    );
}