interface BadgeProps {
  type: "live" | "demo";
  className?: string;
}

export default function Badge({ type, className = "" }: BadgeProps) {
  if (type === "live") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        LIVE
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      DEMO
    </span>
  );
}
