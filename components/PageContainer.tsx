type PageContainerProps = {
  title: string;
  description?: string;
};

export function PageContainer({ title, description }: PageContainerProps) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}
