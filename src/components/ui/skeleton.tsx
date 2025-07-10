import { cn } from "@/lib/utils";

function Skeleton({
  className,
  color = "bg-blue-100",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { color?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md", color, className)}
      {...props}
    />
  );
}

export { Skeleton };
