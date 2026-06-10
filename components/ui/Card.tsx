type CardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "festive" | "success" | "warning";
};

export function Card({ children, className = "", variant = "default" }: CardProps) {
  const baseClasses = "rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md";
  
  const variantClasses = {
    default: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    festive: "border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:border-orange-800 dark:from-orange-950/30 dark:to-zinc-900",
    success: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/30 dark:to-zinc-900",
    warning: "border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-800 dark:from-amber-950/30 dark:to-zinc-900",
  };

  return (
    <article className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </article>
  );
}
